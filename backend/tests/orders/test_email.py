import pytest
from django.urls import reverse
from rest_framework import status
from django.core import mail
from decimal import Decimal


@pytest.mark.django_db
def test_customer_email_sent_after_order(api_client, user_factory, product_factory):
    """Test that customer receives email after order creation"""
    user = user_factory()
    product = product_factory(name="Test Product", price=Decimal("100.00"), stock_quantity=10)
    
    api_client.force_authenticate(user=user)
    
    order_data = {
        "customer_name": "John Doe",
        "email": "customer@example.com",
        "phone": "+421900123456",
        "street": "Test Street 123",
        "city": "Bratislava",
        "postal_code": "811 01",
        "is_company": False,
        "payment_method": "bank_transfer",
        "items": [
            {"product_id": product.id, "quantity": 2},
        ]
    }
    
    url = reverse("order_create")
    response = api_client.post(url, order_data, format="json")
    
    assert response.status_code == status.HTTP_201_CREATED
    
    # Check that one email was sent
    assert len(mail.outbox) == 2  # Customer + warehouse
    
    # Check customer email
    customer_email = mail.outbox[0]
    assert customer_email.to == ["customer@example.com"]
    assert "potvrdenie" in customer_email.subject.lower() or "objedn" in customer_email.subject.lower()
    assert response.data['order_number'] in customer_email.body


@pytest.mark.django_db
def test_warehouse_email_sent_after_order(api_client, user_factory, product_factory):
    """Test that warehouse receives email after order creation"""
    user = user_factory()
    product = product_factory(name="Dental Implant", price=Decimal("200.00"), stock_quantity=5)
    
    api_client.force_authenticate(user=user)
    
    order_data = {
        "customer_name": "Jane Smith",
        "email": "jane@example.com",
        "phone": "+421900123456",
        "street": "Main Street 456",
        "city": "Kosice",
        "postal_code": "040 01",
        "is_company": True,
        "company_name": "Dental Clinic s.r.o.",
        "ico": "12345678",
        "dic": "SK1234567890",
        "payment_method": "card",
        "items": [
            {"product_id": product.id, "quantity": 1},
        ]
    }
    
    url = reverse("order_create")
    response = api_client.post(url, order_data, format="json")
    
    assert response.status_code == status.HTTP_201_CREATED
    
    # Check that warehouse email was sent
    assert len(mail.outbox) == 2
    warehouse_email = mail.outbox[1]
    assert "warehouse@dentalshop.sk" in warehouse_email.to or "sklad" in warehouse_email.subject.lower()


@pytest.mark.django_db
def test_email_sent_regardless_of_payment_status(api_client, user_factory, product_factory):
    """Test that emails are sent even for awaiting_payment status"""
    user = user_factory()
    product = product_factory(price=Decimal("100.00"), stock_quantity=10)
    
    api_client.force_authenticate(user=user)
    
    order_data = {
        "customer_name": "Test User",
        "email": "test@example.com",
        "phone": "+421900123456",
        "street": "Test Street",
        "city": "Test City",
        "postal_code": "123 45",
        "is_company": False,
        "payment_method": "bank_transfer",  # Will create awaiting_payment status
        "items": [
            {"product_id": product.id, "quantity": 1},
        ]
    }
    
    url = reverse("order_create")
    response = api_client.post(url, order_data, format="json")
    
    assert response.status_code == status.HTTP_201_CREATED
    assert response.data['status'] == 'awaiting_payment'
    
    # Emails should be sent even for awaiting_payment
    assert len(mail.outbox) == 2
