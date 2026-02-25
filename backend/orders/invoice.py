"""
PDF invoice generator using ReportLab.
Usage:
    pdf_bytes = generate_invoice_pdf(order, global_settings)
"""

from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
    Paragraph,
)


def _style(name, **kwargs):
    styles = getSampleStyleSheet()
    base = kwargs.pop("parent", styles["Normal"])
    return ParagraphStyle(name, parent=base, **kwargs)


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

    # ── Styles ──────────────────────────────────────────────────────────────
    normal = _style("ds_normal", fontSize=9)
    small = _style("ds_small", fontSize=8, textColor=colors.HexColor("#6B7280"))
    bold = _style("ds_bold", fontSize=9, fontName="Helvetica-Bold")
    big_bold = _style("ds_bigbold", fontSize=18, fontName="Helvetica-Bold")
    right_bold = _style(
        "ds_right_bold", fontSize=9, fontName="Helvetica-Bold", alignment=TA_RIGHT
    )
    right_normal = _style("ds_right_normal", fontSize=9, alignment=TA_RIGHT)

    BLUE = colors.HexColor("#2563EB")
    LIGHT = colors.HexColor("#F3F4F6")

    story = []

    # ── HEADER: seller (left) + invoice meta (right) ─────────────────────
    seller_name = shop_settings.company_name or "DentalShop"

    seller_block = [
        Paragraph(seller_name, _style("sn", fontSize=13, fontName="Helvetica-Bold"))
    ]
    if shop_settings.company_street:
        seller_block.append(Paragraph(shop_settings.company_street, normal))
    addr = f"{shop_settings.company_postal_code} {shop_settings.company_city}".strip()
    if shop_settings.company_state:
        addr += f", {shop_settings.company_state}"
    if addr.strip(",").strip():
        seller_block.append(Paragraph(addr, normal))
    if shop_settings.company_phone:
        seller_block.append(Paragraph(f"Tel.: {shop_settings.company_phone}", normal))
    if shop_settings.company_email:
        seller_block.append(Paragraph(f"Email: {shop_settings.company_email}", normal))
    if shop_settings.company_ico:
        seller_block.append(Paragraph(f"IČO: {shop_settings.company_ico}", normal))
    if shop_settings.company_dic:
        seller_block.append(Paragraph(f"DIČ: {shop_settings.company_dic}", normal))

    invoice_block = [
        Paragraph("FAKTÚRA", big_bold),
        Spacer(1, 2 * mm),
        Paragraph(f"Číslo: <b>{order.order_number}</b>", right_normal),
        Paragraph(f"Dátum: {order.created_at.strftime('%d.%m.%Y')}", right_normal),
    ]

    header_tbl = Table(
        [[seller_block, invoice_block]],
        colWidths=[110 * mm, 60 * mm],
    )
    header_tbl.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
            ]
        )
    )
    story.append(header_tbl)
    story.append(Spacer(1, 6 * mm))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.black))
    story.append(Spacer(1, 6 * mm))

    # ── BUYER (left) + PAYMENT (right) ───────────────────────────────────
    buyer_block = [Paragraph("Odberateľ:", small)]
    if order.is_company and order.company_name:
        buyer_block.append(Paragraph(order.company_name, bold))
    buyer_block.append(
        Paragraph(
            order.customer_name,
            normal if (order.is_company and order.company_name) else bold,
        )
    )
    if order.street:
        buyer_block.append(Paragraph(order.street, normal))
    buyer_addr = f"{order.postal_code} {order.city}".strip()
    if buyer_addr.strip():
        buyer_block.append(Paragraph(buyer_addr, normal))
    if order.is_company:
        if order.ico:
            buyer_block.append(Paragraph(f"IČO: {order.ico}", normal))
        if order.dic:
            buyer_block.append(Paragraph(f"DIČ: {order.dic}", normal))
        if order.dic_dph:
            buyer_block.append(Paragraph(f"IČ DPH: {order.dic_dph}", normal))
    buyer_block.append(Paragraph(f"Email: {order.email}", normal))
    buyer_block.append(Paragraph(f"Tel.: {order.phone}", normal))

    payment_block = [Paragraph("Platba:", small)]
    payment_block.append(Paragraph(order.get_payment_method_display(), bold))
    if order.payment_method == "bank_transfer":
        if shop_settings.iban:
            payment_block.append(Paragraph(f"IBAN: {shop_settings.iban}", normal))
        if shop_settings.bank_name:
            payment_block.append(Paragraph(f"Banka: {shop_settings.bank_name}", normal))
        if shop_settings.bank_swift:
            payment_block.append(
                Paragraph(f"SWIFT: {shop_settings.bank_swift}", normal)
            )
        payment_block.append(
            Paragraph(f"Var. symbol: <b>{order.order_number}</b>", normal)
        )

    billing_tbl = Table(
        [[buyer_block, payment_block]],
        colWidths=[110 * mm, 60 * mm],
    )
    billing_tbl.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    story.append(billing_tbl)
    story.append(Spacer(1, 8 * mm))

    # ── ITEMS TABLE ──────────────────────────────────────────────────────
    COL_W = [88 * mm, 18 * mm, 32 * mm, 32 * mm]

    th_style = _style(
        "th", fontSize=9, fontName="Helvetica-Bold", textColor=colors.white
    )
    th_r = _style(
        "th_r",
        fontSize=9,
        fontName="Helvetica-Bold",
        textColor=colors.white,
        alignment=TA_RIGHT,
    )
    td_r = _style("td_r", fontSize=9, alignment=TA_RIGHT)

    rows = [
        [
            Paragraph("Popis", th_style),
            Paragraph("Množ.", th_r),
            Paragraph("Cena/ks", th_r),
            Paragraph("Spolu", th_r),
        ]
    ]

    for item in order.items.all():
        rows.append(
            [
                Paragraph(item.product.name, normal),
                Paragraph(str(item.quantity), td_r),
                Paragraph(f"{item.price_snapshot:.2f} €", td_r),
                Paragraph(f"{item.get_subtotal():.2f} €", td_r),
            ]
        )

    # Spacer row then total
    rows.append(["", "", "", ""])
    rows.append(
        [
            "",
            "",
            Paragraph("<b>Celkom:</b>", right_bold),
            Paragraph(f"<b>{order.total_price:.2f} €</b>", right_bold),
        ]
    )

    n_item_rows = len(rows) - 2  # excluding total spacer + total rows

    items_tbl = Table(rows, colWidths=COL_W, repeatRows=1)
    items_tbl.setStyle(
        TableStyle(
            [
                # Header
                ("BACKGROUND", (0, 0), (-1, 0), BLUE),
                ("ROWBACKGROUNDS", (0, 1), (-1, n_item_rows), [colors.white, LIGHT]),
                # Grid on data rows only
                ("GRID", (0, 0), (-1, n_item_rows), 0.5, colors.HexColor("#E5E7EB")),
                # Total separator
                ("LINEABOVE", (0, -1), (-1, -1), 1, colors.black),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(items_tbl)

    # ── NOTES & FOOTER ───────────────────────────────────────────────────
    if order.notes:
        story.append(Spacer(1, 6 * mm))
        story.append(Paragraph(f"Poznámka: {order.notes}", small))

    story.append(Spacer(1, 10 * mm))
    story.append(
        HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#9CA3AF"))
    )
    story.append(Spacer(1, 3 * mm))
    story.append(Paragraph(f"Vystavil: {seller_name}", small))

    doc.build(story)
    return buffer.getvalue()
