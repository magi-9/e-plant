"""Email HTML templates for order confirmations, auth, and notifications."""

from django.utils.html import escape

from users.models import DEFAULT_COMPANY_PROFILE

VERIFICATION_BRAND_NAME = "Dynamic Abutment"
VERIFICATION_SIGNATURE_NAME = "Martin Ebringer s.r.o."


def _text_or_empty(value) -> str:
    return value if isinstance(value, str) else ""


def _safe_company_name(company_name: str) -> str:
    cleaned = (
        _text_or_empty(company_name).strip() or DEFAULT_COMPANY_PROFILE["company_name"]
    )
    return escape(cleaned)


def verification_email_html(
    verify_url: str, company_name: str = DEFAULT_COMPANY_PROFILE["company_name"]
) -> str:
    """HTML template for email verification email."""
    verify_url_escaped = escape(verify_url)
    brand_name_escaped = _safe_company_name(company_name)
    signature_name_escaped = escape(
        f"Tím {(company_name or '').strip() or DEFAULT_COMPANY_PROFILE['company_name']}"
    )
    return f"""<!DOCTYPE html>
<html lang="sk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Overenie e-mailovej adresy</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.10);">
        <tr>
          <td style="background:#2563eb;padding:28px 40px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700;">{brand_name_escaped}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;text-align:center;">
            <h2 style="margin:0 0 12px;font-size:20px;color:#1e293b;">Overenie e-mailovej adresy</h2>
            <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 28px;">
              Ďakujeme za Vašu registráciu na <strong>{brand_name_escaped}</strong>!<br>
              Pre dokončenie registrácie a aktiváciu Vášho účtu kliknite na tlačidlo nižšie.
            </p>
            <a href="{verify_url_escaped}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:15px;font-weight:700;">
              Overiť e-mailovú adresu
            </a>
            <p style="color:#94a3b8;font-size:12px;margin:24px 0 0;line-height:1.6;">
              Ak tlačidlo nefunguje, skopírujte tento odkaz do prehliadača:<br>
              <a href="{verify_url_escaped}" style="color:#2563eb;word-break:break-all;">{verify_url_escaped}</a>
            </p>
            <p style="color:#94a3b8;font-size:12px;margin:16px 0 0;">
              Ak ste si účet nevytvárali, tento e-mail môžete ignorovať.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:18px 40px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">S pozdravom, <strong style="color:#64748b;">{signature_name_escaped}</strong></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def password_reset_email_html(
    reset_url: str, company_name: str = DEFAULT_COMPANY_PROFILE["company_name"]
) -> str:
    """HTML template for password reset email."""
    reset_url_escaped = escape(reset_url)
    company_name_escaped = _safe_company_name(company_name)
    return f"""<!DOCTYPE html>
