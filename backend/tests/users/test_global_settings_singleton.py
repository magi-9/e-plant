from django.db import IntegrityError
from types import SimpleNamespace
import pytest

from users.models import GlobalSettings


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
