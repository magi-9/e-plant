"""
PDF invoice generator using ReportLab.
- Proper UTF-8 / Unicode support via DejaVu TTF fonts (falls back to Helvetica).
- SEPA EPC payment QR code for bank-transfer orders (requires qrcode[pil]).
- Clean two/three-column layout.

Usage:
    pdf_bytes = generate_invoice_pdf(order, global_settings)
"""

import os
from datetime import timedelta
from decimal import Decimal
from functools import partial
from io import BytesIO
from xml.sax.saxutils import escape as esc

from users.models import DEFAULT_COMPANY_PROFILE

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    HRFlowable,
    Image,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# ── Unicode font registration ─────────────────────────────────────────────────
_FONT_SEARCH_PATHS = [
    "/usr/share/fonts/truetype/dejavu",  # Debian/Ubuntu
    "/usr/share/fonts/dejavu",  # Fedora/RHEL
    "/usr/share/fonts/TTF",  # Arch
    "/Library/Fonts",  # macOS
]


def _find_font(filename):
    for base in _FONT_SEARCH_PATHS:
        path = os.path.join(base, filename)
        if os.path.exists(path):
            return path
    return None


def _register_fonts():
    regular = _find_font("DejaVuSans.ttf")
    bold = _find_font("DejaVuSans-Bold.ttf")
    if regular and bold:
        try:
            pdfmetrics.registerFont(TTFont("Uni", regular))
            pdfmetrics.registerFont(TTFont("Uni-Bold", bold))
            return "Uni", "Uni-Bold"
        except Exception:
            pass
    return "Helvetica", "Helvetica-Bold"


_FONT, _FONT_BOLD = _register_fonts()

# ── Style helper ─────────────────────────────────────────────────────────────
_GRAY = colors.HexColor("#94a3b8")
_INK2 = colors.HexColor("#45474c")
_BLUE = colors.HexColor("#2196f3")
_BLUE_D = colors.HexColor("#1565c0")
_BLUE_SOFT = colors.HexColor("#eaf4fe")
_BLUE_MID = colors.HexColor("#1976d2")
_MAROON = colors.HexColor("#a51b3f")
_OK = colors.HexColor("#1f9d55")
_OK_BG = colors.HexColor("#eafaf1")
_OK_BORDER = colors.HexColor("#a3d9b1")
_LIGHT = colors.HexColor("#f0f1f3")
_BORDER = colors.HexColor("#eef0f2")
_LINE2 = colors.HexColor("#e2e8f0")
_ROW_ALT = colors.HexColor("#F8FAFC")
_ROW_LINE = colors.HexColor("#eef0f2")


def _s(name, bold=False, size=9, color=None, align=TA_LEFT, **kw):
    return ParagraphStyle(
        name,
        fontName=_FONT_BOLD if bold else _FONT,
        fontSize=size,
        textColor=color if color is not None else colors.black,
        alignment=align,
        leading=size * 1.4,
        **kw,
    )


# ── Payment method labels (Slovak) ───────────────────────────────────────────
_PAYMENT_SK = {
    "bank_transfer": "Bankový prevod",
    "card": "Platobná karta",
}


def _project_root_path():
    """Return project root both for local checkout and dockerized backend."""
    here = os.path.abspath(__file__)
    backend_dir = os.path.dirname(os.path.dirname(here))
    if os.path.basename(backend_dir) == "backend":
        return os.path.dirname(backend_dir)
    return backend_dir


def _resolve_logo_path(shop_settings):
    """Resolve seller (Martin Ebringer) logo for invoice header."""
    logo = getattr(shop_settings, "logo", None)
    if logo:
        logo_path = getattr(logo, "path", "") or str(logo)
        if logo_path and os.path.exists(logo_path):
            return logo_path

    root = _project_root_path()
    candidates = [
        os.path.join(root, "backend", "assets", "seller-logo.png"),
        os.path.join(root, "assets", "seller-logo.png"),
        os.path.join(root, "frontend", "public", "uploads", "logo-clean.png"),
        os.path.join(root, "source", "logo_small.png"),
    ]
    for path in candidates:
        if os.path.exists(path):
            return path
    return None