<html lang="sk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Obnovenie hesla</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.10);">
        <tr>
          <td style="background:#2563eb;padding:28px 40px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700;">{company_name_escaped}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;text-align:center;">
            <h2 style="margin:0 0 12px;font-size:20px;color:#1e293b;">Obnovenie hesla</h2>
            <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 28px;">
              Dostali sme žiadosť o obnovenie hesla pre Váš účet.<br>
              Kliknite na tlačidlo nižšie pre nastavenie nového hesla.
            </p>
            <a href="{reset_url_escaped}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:15px;font-weight:700;">
              Nastaviť nové heslo
            </a>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;margin:24px 0 0;border-collapse:collapse;">
              <tr>
                <td style="padding:12px 16px;">
                  <p style="margin:0;font-size:13px;color:#92400e;">
                    <strong>&#x26A0; Pozor:</strong> Tento odkaz je platný iba <strong>30 minút</strong>.
                  </p>
                </td>
              </tr>
            </table>
            <p style="color:#94a3b8;font-size:12px;margin:20px 0 0;line-height:1.6;">
              Ak tlačidlo nefunguje, skopírujte tento odkaz do prehliadača:<br>
              <a href="{reset_url_escaped}" style="color:#2563eb;word-break:break-all;">{reset_url_escaped}</a>
            </p>
            <p style="color:#94a3b8;font-size:12px;margin:16px 0 0;">
              Ak ste o obnovenie hesla nežiadali, tento e-mail môžete ignorovať — Vaše heslo zostane nezmenené.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:18px 40px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">S pozdravom, <strong style="color:#64748b;">Tím {company_name_escaped}</strong></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def order_confirmation_customer_html(
    order,
    shop,
    status_label: str,
    header_subtitle: str = "Potvrdenie objednávky",
    intro_text: str = None,
) -> str:
    """Build HTML version of customer order confirmation email."""
    company_name_escaped = _safe_company_name(getattr(shop, "company_name", ""))
    if intro_text is None:
        intro_text = (
            f"Ďakujeme za Vašu objednávku v {company_name_escaped}! "
            "Nižšie nájdete jej kompletný prehľad. "
            "Predfaktúra vo formáte PDF je priložená k tomuto e-mailu."
        )
    # Build item rows
    row_parts = []
    for i, item in enumerate(
        order.items.select_related("product")
        .prefetch_related("batch_allocations__batch_lot")
        .all()
    ):
        bg = "#ffffff" if i % 2 == 0 else "#f8fafc"
        batches = item.batch_allocations.all()
        batch_line = ""
        if batches:
            batch_str = ", ".join(
                f"{ba.batch_lot.batch_number} {ba.quantity}x" for ba in batches
            )
            batch_line = f'<br><span style="font-size:11px;color:#64748b;">Šarža: {escape(batch_str)}</span>'
        row_parts.append(
            f'<tr style="background:{bg};">'
            f'<td style="padding:10px 12px;font-size:14px;color:#1e293b;border-bottom:1px solid #f1f5f9;">{escape(item.product.name)}{batch_line}</td>'
            f'<td style="padding:10px 12px;font-size:14px;color:#475569;text-align:center;border-bottom:1px solid #f1f5f9;">{item.quantity}</td>'
            f'<td style="padding:10px 12px;font-size:14px;color:#475569;text-align:right;border-bottom:1px solid #f1f5f9;">{item.price_snapshot}&nbsp;&euro;</td>'
            f'<td style="padding:10px 12px;font-size:14px;font-weight:600;color:#1e293b;text-align:right;border-bottom:1px solid #f1f5f9;">{item.get_subtotal()}&nbsp;&euro;</td>'
            "</tr>"
        )
    item_rows = "".join(row_parts)

    # Payment block
    payment_block = ""
    if order.payment_method == "bank_transfer":
        iban_row = (
            f'<tr><td style="padding:4px 16px;font-size:13px;color:#64748b;">IBAN:</td>'
            f'<td style="padding:4px 16px 4px 8px;font-size:13px;font-weight:600;color:#1e293b;">{escape(shop.iban)}</td></tr>'
            if shop.iban
            else ""
        )
        payment_block = (
            '<table width="100%" cellpadding="0" cellspacing="0"'
            ' style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;margin-bottom:16px;border-collapse:collapse;">'
            '<tr><td colspan="2" style="padding:14px 16px 8px;font-size:11px;font-weight:700;color:#1d4ed8;'
            'text-transform:uppercase;letter-spacing:0.8px;">Platobné údaje</td></tr>'
            f'<tr><td style="padding:4px 16px;font-size:13px;color:#64748b;">Variabilný symbol:</td>'
            f'<td style="padding:4px 16px 4px 8px;font-size:13px;font-weight:700;color:#1e40af;">{escape(order.order_number)}</td></tr>'
            f"{iban_row}"
            f'<tr><td style="padding:4px 16px 14px;font-size:13px;color:#64748b;">Suma na úhradu:</td>'
            f'<td style="padding:4px 16px 14px 8px;font-size:15px;font-weight:700;color:#1d4ed8;">{order.total_price}&nbsp;&euro;</td></tr>'
            "</table>"
        )

    # Company block
    company_block = ""
    if order.is_company:
        dic_dph_row = (
            f'<tr><td style="padding:3px 16px;font-size:13px;color:#64748b;">IČ DPH:</td>'
            f'<td style="padding:3px 16px 3px 8px;font-size:13px;color:#1e293b;">{escape(order.dic_dph)}</td></tr>'
            if order.dic_dph
            else ""
        )
        company_block = (
            '<table width="100%" cellpadding="0" cellspacing="0"'
            ' style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:16px;border-collapse:collapse;">'
            '<tr><td colspan="2" style="padding:14px 16px 8px;font-size:11px;font-weight:700;color:#374151;'
            'text-transform:uppercase;letter-spacing:0.8px;">Fakturačné údaje</td></tr>'
            f'<tr><td colspan="2" style="padding:4px 16px;font-size:14px;font-weight:600;color:#1e293b;">{escape(order.company_name)}</td></tr>'
            f'<tr><td style="padding:3px 16px;font-size:13px;color:#64748b;">IČO:</td>'
            f'<td style="padding:3px 16px 3px 8px;font-size:13px;color:#1e293b;">{escape(order.ico)}</td></tr>'
            f'<tr><td style="padding:3px 16px;font-size:13px;color:#64748b;">DIČ:</td>'
            f'<td style="padding:3px 16px 3px 8px;font-size:13px;color:#1e293b;">{escape(order.dic)}</td></tr>'
            f"{dic_dph_row}"
            '<tr><td colspan="2" style="padding:8px 16px 14px;"></td></tr>'
            "</table>"
        )

    seller_details = []
    company_street = _text_or_empty(getattr(shop, "company_street", "")).strip()
    if company_street:
        seller_details.append(escape(company_street))

    city_line = " ".join(
        filter(
            None,
            [
                _text_or_empty(getattr(shop, "company_postal_code", "")).strip(),
                _text_or_empty(getattr(shop, "company_city", "")).strip(),
                _text_or_empty(getattr(shop, "company_state", "")).strip(),
            ],
        )
    )
    if city_line.strip():
        seller_details.append(escape(city_line))

    company_ico = _text_or_empty(getattr(shop, "company_ico", "")).strip()
    company_dic = _text_or_empty(getattr(shop, "company_dic", "")).strip()
    company_vat_id = _text_or_empty(getattr(shop, "company_vat_id", "")).strip()
    company_email = _text_or_empty(getattr(shop, "company_email", "")).strip()
    company_phone = _text_or_empty(getattr(shop, "company_phone", "")).strip()
    if company_ico:
        seller_details.append(f"IČO: {escape(company_ico)}")
    if company_dic:
        seller_details.append(f"DIČ: {escape(company_dic)}")
    if company_vat_id:
        seller_details.append(f"IČ DPH: {escape(company_vat_id)}")
    if company_email:
        seller_details.append(escape(company_email))
    if company_phone:
        seller_details.append(escape(company_phone))

    # Shipping display
    shipping_display = (
        "Zadarmo" if order.shipping_method == "pickup" else f"{order.shipping_cost}€"
    )

    seller_block = ""
    if seller_details:
        seller_body = "<br>".join([company_name_escaped, *seller_details])
        seller_block = (
            '<table width="100%" cellpadding="0" cellspacing="0"'
            ' style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:16px;border-collapse:collapse;">'
            '<tr><td style="padding:14px 16px 8px;font-size:11px;font-weight:700;color:#374151;'
            'text-transform:uppercase;letter-spacing:0.8px;">Údaje o predajcovi</td></tr>'
            f'<tr><td style="padding:4px 16px 14px;font-size:13px;color:#475569;line-height:1.7;">{seller_body}</td></tr>'
            "</table>"
        )

    # Notes block
    notes_block = (
        '<table width="100%" cellpadding="0" cellspacing="0"'
        ' style="background:#fffbeb;border-left:3px solid #f59e0b;border-radius:0 4px 4px 0;margin-bottom:16px;border-collapse:collapse;">'
        f'<tr><td style="padding:12px 16px;font-size:13px;color:#78350f;"><strong>Poznámka:</strong> {escape(order.notes)}</td></tr>'
        "</table>"
        if order.notes
        else ""
    )

    return f"""<!DOCTYPE html>
<html lang="sk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>{header_subtitle}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:30px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.10);">
        <tr>
          <td style="background:#2563eb;padding:28px 40px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700;">{company_name_escaped}</h1>
            <p style="color:#bfdbfe;margin:8px 0 0;font-size:14px;">{header_subtitle}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;">
            <p style="font-size:16px;color:#1e293b;margin:0 0 6px;">Dobrý deň, <strong>{escape(order.customer_name)}</strong>,</p>
            <p style="color:#475569;margin:0 0 28px;font-size:14px;line-height:1.7;">{intro_text}</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border-left:4px solid #2563eb;border-radius:0 6px 6px 0;margin-bottom:28px;">
              <tr>
                <td style="padding:14px 18px;">
                  <span style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;font-weight:600;">Číslo objednávky</span><br>
                  <strong style="font-size:22px;color:#1e40af;letter-spacing:1px;"># {escape(order.order_number)}</strong>
                </td>
                <td style="padding:14px 18px;text-align:right;vertical-align:middle;">
                  <span style="background:#dbeafe;color:#1d4ed8;padding:5px 14px;border-radius:20px;font-size:12px;font-weight:600;">{escape(status_label)}</span>
                </td>
              </tr>
            </table>
            {seller_block}
            <p style="font-size:11px;font-weight:700;color:#94a3b8;margin:0 0 10px;text-transform:uppercase;letter-spacing:0.8px;">Objednané produkty</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;margin-bottom:24px;">
              <thead>
                <tr style="background:#f8fafc;">
                  <th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e2e8f0;">Produkt</th>
                  <th style="padding:10px 12px;text-align:center;font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e2e8f0;">Množ.</th>
                  <th style="padding:10px 12px;text-align:right;font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e2e8f0;">Cena/ks</th>
                  <th style="padding:10px 12px;text-align:right;font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e2e8f0;">Spolu</th>
                </tr>
              </thead>
              <tbody>{item_rows}</tbody>
              <tfoot>
                <tr style="background:#f9fafb;">
                  <td colspan="3" style="padding:12px;text-align:right;font-weight:600;color:#475569;font-size:13px;border-top:1px solid #f1f5f9;">Doprava:</td>
                  <td style="padding:12px;text-align:right;font-weight:600;color:#475569;font-size:13px;border-top:1px solid #f1f5f9;">{order.get_shipping_method_display()} • {shipping_display}</td>
                </tr>
                <tr style="background:#f8fafc;">
                  <td colspan="3" style="padding:12px;text-align:right;font-weight:700;color:#1e293b;font-size:14px;">Celková suma:</td>
                  <td style="padding:12px;text-align:right;font-weight:700;color:#1d4ed8;font-size:16px;border-bottom:2px solid #e2e8f0;">{order.total_price}&nbsp;&euro;</td>
                </tr>
              </tfoot>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
              <tr>
                <td width="48%" valign="top" style="padding-right:10px;">
                  <p style="font-size:11px;font-weight:700;color:#94a3b8;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.8px;">Dodacia adresa</p>
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;border-collapse:collapse;">
                    <tr><td style="padding:14px 16px;font-size:13px;color:#374151;line-height:1.9;">
                      <strong style="color:#1e293b;">{escape(order.customer_name)}</strong><br>
                      {escape(order.street)}<br>
                      {escape(order.city)}, {escape(order.postal_code)}<br>
                      <span style="color:#64748b;">Tel: {escape(order.phone)}</span>
                    </td></tr>
                  </table>
                </td>
                <td width="4%">&nbsp;</td>
                <td width="48%" valign="top" style="padding-left:10px;">
                  <p style="font-size:11px;font-weight:700;color:#94a3b8;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.8px;">Spôsob platby</p>
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;border-collapse:collapse;">
                    <tr><td style="padding:14px 16px;font-size:13px;color:#374151;">
                      <strong style="color:#1e293b;">{order.get_payment_method_display()}</strong>
                    </td></tr>
                  </table>
                </td>
              </tr>
            </table>
            {payment_block}{company_block}{notes_block}
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="margin:0 0 4px;font-size:13px;color:#94a3b8;">V prípade otázok nás neváhajte kontaktovať.</p>
            <p style="margin:0;font-size:13px;color:#64748b;font-weight:600;">Tím {company_name_escaped}</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def final_invoice_customer_html(order, shop, status_label: str) -> str:
    """Build HTML version of the final (tax-document) invoice email."""
    company_name_escaped = _safe_company_name(getattr(shop, "company_name", ""))
    intro = (
        f"Faktúra k Vašej objednávke v {company_name_escaped} je priložená k tomuto "
        "e-mailu. Nižšie nájdete prehľad objednávky."
    )
    return order_confirmation_customer_html(
        order,
        shop,
        status_label,
        header_subtitle="Faktúra / Daňový doklad",
        intro_text=intro,
    )


def order_notification_warehouse_html(
    order, company_name: str, status_label: str
) -> str:
    """Build HTML version of warehouse order notification email."""
    company_name_escaped = _safe_company_name(company_name)
    row_parts = []
    for i, item in enumerate(
        order.items.select_related("product")
        .prefetch_related("batch_allocations__batch_lot")
        .all()
    ):
        remaining = item.product.stock_quantity
        threshold = item.product.low_stock_threshold
        is_low = remaining < threshold
        bg = "#fff7f7" if is_low else ("#ffffff" if i % 2 == 0 else "#f8fafc")
        stock_cell = (
            '<span style="background:#fee2e2;color:#dc2626;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;">&#x26A0; NÍZKY STAV</span>'
            if is_low
            else '<span style="color:#16a34a;font-size:12px;font-weight:600;">&#x2713; OK</span>'
        )
        qty_color = "#dc2626" if is_low else "#374151"
        batches = item.batch_allocations.all()
        if batches:
            batch_str = ", ".join(
                f"{ba.batch_lot.batch_number} {ba.quantity}x" for ba in batches
            )
            batch_cell = escape(batch_str)
        else:
            batch_cell = '<span style="color:#94a3b8;">—</span>'
        row_parts.append(
            f'<tr style="background:{bg};">'
            f'<td style="padding:10px 12px;font-size:13px;color:#1e293b;border-bottom:1px solid #f1f5f9;">'
            f'{escape(item.product.name)}<br><span style="font-size:11px;color:#94a3b8;">ID: {item.product.id}</span></td>'
            f'<td style="padding:10px 12px;font-size:13px;font-weight:700;color:#1e293b;text-align:center;border-bottom:1px solid #f1f5f9;">{item.quantity}</td>'
            f'<td style="padding:10px 12px;font-size:12px;color:#475569;text-align:center;border-bottom:1px solid #f1f5f9;">{batch_cell}</td>'
            f'<td style="padding:10px 12px;font-size:13px;font-weight:700;color:{qty_color};text-align:center;border-bottom:1px solid #f1f5f9;">{remaining}&nbsp;ks</td>'
            f'<td style="padding:10px 12px;text-align:center;border-bottom:1px solid #f1f5f9;">{stock_cell}</td>'
            "</tr>"
        )
    item_rows = "".join(row_parts)

    company_block = ""
    if order.is_company:
        dic_dph_row = (
            f'<tr><td style="padding:3px 16px;font-size:12px;color:#64748b;">IČ DPH:</td>'
            f'<td style="padding:3px 16px 3px 8px;font-size:12px;color:#1e293b;">{escape(order.dic_dph)}</td></tr>'
            if order.dic_dph
            else ""
        )
        company_block = (
            '<table width="100%" cellpadding="0" cellspacing="0"'
            ' style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;margin-bottom:20px;border-collapse:collapse;">'
            '<tr><td colspan="2" style="padding:12px 16px 8px;font-size:11px;font-weight:700;color:#92400e;'
            'text-transform:uppercase;letter-spacing:0.8px;">Firemná objednávka</td></tr>'
            f'<tr><td colspan="2" style="padding:4px 16px;font-size:14px;font-weight:600;color:#1e293b;">{escape(order.company_name)}</td></tr>'
            f'<tr><td style="padding:3px 16px;font-size:12px;color:#64748b;">IČO:</td>'
            f'<td style="padding:3px 16px 3px 8px;font-size:12px;color:#1e293b;">{escape(order.ico)}</td></tr>'
            f'<tr><td style="padding:3px 16px;font-size:12px;color:#64748b;">DIČ:</td>'
            f'<td style="padding:3px 16px 3px 8px;font-size:12px;color:#1e293b;">{escape(order.dic)}</td></tr>'
            f"{dic_dph_row}"
            '<tr><td colspan="2" style="padding:4px 16px 12px;"></td></tr>'
            "</table>"
        )

    notes_block = (
        '<table width="100%" cellpadding="0" cellspacing="0"'
        ' style="background:#fffbeb;border-left:3px solid #f59e0b;border-radius:0 4px 4px 0;margin-top:16px;border-collapse:collapse;">'
        f'<tr><td style="padding:12px 16px;font-size:13px;color:#78350f;">'
        f"<strong>Poznámka zákazníka:</strong> {escape(order.notes)}"
        "</td></tr></table>"
        if order.notes
        else ""
    )

    # Shipping display for warehouse
    shipping_display_wh = (
        "Zadarmo" if order.shipping_method == "pickup" else f"{order.shipping_cost}€"
    )

    return f"""<!DOCTYPE html>
