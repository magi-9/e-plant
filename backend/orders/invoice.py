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
from io import BytesIO
from xml.sax.saxutils import escape as esc

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    HRFlowable,
    Image,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
    Paragraph,
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
_GRAY = colors.HexColor("#6B7280")
_BLUE = colors.HexColor("#2563EB")
_LIGHT = colors.HexColor("#F3F4F6")


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


# ── Skonto helpers ────────────────────────────────────────────────────────────
def _skonto_amount(total) -> Decimal:
    """Return total after 2% early-payment discount."""
    return (Decimal(str(total)) * Decimal("0.98")).quantize(Decimal("0.01"))


def _skonto_date(invoice_date):
    """Return skonto due date = invoice_date + 3 calendar days."""
    return invoice_date + timedelta(days=3)


# ── BySquare (Slovak Pay by Square) QR code ──────────────────────────────────
def _bysquare_qr_image(iban: str, amount: Decimal, reference: str, currency: str = "EUR", size_mm: int = 38):
    """
    Return a ReportLab Image of a Pay by Square QR code, or None on failure.

    Falls back gracefully if pyBySquare or qrcode is not installed.
    """
    if not iban:
        return None
    try:
        import qrcode  # noqa: PLC0415
    except ImportError:
        return None
    try:
        import bysquare  # noqa: PLC0415

        data = bysquare.generate(
            iban=iban.replace(" ", ""),
            amount=float(amount),
            currency_code=currency,
            variable_symbol=reference[:10].replace("/", ""),
        )
    except (ImportError, Exception):
        # pyBySquare not installed or generation failed — generate a simple QR
        # using the same data as SEPA but labelled as BySquare placeholder
        try:
            vs = reference[:10].replace("/", "")
            data = f"PAY:{iban.replace(' ', '')}|AM:{float(amount):.2f}|CC:{currency}|VS:{vs}"
        except Exception:
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


