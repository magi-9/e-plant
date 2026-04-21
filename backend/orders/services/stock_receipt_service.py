"""
Stock receipt service — handles incoming stock with batch lot tracking.
"""

import logging

from django.db import transaction
from rest_framework.exceptions import ValidationError

from orders.models import BatchLot, StockReceipt
from products.models import Product

logger = logging.getLogger(__name__)


class StockReceiptService:
    @staticmethod
    def receive_stock(
        product: Product,
        batch_number: str,
        quantity: int,
        received_by=None,
        notes: str = "",
        variant_reference: str = "",
    ) -> StockReceipt:
        """
        Record incoming stock for a product batch.

        - Creates BatchLot if it doesn't exist, or increments its quantity.
        - Increments product.stock_quantity.
        - For wildcard_group products with a variant_reference, also increments
          the matching variant's stock_quantity inside parameters.options.
        - Creates an immutable StockReceipt audit record.

        Returns the created StockReceipt.
        """
        batch_number = batch_number.strip() if batch_number else ""
        variant_reference = variant_reference.strip() if variant_reference else ""
        if not batch_number:
            raise ValidationError("Batch number must not be empty.")
        if quantity <= 0:
            raise ValidationError("Quantity must be greater than zero.")

        with transaction.atomic():
            locked_product = Product.objects.select_for_update().get(pk=product.pk)

            lot, created = BatchLot.objects.get_or_create(
                product=locked_product,
                batch_number=batch_number,
                defaults={"quantity": 0},
            )
            lot.quantity += quantity
            lot.save(update_fields=["quantity"])

            locked_product.stock_quantity += quantity

            # Update variant-level stock inside parameters.options when applicable
            is_wildcard_variant = all(
                [
                    variant_reference,
                    isinstance(locked_product.parameters, dict),
                    locked_product.parameters.get("type") == "wildcard_group",
                ]
            )
            if is_wildcard_variant:
                options = locked_product.parameters.get("options", [])
                matched_variant = False
                for opt in options:
                    if opt.get("reference") == variant_reference:
                        opt["stock_quantity"] = (
                            opt.get("stock_quantity") or 0
                        ) + quantity
                        matched_variant = True
                        break

                if not matched_variant:
                    raise ValidationError(
                        {
                            "variant_reference": "Variant reference is invalid for this product."
                        }
                    )

                locked_product.parameters = {
                    **locked_product.parameters,
                    "options": options,
                }
                locked_product.save(update_fields=["stock_quantity", "parameters"])
            else:
                locked_product.save(update_fields=["stock_quantity"])

            receipt = StockReceipt.objects.create(
                product=locked_product,
                batch_lot=lot,
                batch_number=batch_number,  # already stripped above
                quantity=quantity,
                received_by=received_by,
                notes=notes,
            )

        action = "created" if created else "updated"
        logger.info(
            "Stock receipt: %s batch %s — %s ×%d (lot %s)",
            locked_product.name,
            batch_number,
            action,
            quantity,
            lot.pk,
        )
        return receipt