<html lang="sk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Nová objednávka #{order.order_number}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:30px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.10);">
        <tr>
          <td style="background:#0f172a;padding:24px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td>
                <p style="margin:0;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">{company_name_escaped} &middot; Sklad</p>
                <h1 style="color:#ffffff;margin:4px 0 0;font-size:22px;font-weight:700;">Nová objednávka</h1>
              </td>
              <td style="text-align:right;vertical-align:middle;">
                <span style="background:#2563eb;color:#ffffff;padding:6px 16px;border-radius:20px;font-size:14px;font-weight:700;"># {escape(order.order_number)}</span>
              </td>
            </tr></table>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 40px;">
            {company_block}
            <p style="font-size:11px;font-weight:700;color:#94a3b8;margin:0 0 10px;text-transform:uppercase;letter-spacing:0.8px;">Zákazník</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:24px;border-collapse:collapse;">
              <tr>
                <td width="50%" style="padding:14px 16px;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">
                  <p style="margin:0 0 3px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Meno</p>
                  <p style="margin:0;font-size:14px;font-weight:600;color:#1e293b;">{escape(order.customer_name)}</p>
                </td>
                <td width="50%" style="padding:14px 16px;border-bottom:1px solid #e2e8f0;">
                  <p style="margin:0 0 3px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Telefón</p>
                  <p style="margin:0;font-size:14px;font-weight:600;color:#1e293b;">{escape(order.phone)}</p>
                </td>
              </tr>
              <tr>
                <td colspan="2" style="padding:14px 16px;">
                  <p style="margin:0 0 3px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Email</p>
                  <p style="margin:0;font-size:14px;color:#2563eb;">{escape(order.email)}</p>
                </td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td width="48%" valign="top" style="padding-right:10px;">
                  <p style="font-size:11px;font-weight:700;color:#94a3b8;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.8px;">Dodacia adresa</p>
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;border-collapse:collapse;">
                    <tr><td style="padding:14px 16px;font-size:13px;color:#374151;line-height:1.9;">
                      {escape(order.street)}<br>{escape(order.city)}, {escape(order.postal_code)}
                    </td></tr>
                  </table>
                </td>
                <td width="4%">&nbsp;</td>
                <td width="48%" valign="top" style="padding-left:10px;">
                  <p style="font-size:11px;font-weight:700;color:#94a3b8;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.8px;">Platba &amp; stav</p>
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;border-collapse:collapse;">
                    <tr><td style="padding:14px 16px;font-size:13px;color:#374151;line-height:1.9;">
                      <strong style="color:#1e293b;">{order.get_payment_method_display()}</strong><br>
                      <span style="color:#64748b;">{escape(status_label)}</span><br>
                      <strong style="font-size:16px;color:#1d4ed8;">{order.total_price}&nbsp;&euro;</strong>
                    </td></tr>
                  </table>
                </td>
              </tr>
            </table>
            <p style="font-size:11px;font-weight:700;color:#94a3b8;margin:0 0 10px;text-transform:uppercase;letter-spacing:0.8px;">Produkty na vyskladnenie</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
              <thead>
                <tr style="background:#0f172a;">
                  <th style="padding:10px 12px;text-align:left;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Produkt</th>
                  <th style="padding:10px 12px;text-align:center;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Počet</th>
                  <th style="padding:10px 12px;text-align:center;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Šarža</th>
                  <th style="padding:10px 12px;text-align:center;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Zostatok</th>
                  <th style="padding:10px 12px;text-align:center;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Stav</th>
                </tr>
              </thead>
              <tbody>{item_rows}</tbody>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;border-collapse:collapse;">
              <tr>
                <td width="50%" style="padding:14px 16px;border-right:1px solid #e2e8f0;">
                  <p style="margin:0 0 3px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Doprava</p>
                  <p style="margin:0;font-size:14px;font-weight:600;color:#1e293b;">{order.get_shipping_method_display()} • {shipping_display_wh}</p>
                </td>
                <td width="50%" style="padding:14px 16px;">
                  <p style="margin:0 0 3px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Celková suma</p>
                  <p style="margin:0;font-size:16px;font-weight:700;color:#1d4ed8;">{order.total_price}&nbsp;&euro;</p>
                </td>
              </tr>
            </table>
            {notes_block}
          </td>
        </tr>
        <tr>
          <td style="background:#0f172a;padding:16px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#475569;">{company_name_escaped} &middot; Interná notifikácia</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""
