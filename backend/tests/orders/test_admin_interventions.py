import pytest
from decimal import Decimal
from django.core import mail
from django.urls import reverse
from rest_framework import status

from orders.models import Order


@pytest.mark.django_db(transaction=True)
def test_admin_delete_order_restores_stock_and_sends_email(
    api_client, user_factory, product_factory
):
    admin_user = user_factory(is_staff=True, is_superuser=True)
    customer = user_factory()
    product = product_factory(price=Decimal("100.00"), stock_quantity=10)

    api_client.force_authenticate(user=customer)
    create_response = api_client.post(
        reverse("order_create"),
        {
            "customer_name": "John Doe",
            "email": "john@example.com",
            "phone": "+421900123456",
            "street": "Test Street 123",
            "city": "Bratislava",
            "postal_code": "811 01",
            "is_company": False,
            "payment_method": "card",
            "items": [{"product_id": product.id, "quantity": 2}],
        },
        format="json",
    )
    assert create_response.status_code == status.HTTP_201_CREATED
    order_id = create_response.data["id"]

    product.refresh_from_db()
    assert product.stock_quantity == 8

    mail.outbox.clear()
    api_client.force_authenticate(user=admin_user)
    delete_response = api_client.delete(
        reverse("admin_order_intervention_delete", kwargs={"pk": order_id}),
        {"reason": "Duplicitna objednavka v systeme"},
        format="json",
    )

    assert delete_response.status_code == status.HTTP_204_NO_CONTENT
    assert not Order.objects.filter(id=order_id).exists()

    product.refresh_from_db()
    assert product.stock_quantity == 10

    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == ["john@example.com"]
    assert "zru" in mail.outbox[0].subject.lower()


@pytest.mark.django_db(transaction=True)
def test_admin_update_order_rebalances_stock_and_sends_email(
    api_client, user_factory, product_factory
):
    admin_user = user_factory(is_staff=True, is_superuser=True)
    customer = user_factory()
    product_a = product_factory(price=Decimal("100.00"), stock_quantity=10)
    product_b = product_factory(price=Decimal("50.00"), stock_quantity=10)

    api_client.force_authenticate(user=customer)
    create_response = api_client.post(
        reverse("order_create"),
        {
            "customer_name": "John Doe",
            "email": "john@example.com",
            "phone": "+421900123456",
            "street": "Test Street 123",
            "city": "Bratislava",
            "postal_code": "811 01",
            "country": "SK",
            "is_company": False,
            "payment_method": "card",
            "items": [{"product_id": product_a.id, "quantity": 2}],
        },
        format="json",
    )
    assert create_response.status_code == status.HTTP_201_CREATED
    order_id = create_response.data["id"]

    product_a.refresh_from_db()
    product_b.refresh_from_db()
    assert product_a.stock_quantity == 8
    assert product_b.stock_quantity == 10

    mail.outbox.clear()
    api_client.force_authenticate(user=admin_user)
    patch_response = api_client.patch(
        reverse("admin_order_intervention_update", kwargs={"pk": order_id}),
        {
            "reason": "Zakaznik upravil obsah objednavky",
            "status": "paid",
            "notes": "Admin intervention",
            "customer_name": "John Doe",
            "email": "john@example.com",
            "phone": "+421900123456",
            "street": "Test Street 123",
            "city": "Bratislava",
            "postal_code": "81101",
            "country": "SK",
            "is_company": False,
            "company_name": "",
            "ico": "",
            "dic": "",
            "dic_dph": "",
            "is_vat_payer": False,
            "payment_method": "card",
            "items": [
                {"product_id": product_a.id, "quantity": 1},
                {"product_id": product_b.id, "quantity": 3},
            ],
        },
        format="json",
    )

    assert patch_response.status_code == status.HTTP_200_OK
    assert patch_response.data["status"] == "paid"
    assert len(patch_response.data["items"]) == 2

    product_a.refresh_from_db()
    product_b.refresh_from_db()
    assert product_a.stock_quantity == 9
    assert product_b.stock_quantity == 7

    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == ["john@example.com"]
    assert "aktualiz" in mail.outbox[0].subject.lower()


@pytest.mark.django_db
def test_admin_intervention_requires_reason(api_client, user_factory, product_factory):
    admin_user = user_factory(is_staff=True, is_superuser=True)
    customer = user_factory()
    product = product_factory(price=Decimal("100.00"), stock_quantity=10)

    api_client.force_authenticate(user=customer)
    create_response = api_client.post(
        reverse("order_create"),
        {
            "customer_name": "John Doe",
            "email": "john@example.com",
            "phone": "+421900123456",
            "street": "Test Street 123",
            "city": "Bratislava",
            "postal_code": "811 01",
            "is_company": False,
            "payment_method": "card",
            "items": [{"product_id": product.id, "quantity": 1}],
        },
        format="json",
    )
    order_id = create_response.data["id"]

    api_client.force_authenticate(user=admin_user)
    delete_response = api_client.delete(
        reverse("admin_order_intervention_delete", kwargs={"pk": order_id}),
        {"reason": "kratke"},
        format="json",
    )

    assert delete_response.status_code == status.HTTP_400_BAD_REQUEST
    assert "reason" in delete_response.data
