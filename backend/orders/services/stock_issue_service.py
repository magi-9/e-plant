"""
Stock issue service - handles manual outbound stock operations.
"""

import logging

from django.db import transaction
from rest_framework.exceptions import ValidationError

from orders.models import BatchLot
from products.models import Product

logger = logging.getLogger(__name__)


class StockIssueService:
    @staticmethod
    def issue_stock(
        product: Product,
        quantity: int,
        issued_by=None,
        notes: str = "",
        variant_reference: str = "",
        batch_lot_id: int | None = None,
    ) -> Product:
        """Decrease stock and reconcile either a selected batch lot or FIFO lots."""
        if quantity <= 0:
            raise ValidationError("Quantity must be greater than zero.")

        variant_reference = variant_reference.strip() if variant_reference else ""

        with transaction.atomic():
            locked_product = Product.objects.select_for_update().get(pk=product.pk)

            if locked_product.stock_quantity < quantity:
                raise ValidationError(
                    {
                        "quantity": (
                            f"Not enough stock. Available: {locked_product.stock_quantity}, requested: {quantity}."
                        )
                    }
                )

            is_wildcard_variant = all(
                [
                    variant_reference,
                    isinstance(locked_product.parameters, dict),
                    locked_product.parameters.get("type") == "wildcard_group",
                ]
            )
            if is_wildcard_variant:
                options = locked_product.parameters.get("options", [])
                matched_variant = None
                for opt in options:
                    if opt.get("reference") == variant_reference:
                        matched_variant = opt
                        break

                if matched_variant is None:
                    raise ValidationError(
                        {
                            "variant_reference": "Variant reference is invalid for this product."
                        }
                    )

                variant_stock = matched_variant.get("stock_quantity") or 0
                if variant_stock < quantity:
                    raise ValidationError(
                        {
                            "quantity": (
                                f"Not enough variant stock. Available: {variant_stock}, requested: {quantity}."
                            )
                        }
                    )

                matched_variant["stock_quantity"] = variant_stock - quantity
                locked_product.parameters = {
                    **locked_product.parameters,
                    "options": options,
                }

            locked_product.stock_quantity -= quantity
            if batch_lot_id is not None:
                StockIssueService._decrement_selected_batch_lot(
                    locked_product, batch_lot_id, quantity
                )
            else:
                StockIssueService._decrement_batch_lots_fifo(locked_product, quantity)

            update_fields = ["stock_quantity"]
            if variant_reference:
                update_fields.append("parameters")
            locked_product.save(update_fields=update_fields)

        logger.info(
            "Stock issue: %s -%d by %s (variant=%s, notes=%s)",
            locked_product.name,
            quantity,
            getattr(issued_by, "id", None),
            variant_reference or "-",
            notes or "-",
        )

        return locked_product

    @staticmethod
    def _decrement_selected_batch_lot(
        product: Product, batch_lot_id: int, quantity: int
    ) -> None:
        try:
            lot = BatchLot.objects.select_for_update().get(
                pk=batch_lot_id, product=product
            )
        except BatchLot.DoesNotExist as exc:
            raise ValidationError(
                {"batch_lot_id": "Selected batch lot does not belong to this product."}
            ) from exc

        if lot.quantity < quantity:
            raise ValidationError(
                {
                    "quantity": (
                        f"Not enough stock in selected batch lot. "
                        f"Available: {lot.quantity}, requested: {quantity}."
                    )
                }
            )

        lot.quantity -= quantity
        lot.save(update_fields=["quantity"])

    @staticmethod
    def _decrement_batch_lots_fifo(product: Product, quantity: int) -> None:
        lots = list(
            BatchLot.objects.select_for_update()
            .filter(product=product, quantity__gt=0)
            .order_by("received_at", "id")
        )

        if not lots:
            raise ValidationError(
                {
                    "quantity": (
                        "Batch stock is inconsistent: no batch lots are available to decrease."
                    )
                }
            )

        remaining = quantity
        for lot in lots:
            if remaining <= 0:
                break
            take = min(lot.quantity, remaining)
            lot.quantity -= take
            lot.save(update_fields=["quantity"])
            remaining -= take

        if remaining > 0:
            raise ValidationError(
                {
                    "quantity": (
                        f"Batch stock is inconsistent: could not allocate {remaining} units to decrease."
                    )
                }
            )
