from rest_framework import serializers
from .models import Order, OrderItem
from products.models import Product
from decimal import Decimal
import uuid
from django.db import transaction
from django.core.mail import send_mail
from django.conf import settings


class OrderItemInputSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)


class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True, source='get_subtotal')

    class Meta:
        model = OrderItem
        fields = ('id', 'product', 'product_name', 'quantity', 'price_snapshot', 'subtotal')
        read_only_fields = ('id', 'product', 'price_snapshot')


class OrderCreateSerializer(serializers.ModelSerializer):
    items = OrderItemInputSerializer(many=True, write_only=True)

    class Meta:
        model = Order
        fields = (
            'customer_name',
            'email',
            'phone',
            'street',
            'city',
            'postal_code',
            'shipping_address',
            'is_company',
            'company_name',
            'ico',
            'dic',
            'payment_method',
            'notes',
            'items'
        )

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("Order must contain at least one item.")
        return value

    def create(self, validated_data):
        items_data = validated_data.pop('items')

        # Use atomic transaction to ensure all-or-nothing behavior
        with transaction.atomic():
            # Generate unique order number
            order_number = str(uuid.uuid4())[:8].upper()

            # Calculate total and validate products
            total_price = Decimal('0.00')
            items_to_create = []
            products_to_update = []

            for item_data in items_data:
                try:
                    # Use select_for_update to lock the row and prevent race conditions
                    product = Product.objects.select_for_update().get(id=item_data['product_id'])
                except Product.DoesNotExist:
                    raise serializers.ValidationError(f"Product with id {item_data['product_id']} does not exist.")

                quantity = item_data['quantity']

                # Validate stock
                if product.stock_quantity < quantity:
                    raise serializers.ValidationError(
                        f"Not enough stock for product '{product.name}'. Available: {product.stock_quantity}, Requested: {quantity}"
                    )

                # Use product's current price as snapshot
                price_snapshot = product.price
                subtotal = price_snapshot * quantity
                total_price += subtotal

                # Deduct stock
                product.stock_quantity -= quantity
                products_to_update.append(product)

                items_to_create.append({
                    'product': product,
                    'quantity': quantity,
                    'price_snapshot': price_snapshot
                })

            # Update all product stocks and check for low stock levels
            low_stock_products = []
            for product in products_to_update:
                if product.stock_quantity < product.low_stock_threshold and not product.low_stock_alert_sent:
                    product.low_stock_alert_sent = True
                    low_stock_products.append(product)
                product.save()

            # Send low stock emails
            if low_stock_products:
                self._send_low_stock_emails(low_stock_products)

            # Get user if authenticated
            request = self.context.get('request')
            user = request.user if request and request.user.is_authenticated else None

            # Set status based on payment method
            payment_method = validated_data.get('payment_method', 'bank_transfer')
            if payment_method == 'bank_transfer':
                status = 'awaiting_payment'
            else:
                status = 'new'

            # Create order
            order = Order.objects.create(
                user=user,
                order_number=order_number,
                status=status,
                total_price=total_price,
                **validated_data
            )

            # Create order items
            for item_data in items_to_create:
                OrderItem.objects.create(
                    order=order,
                    **item_data
                )

            # Send confirmation emails
            self._send_order_emails(order)

            return order

    def _send_order_emails(self, order):
        """Send confirmation emails to customer and warehouse"""
        # Customer email
        customer_subject = f'Potvrdenie objednávky #{order.order_number}'
        customer_message = self._build_customer_email(order)
        send_mail(
            customer_subject,
            customer_message,
            settings.DEFAULT_FROM_EMAIL,
            [order.email],
            fail_silently=True,
        )

        # Warehouse email
        warehouse_subject = f'Nová objednávka #{order.order_number}'
        warehouse_message = self._build_warehouse_email(order)
        send_mail(
            warehouse_subject,
            warehouse_message,
            settings.DEFAULT_FROM_EMAIL,
            [settings.WAREHOUSE_EMAIL],
            fail_silently=True,
        )

    def _build_customer_email(self, order):
        """Build customer confirmation email body"""
        items_text = "\n".join([
            f"  - {item.product.name} x {item.quantity} @ {item.price_snapshot}€ = {item.get_subtotal()}€"
            for item in order.items.all()
        ])

        payment_info = ""
        if order.payment_method == "bank_transfer":
            payment_info = f"""
PLATOBNÉ ÚDAJE:
Variabilný symbol: {order.order_number}
IBAN: SK00 0000 0000 0000 0000 0000
Suma: {order.total_price}€

Po prijatí platby vám zašleme potvrdenie a objednávku expedujeme.
"""

        company_info = ""
        if order.is_company:
            company_info = f"""
Fakturačné údaje:
{order.company_name}
IČO: {order.ico}
DIČ: {order.dic}
"""

        return f"""Dobrý deň {order.customer_name},

Ďakujeme za Vašu objednávku v DentalShop!

ČÍSLO OBJEDNÁVKY: {order.order_number}
Stav: {order.get_status_display()}

OBJEDNANÉ PRODUKTY:
{items_text}

CELKOVÁ SUMA: {order.total_price}€

DODACIA ADRESA:
{order.street}
{order.city}, {order.postal_code}
{company_info}
Telefón: {order.phone}
Email: {order.email}
{payment_info}
Poznámka: {order.notes or "Žiadna"}

V prípade otázok nás neváhajte kontaktovať.

S pozdravom,
Tím DentalShop
"""

    def _build_warehouse_email(self, order):
        """Build warehouse notification email body"""
        items_text = "\n".join([
            f"  - {item.product.name} (ID: {item.product.id}) x {item.quantity}"
            for item in order.items.all()
        ])

        company_info = ""
        if order.is_company:
            company_info = f"""
FIREMNÁ OBJEDNÁVKA:
{order.company_name}
IČO: {order.ico}
DIČ: {order.dic}
"""

        return f"""NOVÁ OBJEDNÁVKA #{order.order_number}

Zákazník: {order.customer_name}
Email: {order.email}
Telefón: {order.phone}
{company_info}
Dodacia adresa:
{order.street}
{order.city}, {order.postal_code}

PRODUKTY NA VYSKLADNENIE:
{items_text}

Celková suma: {order.total_price}€
Platba: {order.get_payment_method_display()}
Stav: {order.get_status_display()}

Poznámka zákazníka: {order.notes or "Žiadna"}
"""

    def _send_low_stock_emails(self, products):
        """Send notifications about low stock items to warehouse"""
        for product in products:
            subject = f'Upozornenie: Nízky stav zásob pre "{product.name}"'
            message = f"""Dobrý deň,

Týmto Vás automatický systém upozorňuje na nízky stav zásob produktu:

Produkt: {product.name} (ID: {product.id})
Aktuálny stav: {product.stock_quantity} ks
Nastavený limit: {product.low_stock_threshold} ks

Prosím, zvážte včasné doobjednanie tovaru.
Tento email nebol odoslaný opakovane, kým nedoplníte zásoby nad limit.

S pozdravom,
Automatický systém DentalShop
"""
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [settings.WAREHOUSE_EMAIL],
                fail_silently=True,
            )

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = (
            'id',
            'order_number',
            'customer_name',
            'email',
            'phone',
            'street',
            'city',
            'postal_code',
            'shipping_address',
            'is_company',
            'company_name',
            'ico',
            'dic',
            'payment_method',
            'status',
            'total_price',
            'notes',
            'items',
            'created_at',
            'updated_at'
        )
        read_only_fields = ('id', 'order_number', 'status', 'total_price', 'created_at', 'updated_at')
