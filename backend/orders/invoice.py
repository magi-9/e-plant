"""
PDF invoice generator using ReportLab.
- Proper UTF-8 / Unicode support via DejaVu TTF fonts (falls back to Helvetica).
- SEPA EPC payment QR code for bank-transfer orders (requires qrcode[pil]).
- Clean two/three-column layout.

Usage:
    pdf_bytes = generate_invoice_pdf(order, global_settings)
"""

import os
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

    qr = _sepa_qr_image(
        iban=shop_settings.iban if order.payment_method == "bank_transfer" else "",
        bic=shop_settings.bank_swift,
        name=seller_name,
        amount=order.total_price,
        reference=order.order_number,
        size_mm=38,
    )

    if qr:
        qr_cell = [Paragraph("QR platba", s_label), Spacer(1, 1 * mm), qr]
        billing_tbl = Table(
            [[buyer_cell, pay_cell, qr_cell]],
            colWidths=[80 * mm, 48 * mm, 42 * mm],
            style=TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ]
            ),
        )
    else:
        billing_tbl = Table(
            [[buyer_cell, pay_cell]],
            colWidths=[100 * mm, 70 * mm],
            style=TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ]
            ),
        )
    story.append(billing_tbl)
    story.append(Spacer(1, 8 * mm))

    # ── ITEMS TABLE ───────────────────────────────────────────────────────
    items_qs = order.items.prefetch_related("batch_allocations__batch_lot").all()
    has_batches = any(item.batch_allocations.exists() for item in items_qs)

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
            batch_str = ", ".join(
                ba.batch_lot.batch_number for ba in item.batch_allocations.all()
            ) or "—"
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