def _resolve_das_logo_path():
    """Resolve DAS distributor logo for invoice footer."""
    root = _project_root_path()
    candidates = [
        os.path.join(root, "backend", "assets", "invoice-logo.png"),
        os.path.join(root, "assets", "invoice-logo.png"),
        os.path.join(root, "frontend", "public", "dynamicabutment-logo.png"),
        os.path.join(root, "frontend", "src", "assets", "dynamicabutment-logo.png"),
    ]
    for path in candidates:
        if os.path.exists(path):
            return path
    return None


def _logo_image(shop_settings, max_width_mm=44, max_height_mm=16):
    """Return proportionally sized logo image for ReportLab, or None."""
    logo_path = _resolve_logo_path(shop_settings)
    if not logo_path:
        return None
    try:
        img_reader = ImageReader(logo_path)
        img_w, img_h = img_reader.getSize()
        if not img_w or not img_h:
            return None
        max_w = max_width_mm * mm
        max_h = max_height_mm * mm
        scale = min(max_w / float(img_w), max_h / float(img_h))
        return Image(logo_path, width=img_w * scale, height=img_h * scale)
    except Exception:
        return None


# ── SEPA EPC QR code ─────────────────────────────────────────────────────────
def _sepa_qr_image(iban, bic, name, amount, reference, size_mm=38):
    """Return a ReportLab Image of a SEPA EPC QR code, or None on failure."""
    if not iban:
        return None
    try:
        import qrcode  # noqa: PLC0415
    except ImportError:
        return None
    try:
        payload = "\n".join(
            [
                "BCD",
                "002",
                "1",  # encoding: UTF-8
                "SCT",
                (bic or "").strip(),
                (name or "")[:70].strip(),
                iban.replace(" ", "").upper(),
                f"EUR{float(amount):.2f}",
                "",
                (reference or "")[:35],
                "",
            ]
        )
        qr = qrcode.QRCode(
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=5,
            border=1,
        )
        qr.add_data(payload)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buf = BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)
        sz = size_mm * mm
        return Image(buf, width=sz, height=sz)
    except Exception:
        return None


# ── VAT rates (SK / CZ) ───────────────────────────────────────────────────────
VAT_RATES = {
    "SK": Decimal("0.23"),
    "CZ": Decimal("0.21"),
}


def _vat_percent_to_rate(vat_percent) -> Decimal:
    rate = Decimal(str(vat_percent or "0"))
    if rate > 1:
        rate = rate / Decimal("100")
    return rate


def _split_gross_vat(gross_amount, vat_percent) -> tuple[Decimal, Decimal]:
    gross = Decimal(str(gross_amount))
    rate = _vat_percent_to_rate(vat_percent)
    if rate == 0:
        return gross.quantize(Decimal("0.01")), Decimal("0.00")
    net = (gross / (Decimal("1.00") + rate)).quantize(Decimal("0.01"))
    return net, (gross - net).quantize(Decimal("0.01"))


# ── Skonto helpers ────────────────────────────────────────────────────────────
def skonto_amount(total) -> Decimal:
    """Return total after 2% early-payment discount."""
    return (Decimal(str(total)) * Decimal("0.98")).quantize(Decimal("0.01"))


def skonto_date(invoice_date):
    """Return skonto due date = invoice_date + 3 calendar days."""
    return invoice_date + timedelta(days=3)


# Keep private aliases for backwards compatibility within this module.
_skonto_amount = skonto_amount
_skonto_date = skonto_date


