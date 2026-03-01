from decimal import Decimal

import pytest
from django.core import mail
from django.urls import reverse
from rest_framework import status

from orders.models import Order


@pytest.mark.django_db(transaction=True)
def test_complete_order_creation_flow(api_client, user_factory, product_factory):
    user = user_factory()
    product_1 = product_factory(price=Decimal("99.90"), stock_quantity=10)
    product_2 = product_factory(price=Decimal("50.00"), stock_quantity=5)

    api_client.force_authenticate(user=user)

    payload = {
        "customer_name": "Integration Customer",
        "email": "integration.customer@example.com",
        "phone": "+421900123456",
        "street": "Integration 1",
        "city": "Bratislava",
        "postal_code": "81101",
        "is_company": False,
        "payment_method": "bank_transfer",
        "items": [
            {"product_id": product_1.id, "quantity": 2},
            {"product_id": product_2.id, "quantity": 1},
        ],
    }

    response = api_client.post(reverse("order_create"), payload, format="json")

    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["status"] == "awaiting_payment"
    assert response.data["total_price"] == "249.80"
    assert len(response.data["order_number"]) == 8

    order = Order.objects.get(order_number=response.data["order_number"])
    assert order.user == user
    assert order.items.count() == 2

    product_1.refresh_from_db()
    product_2.refresh_from_db()
    assert product_1.stock_quantity == 8
    assert product_2.stock_quantity == 4

    assert len(mail.outbox) == 2
    recipients = {recipient for message in mail.outbox for recipient in message.to}
    assert "integration.customer@example.com" in recipients


@pytest.mark.django_db(transaction=True)
def test_payment_method_handling_sets_initial_status(api_client, product_factory):
    product = product_factory(price=Decimal("30.00"), stock_quantity=4)

    payload = {
        "customer_name": "Card Customer",
        "email": "card.customer@example.com",
        "phone": "+421900123000",
        "street": "Card 1",
        "city": "Kosice",
        "postal_code": "04001",
        "is_company": False,
        "payment_method": "card",
        "items": [{"product_id": product.id, "quantity": 1}],
    }

    response = api_client.post(reverse("order_create"), payload, format="json")

    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["status"] == "new"


@pytest.mark.django_db
def test_order_status_transitions_via_admin_update(
    api_client, user_factory, product_factory
):
    admin_user = user_factory(is_staff=True, is_superuser=True)
    customer = user_factory()
    product = product_factory(price=Decimal("10.00"), stock_quantity=5)

    api_client.force_authenticate(user=customer)
    create_response = api_client.post(
        reverse("order_create"),
        {
            "customer_name": "Status User",
            "email": "status@example.com",
            "phone": "+421900999999",
            "street": "Status 1",
            "city": "Nitra",
            "postal_code": "94901",
            "is_company": False,
            "payment_method": "bank_transfer",
            "items": [{"product_id": product.id, "quantity": 1}],
        },
        format="json",
    )
    assert create_response.status_code == status.HTTP_201_CREATED

    order = Order.objects.get(order_number=create_response.data["order_number"])

    api_client.force_authenticate(user=admin_user)
    paid_response = api_client.patch(
        reverse("admin_order_update", kwargs={"pk": order.id}),
        {"status": "paid"},
        format="json",
    )
    assert paid_response.status_code == status.HTTP_200_OK
    assert paid_response.data["status"] == "paid"

    shipped_response = api_client.patch(
        reverse("admin_order_update", kwargs={"pk": order.id}),
        {"status": "shipped"},
        format="json",
    )
    assert shipped_response.status_code == status.HTTP_200_OK
    assert shipped_response.data["status"] == "shipped"


@pytest.mark.django_db(transaction=True)
def test_error_scenarios_and_rollbacks_keep_data_consistent(
    api_client, user_factory, product_factory
):
    user = user_factory()
    in_stock = product_factory(price=Decimal("100.00"), stock_quantity=10)
    low_stock = product_factory(price=Decimal("50.00"), stock_quantity=1)

    api_client.force_authenticate(user=user)

    response = api_client.post(
        reverse("order_create"),
        {
            "customer_name": "Rollback User",
            "email": "rollback@example.com",
            "phone": "+421900111111",
            "street": "Rollback 1",
            "city": "Zilina",
            "postal_code": "01001",
            "is_company": False,
            "payment_method": "bank_transfer",
            "items": [
                {"product_id": in_stock.id, "quantity": 2},
                {"product_id": low_stock.id, "quantity": 5},
            ],
        },
        format="json",
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert Order.objects.count() == 0

    in_stock.refresh_from_db()
    low_stock.refresh_from_db()
    assert in_stock.stock_quantity == 10
    assert low_stock.stock_quantity == 1
    assert len(mail.outbox) == 0
