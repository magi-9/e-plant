from types import SimpleNamespace

import pytest
from django.db import IntegrityError

from users.models import DEFAULT_COMPANY_PROFILE, GlobalSettings


@pytest.mark.django_db
def test_get_settings_returns_singleton_instance(monkeypatch):
    singleton = SimpleNamespace(pk=1)

    def fake_get_or_create(*args, **kwargs):
        assert kwargs["pk"] == 1
        return singleton, True

    monkeypatch.setattr(GlobalSettings.objects, "get_or_create", fake_get_or_create)

    settings = GlobalSettings.objects.get_settings()

    assert settings.pk == 1


@pytest.mark.django_db
def test_get_settings_handles_integrityerror_race(monkeypatch):
    singleton = SimpleNamespace(pk=1)

    def raise_integrity_error(*args, **kwargs):
        raise IntegrityError("simulated concurrent create")

    def fake_get(*args, **kwargs):
        assert kwargs["pk"] == 1
        return singleton

    monkeypatch.setattr(GlobalSettings.objects, "get_or_create", raise_integrity_error)
    monkeypatch.setattr(GlobalSettings.objects, "get", fake_get)

    settings = GlobalSettings.objects.get_settings()

    assert settings.pk == 1


@pytest.mark.django_db
def test_global_settings_new_fields_defaults():
    from decimal import Decimal

    settings = GlobalSettings.load()
    assert settings.vat_rate == Decimal("23.00")
    assert settings.pickup_address == ""
    assert settings.opening_hours == ""


@pytest.mark.django_db
def test_global_settings_new_fields_persist():
    from decimal import Decimal

    settings = GlobalSettings.load()
    settings.vat_rate = Decimal("20.00")
    settings.pickup_address = "Hlavná 1, 811 01 Bratislava"
    settings.opening_hours = "Po–Pi 8:00–17:00"
    settings.save()

    reloaded = GlobalSettings.load()
    assert reloaded.vat_rate == Decimal("20.00")
    assert reloaded.pickup_address == "Hlavná 1, 811 01 Bratislava"
    assert reloaded.opening_hours == "Po–Pi 8:00–17:00"


@pytest.mark.django_db
def test_global_settings_autoseeds_company_profile_when_blank():
    GlobalSettings.objects.create(
        pk=1,
        warehouse_email="",
        company_name="",
        company_ico="",
        company_dic="",
        company_street="",
        company_city="",
        company_postal_code="",
        company_state="",
        company_phone="",
        company_email="",
        iban="",
        bank_name="",
        bank_swift="",
    )

    loaded = GlobalSettings.load()

    for field_name, expected_value in DEFAULT_COMPANY_PROFILE.items():
        assert getattr(loaded, field_name) == expected_value