# ── BySquare (Slovak Pay by Square) QR code ──────────────────────────────────
def _bysquare_qr_image(
    iban: str, amount: Decimal, reference: str, currency: str = "EUR", size_mm: int = 38
):
    """
    Return a ReportLab Image of a Pay by Square QR code, or None on failure.

    Returns None (no QR) if pyBySquare or qrcode is not installed, or if
    generation fails — callers should degrade layout gracefully.
    """
    import logging
    import re

    if not iban:
        return None
    try:
        import qrcode  # noqa: PLC0415
    except ImportError:
        return None

    # Pay by Square variable symbol must be numeric (max 10 digits).
    vs = re.sub(r"\D", "", reference)[:10]
    # Use fixed-decimal string to avoid float rounding artifacts.
    amount_str = f"{Decimal(str(amount)):.2f}"

    try:
        import bysquare  # noqa: PLC0415

        data = bysquare.generate(
            iban=iban.replace(" ", ""),
            amount=amount_str,
            currency_code=currency,
            variable_symbol=vs,
        )
    except ImportError:
        # pyBySquare not installed — skip QR entirely rather than produce a
        # mislabelled "Pay by Square" placeholder.
        return None
    except Exception:
        logging.getLogger(__name__).warning(
            "BySquare QR generation failed for reference %s", reference, exc_info=True
        )
        return None
    try:
        qr = qrcode.QRCode(
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=5,
            border=1,
        )
        qr.add_data(data)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buf = BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)
        sz = size_mm * mm
        return Image(buf, width=sz, height=sz)
    except Exception:
        return None


def _draw_page_footer(canvas, doc, das_logo_path, seller_name, vat_id, pre_invoice):
    """Draw the distributor + legal footer band at the bottom of every page."""
    w, _ = A4
    left = 20 * mm
    right = w - 20 * mm
    # footer sits inside bottom margin (36mm reserved), centred vertically in lower 16mm
    hr_y = 18 * mm
    text_y = 11.5 * mm  # ~2px gap between HR and content

    canvas.saveState()

    # HR line
    canvas.setStrokeColor(_LINE2)
    canvas.setLineWidth(0.8)
    canvas.line(left, hr_y, right, hr_y)

    # Distributor logo + text (left)
    cursor_x = left
    if das_logo_path:
        try:
            ir = ImageReader(das_logo_path)
            iw, ih = ir.getSize()
            if iw and ih:
                target_h = 8 * mm
                logo_w = (iw / ih) * target_h
                canvas.drawImage(
                    das_logo_path,
                    cursor_x,
                    text_y - 1 * mm,
                    width=logo_w,
                    height=target_h,
                    preserveAspectRatio=True,
                    mask="auto",
                )
                cursor_x += logo_w + 3 * mm
        except Exception:
            pass

    canvas.setFont(_FONT_BOLD, 6.5)
    canvas.setFillColor(_INK2)
    canvas.drawString(cursor_x, text_y + 5 * mm, "EXKLUZÍVNY DISTRIBÚTOR")
    canvas.setFont(_FONT, 7.5)
    canvas.setFillColor(_GRAY)
    canvas.drawString(
        cursor_x, text_y + 1 * mm, "Dynamic Abutment Solutions pre Slovensko"
    )

    # Legal text (right-aligned)
    if pre_invoice:
        legal_line1 = (
            "Toto nie je účtovný doklad. Predfaktúra nenahrádza daňový doklad."
        )
    else:
        legal_line1 = "Faktúra je daňovým dokladom v zmysle zákona o DPH."
    legal_line2 = f"{seller_name} · IČ DPH {vat_id or ''}"

    canvas.setFont(_FONT, 7.5)
    canvas.setFillColor(_GRAY)
    canvas.drawRightString(right, text_y + 5 * mm, legal_line1)
    canvas.drawRightString(right, text_y + 1 * mm, legal_line2)

    canvas.restoreState()


class _PreInvoiceDoc(SimpleDocTemplate):
    """SimpleDocTemplate that stamps a PREDFAKTÚRA overlay on top of every page."""

    def handle_pageEnd(self):
        c = self.canv
        c.saveState()
        c.setFont(_FONT_BOLD, 80)
        c.setFillColor(colors.Color(0.647, 0.106, 0.247, alpha=0.09))
        w, h = A4
        c.translate(w / 2, h / 2)
        c.rotate(-30)
        c.drawCentredString(0, 0, "PREDFAKTÚRA")
        c.restoreState()
        super().handle_pageEnd()


