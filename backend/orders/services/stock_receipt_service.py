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
    ) -> StockReceipt:
        """
        Record incoming stock for a product batch.

        - Creates BatchLot if it doesn't exist, or increments its quantity.
        - Increments product.stock_quantity.
        - Creates an immutable StockReceipt audit record.

        Returns the created StockReceipt.
        """
        if not batch_number or not batch_number.strip():
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
            locked_product.save(update_fields=["stock_quantity"])

            receipt = StockReceipt.objects.create(
                product=locked_product,
                batch_lot=lot,
                batch_number=batch_number,
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
