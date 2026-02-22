from django.test import TestCase
from django.core import mail
from decimal import Decimal
from products.models import Product
from orders.serializers import OrderCreateSerializer


class EmailContentTest(TestCase):
    def setUp(self):
        self.product = Product.objects.create(
            name="Test Product",
            price=Decimal("10.00"),
            stock_quantity=10,
            low_stock_threshold=5,
            description="Test Description",
        )
        self.order_data = {
            "customer_name": "John Doe",
            "email": "john@example.com",
            "phone": "+1234567890",
            "street": "123 Main St",
            "city": "Test City",
            "postal_code": "12345",
            "shipping_address": "123 Main St, Test City, 12345",
            "is_company": False,
            "payment_method": "bank_transfer",
            "items": [{"product_id": self.product.id, "quantity": 2}],
        }

    def test_order_creation_emails(self):
        serializer = OrderCreateSerializer(data=self.order_data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        order = serializer.save()

        # Check that two emails were sent (customer and warehouse)
        self.assertEqual(len(mail.outbox), 2)

        customer_email = mail.outbox[0]
        warehouse_email = mail.outbox[1]

        self.assertEqual(customer_email.to, ["john@example.com"])
        self.assertIn("Test Product x 2 @ 10.00€ = 20.00€", customer_email.body)
        self.assertIn("Dobrý deň John Doe,", customer_email.body)
        self.assertIn("Variabilný symbol: " + order.order_number, customer_email.body)

        self.assertEqual(
            warehouse_email.to, ["warehouse@dentalshop.sk"]
        )  # Assuming default setting
        self.assertIn("NOVÁ OBJEDNÁVKA #" + order.order_number, warehouse_email.body)
        self.assertIn(
            "Test Product (ID: " + str(self.product.id) + ") x 2", warehouse_email.body
        )

    def test_low_stock_email(self):
        # Update product to trigger low stock
        self.product.stock_quantity = 6  # Buying 2 will reduce to 4, which is < 5
        self.product.save()

        serializer = OrderCreateSerializer(data=self.order_data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()

        # Should send 3 emails: Low stock, Customer, Warehouse
        self.assertEqual(len(mail.outbox), 3)

        # Check Low Stock Email (sent first)
        low_stock_email = mail.outbox[0]
        self.assertIn(
            'Upozornenie: Nízky stav zásob pre "Test Product"', low_stock_email.subject
        )
        self.assertIn(
            "Produkt: Test Product (ID: " + str(self.product.id) + ")",
            low_stock_email.body,
        )
        self.assertIn("Aktuálny stav: 4 ks", low_stock_email.body)