# ── Main generator ────────────────────────────────────────────────────────────
def generate_invoice_pdf(order, shop_settings) -> bytes:
    """Return raw PDF bytes for *order* using *shop_settings* as the seller."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )

    # Styles
    s_normal = _s("normal")
    s_bold = _s("bold", bold=True)
    s_label = _s("label", size=8, color=_GRAY)
    s_r = _s("r", align=TA_RIGHT)
    s_r_small = _s("r_small", size=8, align=TA_RIGHT)
    s_r_bold = _s("r_bold", bold=True, align=TA_RIGHT)
    s_title = _s("title", bold=True, size=22, color=_BLUE)
    s_th = _s("th", bold=True, size=9, color=colors.white)
    s_th_r = _s("th_r", bold=True, size=9, color=colors.white, align=TA_RIGHT)
    s_td_r = _s("td_r", align=TA_RIGHT)
    s_total_r = _s("total_r", bold=True, size=11, align=TA_RIGHT)

    seller_name = shop_settings.company_name or "E-Plant"
    story = []

    # ── HEADER: seller (left) + invoice meta (right) ─────────────────────
    seller_cell = [Paragraph(esc(seller_name), _s("sn", bold=True, size=14))]
    if shop_settings.company_street:
        seller_cell.append(Paragraph(esc(shop_settings.company_street), s_normal))
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
    if city_line.strip():
        seller_cell.append(Paragraph(esc(city_line), s_normal))
    if shop_settings.company_phone:
        seller_cell.append(
            Paragraph(f"Tel.: {esc(shop_settings.company_phone)}", s_normal)
        )
    if shop_settings.company_email:
        seller_cell.append(
            Paragraph(f"Email: {esc(shop_settings.company_email)}", s_normal)
        )
    if shop_settings.company_ico:
        seller_cell.append(
            Paragraph(f"IČO: {esc(shop_settings.company_ico)}", s_normal)
        )
    if shop_settings.company_dic:
        seller_cell.append(
            Paragraph(f"DIČ: {esc(shop_settings.company_dic)}", s_normal)
        )

    meta_cell = [
        Paragraph("FAKTÚRA", s_title),
        Spacer(1, 3 * mm),
        Paragraph(f"Číslo: <b>{esc(order.order_number)}</b>", s_r),
        Paragraph(f"Dátum: {order.created_at.strftime('%d.%m.%Y')}", s_r_small),
    ]

    story.append(
        Table(
            [[seller_cell, meta_cell]],
            colWidths=[100 * mm, 70 * mm],
            style=TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]),
        )
    )
    story.append(Spacer(1, 5 * mm))
    story.append(HRFlowable(width="100%", thickness=2, color=_BLUE))
    story.append(Spacer(1, 6 * mm))

    # ── BUYER (left) + PAYMENT (right, optional QR far right) ─────────────
    buyer_cell = [Paragraph("Odberateľ", s_label), Spacer(1, 1 * mm)]
    if order.is_company and order.company_name:
        buyer_cell.append(Paragraph(esc(order.company_name), s_bold))
        buyer_cell.append(Paragraph(esc(order.customer_name), s_normal))
    else:
        buyer_cell.append(Paragraph(esc(order.customer_name), s_bold))
    if order.street:
        buyer_cell.append(Paragraph(esc(order.street), s_normal))
    addr = " ".join(filter(None, [order.postal_code, order.city]))
    if addr.strip():
        buyer_cell.append(Paragraph(esc(addr), s_normal))
    if order.is_company:
        if order.ico:
            buyer_cell.append(Paragraph(f"IČO: {esc(order.ico)}", s_normal))
        if order.dic:
            buyer_cell.append(Paragraph(f"DIČ: {esc(order.dic)}", s_normal))
        if order.dic_dph:
            buyer_cell.append(Paragraph(f"IČ DPH: {esc(order.dic_dph)}", s_normal))
    buyer_cell.append(Paragraph(f"Email: {esc(order.email)}", s_normal))
    buyer_cell.append(Paragraph(f"Tel.: {esc(order.phone)}", s_normal))

    payment_label = _PAYMENT_SK.get(
        order.payment_method, order.get_payment_method_display()
    )
    pay_cell = [Paragraph("Spôsob úhrady", s_label), Spacer(1, 1 * mm)]
    pay_cell.append(Paragraph(esc(payment_label), s_bold))
    if order.payment_method == "bank_transfer":
        if shop_settings.iban:
            pay_cell.append(
                Paragraph(f"IBAN: <b>{esc(shop_settings.iban)}</b>", s_normal)
            )
        if shop_settings.bank_name:
            pay_cell.append(Paragraph(esc(shop_settings.bank_name), s_normal))
        if shop_settings.bank_swift:
            pay_cell.append(
                Paragraph(f"SWIFT: {esc(shop_settings.bank_swift)}", s_normal)
            )
        pay_cell.append(
            Paragraph(f"Var. symbol: <b>{esc(order.order_number)}</b>", s_normal)
        )

    iban_for_qr = shop_settings.iban if order.payment_method == "bank_transfer" else ""
    sepa_qr = _sepa_qr_image(
        iban=iban_for_qr,
        bic=shop_settings.bank_swift,
        name=seller_name,
        amount=order.total_price,
        reference=order.order_number,
        size_mm=36,
    )
    bysquare_qr = _bysquare_qr_image(
        iban=iban_for_qr,
        amount=order.total_price,
        reference=order.order_number,
        size_mm=36,
    ) if iban_for_qr else None

    tbl_style = TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ])

    if sepa_qr and bysquare_qr:
        sepa_cell = [Paragraph("SEPA QR", s_label), Spacer(1, 1 * mm), sepa_qr]
        bys_cell = [Paragraph("Pay by Square", s_label), Spacer(1, 1 * mm), bysquare_qr]
        billing_tbl = Table(
            [[buyer_cell, pay_cell, sepa_cell, bys_cell]],
            colWidths=[65 * mm, 38 * mm, 30 * mm, 37 * mm],
            style=tbl_style,
        )
    elif sepa_qr or bysquare_qr:
        active_qr = sepa_qr or bysquare_qr
        label = "SEPA QR" if sepa_qr else "Pay by Square"
        qr_cell = [Paragraph(label, s_label), Spacer(1, 1 * mm), active_qr]
        billing_tbl = Table(
            [[buyer_cell, pay_cell, qr_cell]],
            colWidths=[80 * mm, 48 * mm, 42 * mm],
            style=tbl_style,
        )
    else:
        billing_tbl = Table(
            [[buyer_cell, pay_cell]],
            colWidths=[100 * mm, 70 * mm],
            style=tbl_style,
        )
    story.append(billing_tbl)
    story.append(Spacer(1, 8 * mm))

    # ── ITEMS TABLE ───────────────────────────────────────────────────────
    items_qs = order.items.prefetch_related("batch_allocations__batch_lot").all()
    has_batches = any(item.batch_allocations.all() for item in items_qs)

    if has_batches:
        COL_W = [68 * mm, 22 * mm, 18 * mm, 32 * mm, 30 * mm]
        rows = [
            [
                Paragraph("Popis", s_th),
                Paragraph("Šarža", s_th),
                Paragraph("Množ.", s_th_r),
                Paragraph("Cena / ks", s_th_r),
                Paragraph("Spolu", s_th_r),
            ]
        ]
        for item in items_qs:
            batch_str = (
                ", ".join(
                    ba.batch_lot.batch_number for ba in item.batch_allocations.all()
                )
                or "—"
            )
            rows.append(
                [
                    Paragraph(esc(item.product.name), s_normal),
                    Paragraph(esc(batch_str), s_normal),
                    Paragraph(str(item.quantity), s_td_r),
                    Paragraph(f"{item.price_snapshot:.2f} €", s_td_r),
                    Paragraph(f"{item.get_subtotal():.2f} €", s_td_r),
                ]
            )
    else:
        COL_W = [88 * mm, 18 * mm, 32 * mm, 32 * mm]
        rows = [
            [
                Paragraph("Popis", s_th),
                Paragraph("Množ.", s_th_r),
                Paragraph("Cena / ks", s_th_r),
                Paragraph("Spolu", s_th_r),
            ]
        ]
        for item in items_qs:
            rows.append(
                [
                    Paragraph(esc(item.product.name), s_normal),
                    Paragraph(str(item.quantity), s_td_r),
                    Paragraph(f"{item.price_snapshot:.2f} €", s_td_r),
                    Paragraph(f"{item.get_subtotal():.2f} €", s_td_r),
                ]
            )

    n_last_item = len(rows) - 1  # 0-based index of last item row (before total)
    rows.append(
        [
            "",
            "",
            Paragraph("Celkom:", s_r_bold),
            Paragraph(f"{order.total_price:.2f} €", s_total_r),
        ]
    )

    items_tbl = Table(rows, colWidths=COL_W, repeatRows=1)
    items_tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), _BLUE),
                ("ROWBACKGROUNDS", (0, 1), (-1, n_last_item), [colors.white, _LIGHT]),
                ("GRID", (0, 0), (-1, n_last_item), 0.4, colors.HexColor("#E5E7EB")),
                ("LINEABOVE", (0, -1), (-1, -1), 1.5, _BLUE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(items_tbl)
    story.append(Spacer(1, 4 * mm))

    # ── VAT BREAKDOWN (only for VAT payers) ──────────────────────────────
    if getattr(order, "is_vat_payer", False):
        country = getattr(order, "country", "SK") or "SK"
        vat_rate = VAT_RATES.get(country, VAT_RATES["SK"])
        base = (order.total_price / (1 + vat_rate)).quantize(Decimal("0.01"))
        vat_amount = (order.total_price - base).quantize(Decimal("0.01"))
        vat_pct = int(vat_rate * 100)

        vat_rows = [
            ["", "", Paragraph("Základ dane:", s_r), Paragraph(f"{base:.2f} €", s_td_r)],
            ["", "", Paragraph(f"DPH {vat_pct}%:", s_r), Paragraph(f"{vat_amount:.2f} €", s_td_r)],
            ["", "", Paragraph("Celkom s DPH:", s_r_bold), Paragraph(f"{order.total_price:.2f} €", s_total_r)],
        ]
        vat_tbl = Table(vat_rows, colWidths=COL_W)
        vat_tbl.setStyle(TableStyle([
            ("LINEABOVE", (0, 0), (-1, 0), 0.5, _GRAY),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(vat_tbl)
        story.append(Spacer(1, 2 * mm))

    # ── SKONTO BLOCK (only for bank_transfer orders) ──────────────────────
    if order.payment_method == "bank_transfer":
        invoice_date = order.created_at.date()
        sk_date = _skonto_date(invoice_date)
        sk_amount = _skonto_amount(order.total_price)
        skonto_style = ParagraphStyle(
            "skonto",
            fontName=_FONT,
            fontSize=8.5,
            textColor=_BLUE,
            leading=12,
            backColor=colors.HexColor("#EFF6FF"),
            borderPad=6,
        )
        story.append(
            Paragraph(
                f"Pri úhrade do <b>{sk_date.strftime('%d.%m.%Y')}</b>: "
                f"<b>{sk_amount:.2f} €</b> (-2% skonto za včasnú platbu)",
                skonto_style,
            )
        )
        story.append(Spacer(1, 4 * mm))

    # ── NOTES ─────────────────────────────────────────────────────────────
    if order.notes:
        story.append(Spacer(1, 6 * mm))
        story.append(Paragraph("Poznámka:", s_label))
        story.append(Spacer(1, 1 * mm))
        story.append(Paragraph(esc(order.notes), s_normal))

    doc.build(story)
    pdf = buffer.getvalue()
    buffer.close()
    return pdf