# ── Main generator ────────────────────────────────────────────────────────────
def generate_invoice_pdf(order, shop_settings, pre_invoice: bool = False) -> bytes:
    """Return raw PDF bytes for *order* using *shop_settings* as the seller.

    pre_invoice=True renders a pre-invoice (no accounting document) with a
    watermark overlay and a disclaimer footer instead of a tax document.
    """
    buffer = BytesIO()
    doc_class = _PreInvoiceDoc if pre_invoice else SimpleDocTemplate
    doc = doc_class(
        buffer,
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=36 * mm,
    )

    # Styles
    s_label = _s("label", size=8, color=_GRAY)
    s_label_center = _s("label_center", size=8, color=_GRAY, align=TA_CENTER)
    s_r_bold = _s("r_bold", bold=True, size=9, align=TA_RIGHT)
    accent_color = _MAROON if pre_invoice else _BLUE
    s_title = _s("title", bold=True, size=22, color=accent_color)
    s_kicker = _s("kicker", bold=True, size=7.5, color=accent_color, spaceAfter=3)
    s_subtitle = _s("subtitle", bold=True, size=10, color=accent_color)
    s_total_r = _s("total_r", bold=True, size=12, align=TA_RIGHT)

    seller_name = shop_settings.company_name or DEFAULT_COMPANY_PROFILE["company_name"]
    story = []

    # ── HEADER: logo + seller (left) + invoice meta (right) ──────────────
    seller_cell = []
    logo_img = _logo_image(shop_settings)
    if logo_img:
        seller_cell.append(logo_img)
        seller_cell.append(Spacer(1, 3 * mm))

    seller_cell.append(Paragraph(esc(seller_name), _s("sn", bold=True, size=13)))
    city_line = " ".join(
        filter(
            None,
            [
                shop_settings.company_postal_code,
                shop_settings.company_city,
                shop_settings.company_state,
            ],
        )
    )
    addr_parts = list(filter(None, [shop_settings.company_street, city_line.strip()]))
    if addr_parts:
        seller_cell.append(
            Paragraph(", ".join(addr_parts), _s("s_addr", size=9, color=_INK2))
        )
    contact_parts = []
    if shop_settings.company_phone:
        contact_parts.append(f"Tel.: {esc(shop_settings.company_phone)}")
    if shop_settings.company_email:
        contact_parts.append(f"Email: {esc(shop_settings.company_email)}")
    if contact_parts:
        seller_cell.append(
            Paragraph(" · ".join(contact_parts), _s("s_contact", size=9, color=_INK2))
        )
    reg_parts = []
    if shop_settings.company_ico:
        reg_parts.append(f"IČO: <b>{esc(shop_settings.company_ico)}</b>")
    if shop_settings.company_dic:
        reg_parts.append(f"DIČ: <b>{esc(shop_settings.company_dic)}</b>")
    if shop_settings.company_vat_id:
        reg_parts.append(f"IČ DPH: <b>{esc(shop_settings.company_vat_id)}</b>")
    if reg_parts:
        seller_cell.append(Spacer(1, 2 * mm))
        seller_cell.append(
            Paragraph(" · ".join(reg_parts), _s("s_reg", size=8.5, color=_INK2))
        )

    created_date = order.created_at.strftime("%d.%m.%Y")
    if pre_invoice:
        doc_title = "PREDFAKTÚRA"
        tax_note = "Nie je daňovým dokladom"
    else:
        doc_title = "FAKTÚRA"
        tax_note = ""

    s_doc_no = _s("mn", bold=True, size=10, align=TA_RIGHT)
    meta_rows = [
        [
            Paragraph("Číslo", s_label),
            Paragraph(f"<b>{esc(order.order_number)}</b>", s_doc_no),
        ],
        [Paragraph("Dátum vystavenia", s_label), Paragraph(created_date, s_r_bold)],
        [Paragraph("Dátum dodania", s_label), Paragraph(created_date, s_r_bold)],
    ]
    meta_tbl = Table(meta_rows, colWidths=[40 * mm, 30 * mm])
    meta_tbl.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )

    meta_cell = [
        Paragraph(doc_title, s_title),
    ]
    if tax_note:
        meta_cell.append(
            Paragraph(tax_note, _s("tn", bold=True, size=8.5, color=_MAROON))
        )
    meta_cell.append(Spacer(1, 4 * mm))
    meta_cell.append(meta_tbl)

    header_table = Table(
        [[seller_cell, meta_cell]],
        colWidths=[100 * mm, 70 * mm],
        style=TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        ),
    )
    story.append(header_table)
    story.append(Spacer(1, 5 * mm))
    story.append(
        HRFlowable(width="100%", thickness=2, color=accent_color, spaceAfter=5 * mm)
    )

    # ── BUYER (left) + PAYMENT CARD with QR (right) ──────────────────────
    buyer_cell = [Paragraph("ODBERATEĽ", s_kicker), Spacer(1, 2 * mm)]
    if order.is_company and order.company_name:
        buyer_cell.append(
            Paragraph(esc(order.company_name), _s("bn", bold=True, size=12))
        )
        buyer_cell.append(
            Paragraph(esc(order.customer_name), _s("bsub", bold=True, size=9))
        )
    else:
        buyer_cell.append(
            Paragraph(esc(order.customer_name), _s("bn", bold=True, size=12))
        )
    if order.street:
        buyer_cell.append(Paragraph(esc(order.street), _s("ba", size=9, color=_INK2)))
    addr = " ".join(filter(None, [order.postal_code, order.city]))
    if addr.strip():
        buyer_cell.append(Paragraph(esc(addr), _s("ba2", size=9, color=_INK2)))
    if order.is_company:
        ico_parts = []
        if order.ico:
            ico_parts.append(f"IČO: {esc(order.ico)}")
        if order.dic:
            ico_parts.append(f"DIČ: {esc(order.dic)}")
        if order.dic_dph:
            ico_parts.append(f"IČ DPH: {esc(order.dic_dph)}")
        if ico_parts:
            buyer_cell.append(Spacer(1, 2 * mm))
            buyer_cell.append(
                Paragraph(" · ".join(ico_parts), _s("breg", size=8.5, color=_INK2))
            )
    contact_buyer = []
    if order.email:
        contact_buyer.append(f"Email: {esc(order.email)}")
    if order.phone:
        contact_buyer.append(f"Tel.: {esc(order.phone)}")
    if contact_buyer:
        buyer_cell.append(
            Paragraph(" · ".join(contact_buyer), _s("bcon", size=8.5, color=_INK2))
        )

    # Build payment card rows
    payment_label = _PAYMENT_SK.get(
        order.payment_method, order.get_payment_method_display()
    )
    pay_rows_data = [["Spôsob", esc(payment_label)]]
    if order.payment_method == "bank_transfer":
        if shop_settings.iban:
            pay_rows_data.append(["IBAN", f"<b>{esc(shop_settings.iban)}</b>"])
        if shop_settings.bank_name:
            pay_rows_data.append(["Banka", esc(shop_settings.bank_name)])
        if shop_settings.bank_swift:
            pay_rows_data.append(["SWIFT", esc(shop_settings.bank_swift)])
        pay_rows_data.append(["Var. symbol", f"<b>{esc(order.order_number)}</b>"])

    s_pay_k = _s("pay_k", size=8, color=_GRAY)
    s_pay_v = _s("pay_v", bold=True, size=8.5, align=TA_RIGHT)

    # billing column is 85mm, padding 6mm each side → 73mm inner usable
    _PAY_INNER_W = 73 * mm
    _QR_SIZE_MM = 24

    iban_for_qr = shop_settings.iban if order.payment_method == "bank_transfer" else ""
    bysquare_qr = (
        _bysquare_qr_image(
            iban=iban_for_qr,
            amount=order.total_price,
            reference=order.order_number,
            size_mm=_QR_SIZE_MM,
        )
        if iban_for_qr
        else None
    )
    # fall back to SEPA QR if bysquare library not installed
    active_qr = bysquare_qr or (
        _sepa_qr_image(
            iban=iban_for_qr,
            bic=shop_settings.bank_swift,
            name=seller_name,
            amount=order.total_price,
            reference=order.order_number,
            size_mm=_QR_SIZE_MM,
        )
        if iban_for_qr
        else None
    )
    qr_label = "Pay by Square" if bysquare_qr else "SEPA QR"

    if active_qr:
        # pay-rows column width = inner - QR size - 4mm gap
        pay_rows_w = _PAY_INNER_W - _QR_SIZE_MM * mm - 4 * mm
        pay_tbl_rows = [
            [Paragraph(k, s_pay_k), Paragraph(v, s_pay_v)] for k, v in pay_rows_data
        ]
        pay_inner_tbl = Table(pay_tbl_rows, colWidths=[14 * mm, pay_rows_w - 14 * mm])
        pay_inner_tbl.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LINEBELOW", (0, 0), (-1, -2), 0.5, _LINE2),
                    ("TOPPADDING", (0, 0), (-1, -1), 3),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ]
            )
        )
        qr_stack = [
            Paragraph(qr_label, s_label_center),
            Spacer(1, 1 * mm),
            active_qr,
        ]
        pay_card_inner = Table(
            [[pay_inner_tbl, qr_stack]],
            colWidths=[pay_rows_w, _QR_SIZE_MM * mm + 4 * mm],
        )
        pay_card_inner.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                    ("TOPPADDING", (0, 0), (-1, -1), 0),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ]
            )
        )
    else:
        pay_tbl_rows = [
            [Paragraph(k, s_pay_k), Paragraph(v, s_pay_v)] for k, v in pay_rows_data
        ]
        pay_inner_tbl = Table(pay_tbl_rows, colWidths=[18 * mm, _PAY_INNER_W - 18 * mm])
        pay_inner_tbl.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LINEBELOW", (0, 0), (-1, -2), 0.5, _LINE2),
                    ("TOPPADDING", (0, 0), (-1, -1), 3),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ]
            )
        )
        pay_card_inner = pay_inner_tbl

    pay_cell = [
        Paragraph("PLATOBNÉ ÚDAJE", s_kicker),
        Spacer(1, 2 * mm),
        pay_card_inner,
    ]

    billing_tbl = Table(
        [[buyer_cell, pay_cell]],
        colWidths=[85 * mm, 85 * mm],
        style=TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BACKGROUND", (0, 0), (-1, -1), _LIGHT),
                ("BOX", (0, 0), (-1, -1), 0.8, _LINE2),
                ("LINEBEFORE", (1, 0), (1, 0), 0.8, _LINE2),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        ),
    )
    story.append(billing_tbl)
    story.append(Spacer(1, 4 * mm))

    # ── ITEMS TABLE ───────────────────────────────────────────────────────
    story.append(Paragraph("OBJEDNANÉ PRODUKTY", s_subtitle))
    story.append(Spacer(1, 2 * mm))

    items_qs = order.items.prefetch_related("batch_allocations__batch_lot").all()

    shipping_method = getattr(order, "shipping_method", "courier") or "courier"
    shipping_label = (
        "Doprava (osobný odber)" if shipping_method == "pickup" else "Doprava (kuriér)"
    )
    shipping_cost = Decimal(str(order.shipping_cost or "0"))
    shipping_net = shipping_cost
    shipping_vat = Decimal("0")

    total_net = shipping_net
    total_vat = shipping_vat

    # styles specific to items table
    s_th_dark = _s("th_dark", bold=True, size=7.5, color=_INK2)
    s_th_dark_r = _s("th_dark_r", bold=True, size=7.5, color=_INK2, align=TA_RIGHT)
    s_item_name = _s("iname", bold=True, size=10)
    s_item_meta = _s("imeta", size=8, color=_GRAY)
    s_vat_badge = _s("vbadge", bold=True, size=8, color=_BLUE_D, align=TA_RIGHT)
    s_free = _s("free", bold=True, size=9, color=_OK, align=TA_RIGHT)
    s_amt = _s("amt", bold=True, size=9, align=TA_RIGHT)
    s_qty = _s("qty", size=9, align=TA_RIGHT)
    s_price = _s("price", size=9, align=TA_RIGHT)

    def _desc_cell(name, product_ref=None, batch_str=None):
        parts = [Paragraph(esc(name), s_item_name)]
        meta_parts = []
        if product_ref:
            meta_parts.append(f"Č. produktu: <b>{esc(product_ref)}</b>")
        if batch_str:
            meta_parts.append(f"Šarža: <b>{esc(batch_str)}</b>")
        if meta_parts:
            parts.append(Paragraph(" · ".join(meta_parts), s_item_meta))
        return parts

    COL_W = [70 * mm, 14 * mm, 28 * mm, 18 * mm, 40 * mm]
    # col indices: 0=Popis 1=Množ 2=JedCena 3=SadzbaVAT 4=CenaDPH
    _VAT_COL = 3

    rows = [
        [
            Paragraph("Popis", s_th_dark),
            Paragraph("Množ.", s_th_dark_r),
            Paragraph("Jedn. cena bez DPH", s_th_dark_r),
            Paragraph("Sadzba DPH", s_th_dark_r),
            Paragraph("Cena s DPH", s_th_dark_r),
        ]
    ]

    # track per-row VAT badge flag (row 0 = header, skipped)
    _vat_badge_rows: list[int] = []

    def _build_item_row(item, batch_str=None):
        nonlocal total_net, total_vat
        net_subtotal = item.get_net_subtotal()
        vat_amount = item.get_vat_amount()
        gross_subtotal = item.get_gross_subtotal()
        total_net += net_subtotal
        total_vat += vat_amount
        vat_rate = item.vat_rate_snapshot.normalize()
        product_ref = getattr(item.product, "reference", None) or None
        net_unit = (net_subtotal / item.quantity).quantize(Decimal("0.01"))
        if item.is_free:
            price_cell = Paragraph("zadarmo", s_free)
            amt_cell = Paragraph("0,00 €", s_amt)
        else:
            price_cell = Paragraph(f"{net_unit:.2f} €", s_price)
            amt_cell = Paragraph(f"{gross_subtotal:.2f} €", s_amt)
        vat_str = f"{vat_rate:f} %"
        _vat_badge_rows.append(len(rows))
        return [
            _desc_cell(item.product.name, product_ref, batch_str),
            Paragraph(str(item.quantity), s_qty),
            price_cell,
            Paragraph(vat_str, s_vat_badge),
            amt_cell,
        ]

    for item in items_qs:
        batch_allocations = list(item.batch_allocations.all())
        batch_str = (
            ", ".join(
                f"{ba.batch_lot.batch_number} ({ba.quantity}×)"
                for ba in batch_allocations
            )
            or None
        )
        rows.append(_build_item_row(item, batch_str))

    # shipping row
    _vat_badge_rows.append(len(rows))
    rows.append(
        [
            _desc_cell(shipping_label),
            Paragraph("1", s_qty),
            Paragraph(f"{shipping_net:.2f} €", s_price),
            Paragraph("0 %", s_vat_badge),
            Paragraph(f"{shipping_cost:.2f} €", s_amt),
        ]
    )

    n_last = len(rows) - 1

    tbl_style_cmds = [
        # header: no background — thick bottom border + letter spacing via uppercase text
        ("LINEBELOW", (0, 0), (-1, 0), 2, colors.HexColor("#1a1c1e")),
        # body rows: light bottom separator
        ("LINEBELOW", (0, 1), (-1, n_last - 1), 0.5, _LINE2),
        # alignment
        ("ALIGN", (0, 0), (0, -1), "LEFT"),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        # padding
        ("TOPPADDING", (0, 0), (-1, 0), 4),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 7),
        ("TOPPADDING", (0, 1), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 7),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]
    # VAT badge: blue-tint cell background on each body VAT cell
    for r in _vat_badge_rows:
        tbl_style_cmds.append(("BACKGROUND", (_VAT_COL, r), (_VAT_COL, r), _BLUE_SOFT))
        tbl_style_cmds.append(("ROUNDEDCORNERS", [4, 4, 4, 4]))

    items_tbl = Table(rows, colWidths=COL_W, repeatRows=1)
    items_tbl.setStyle(TableStyle(tbl_style_cmds))
    story.append(items_tbl)
    story.append(Spacer(1, 4 * mm))

    # ── FOOTER: notes (left) + totals (right) ────────────────────────────
    customer_notes = (
        "\n\n".join(
            part
            for part in order.notes.split("\n\n")
            if not part.startswith("Varianty:")
        ).strip()
        if order.notes
        else ""
    )

    invoice_date = order.created_at.date()
    sk_date = _skonto_date(invoice_date)
    sk_amount = _skonto_amount(order.total_price)
    has_skonto = order.payment_method == "bank_transfer"

    # Notes/terms (left column)
    if pre_invoice:
        note_text = (
            f"Táto predfaktúra slúži ako podklad na úhradu. Tovar expedujeme "
            f"po pripísaní platby na účet. Uvádzajte prosím variabilný symbol "
            f"<b>{esc(order.order_number)}</b>."
        )
    else:
        note_text = (
            f"Ďakujeme za Vašu objednávku. Úhradu vykonajte prosím na uvedený "
            f"účet s variabilným symbolom <b>{esc(order.order_number)}</b>."
        )
    notes_cell = [
        Paragraph("POZNÁMKA", s_kicker),
        Spacer(1, 2 * mm),
        Paragraph(note_text, _s("note", size=9, color=_INK2)),
    ]
    if customer_notes:
        notes_cell.append(Spacer(1, 3 * mm))
        notes_cell.append(
            Paragraph(esc(customer_notes), _s("cnote", size=9, color=_INK2))
        )

    # Totals (right column)
    totals_rows = [
        [
            Paragraph("Základ dane", _s("tk", size=9, color=_INK2)),
            Paragraph(f"{total_net:.2f} €", s_total_r),
        ],
        [
            Paragraph("DPH", _s("tk2", size=9, color=_INK2)),
            Paragraph(f"{total_vat:.2f} €", s_total_r),
        ],
    ]
    if getattr(order, "discount_amount", Decimal("0.00")):
        totals_rows.append(
            [
                Paragraph(
                    f"Zľava {order.discount_percent:.2f} %",
                    _s("tk3", size=9, color=_INK2),
                ),
                Paragraph(f"−{order.discount_amount:.2f} €", s_total_r),
            ]
        )

    totals_tbl = Table(totals_rows, colWidths=[46 * mm, 40 * mm])
    totals_tbl.setStyle(
        TableStyle(
            [
                ("LINEBELOW", (0, 0), (-1, -1), 0.5, _LINE2),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )

    grand_tbl = Table(
        [
            [
                Paragraph(
                    "Celkom s DPH", _s("gk", bold=True, size=11, color=colors.white)
                ),
                Paragraph(
                    f"{order.total_price:.2f} €",
                    _s("gv", bold=True, size=13, color=colors.white, align=TA_RIGHT),
                ),
            ]
        ],
        colWidths=[46 * mm, 40 * mm],
    )
    grand_tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), accent_color),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("ROUNDEDCORNERS", [6, 6, 6, 6]),
            ]
        )
    )

    totals_col = [totals_tbl, Spacer(1, 3 * mm), grand_tbl]

    if has_skonto:
        skonto_tbl = Table(
            [
                [
                    Paragraph(
                        f"Pri úhrade do {sk_date.strftime('%d.%m.%Y')}<br/>"
                        f"<font size='8'>(−2 % skonto za včasnú platbu)</font>",
                        _s("sk_k", bold=True, size=9, color=_OK),
                    ),
                    Paragraph(
                        f"{sk_amount:.2f} €",
                        _s("sk_v", bold=True, size=12, color=_OK, align=TA_RIGHT),
                    ),
                ]
            ],
            colWidths=[46 * mm, 40 * mm],
        )
        skonto_tbl.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), _OK_BG),
                    ("BOX", (0, 0), (-1, -1), 0.8, _OK_BORDER),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("TOPPADDING", (0, 0), (-1, -1), 8),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ]
            )
        )
        totals_col.append(Spacer(1, 4 * mm))
        totals_col.append(skonto_tbl)

    foot_tbl = Table(
        [[notes_cell, totals_col]],
        colWidths=[90 * mm, 80 * mm],
    )
    foot_tbl.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    story.append(foot_tbl)

    das_logo_path = _resolve_das_logo_path()
    vat_id = shop_settings.company_vat_id or ""

    footer_cb = partial(
        _draw_page_footer,
        das_logo_path=das_logo_path,
        seller_name=seller_name,
        vat_id=vat_id,
        pre_invoice=pre_invoice,
    )
    doc.build(story, onFirstPage=footer_cb, onLaterPages=footer_cb)
    pdf = buffer.getvalue()
    buffer.close()
    return pdf
