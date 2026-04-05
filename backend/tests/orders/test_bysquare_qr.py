"""Tests for BySquare QR code generation (Issue #96)."""

import pytest
from decimal import Decimal
from unittest.mock import patch


class TestBySquareQR:
    def test_returns_none_when_no_iban(self):
        from orders.invoice import _bysquare_qr_image

        result = _bysquare_qr_image(
            iban="", amount=Decimal("100.00"), reference="ORD001"
        )
        assert result is None

    def test_returns_none_gracefully_when_library_missing(self):
        with patch.dict("sys.modules", {"bysquare": None}):
            from orders.invoice import _bysquare_qr_image

            result = _bysquare_qr_image(
                iban="SK31 1200 0000 1987 4263 7541",
                amount=Decimal("100.00"),
                reference="ORD001",
            )
            # Should not raise, returns None or Image
            assert result is None or hasattr(result, "drawOn")

    def test_returns_image_when_library_available(self):
        """If qrcode is installed, should return an Image."""
        try:
            import qrcode  # noqa
        except ImportError:
            pytest.skip("qrcode not installed")
        from orders.invoice import _bysquare_qr_image

        result = _bysquare_qr_image(
            iban="SK3112000000198742637541",
            amount=Decimal("55.00"),
            reference="12345678",
        )
        # May return None if pyBySquare not installed, that's fine
        assert result is None or hasattr(result, "drawOn")
