# Catalog Import — Production Deployment

Tieto kroky sa spúšťajú vždy, keď sa mení PDF katalóg, cenník, alebo `visible_categories.txt`.

---

## Predpoklady (lokálne)

Nasledujúce súbory musia byť prítomné v `data/raw/`:

| Súbor | Popis |
|---|---|
| `PRODUCT-REFERENCE-2026-01.pdf` | PDF katalóg produktov |
| `references product_ecommerce.xlsx` | Zoznam všetkých SKU + názvov |
| `DEALER PRICES 2025.xlsx` | Cenník |
| `visible_categories.txt` | Preferované systémy pre primárnu kategóriu |

### `visible_categories.txt` — formát
Čiarka alebo nový riadok oddeľuje názvy systémov, napr.:
```
BIOMET 3L, ASTRA, STRAUMANN, OSSTEM
```
Produkty bez systému z tohto zoznamu môžu stále zostať viditeľné, ak majú názov a cenu.

---
## Servers import
Staging
```bash
rsync -avzP /home/tomas-magula/Documents/Projects/e-plant/data/ oblak-dokploy:/home/tom/eplant-data/

```

Prod
```bash
rsync -avzP /home/tomas-magula/Documents/Projects/e-plant/data/ e-plant:/root/eplant-data/
```




---

## Krok 1 — Regenerovať CSV (lokálne)

Spúšťaj tento krok v repozitári na hoste, nie v backend kontajneri. V kontajneri `backend` sa totiž `data/` typicky nemontuje pod `/app` a navyše tam často chýba Python balík `openpyxl`.

Ak chceš skript spustiť mimo hosta, použi prostredie, kde je nainštalovaný `openpyxl` a ďalšie Python závislosti z import skriptov.

Produktové compatibility bloky z PDF sa parsujú zo strán `43-331`. Technické
parametre skrutiek a fréz sa berú zo strán `334-339`. Doplnkové komponentové
produkty zo strán `340-343` prichádzajú cez Excel/cenník a majú zostať viditeľné,
ak majú názov a cenu, aj keď nemajú klasický compatibility blok.

```bash
python data/convert_to_csv.py
```

Vyprodukuje (do `data/csv/`, gitignored):
- `products.csv` — SKU + názvy z Excelu
- `retail_prices.csv` — ceny
- `compatibility_options.csv` — parametre z PDF per-SKU
- `import_all_merged.csv` — finálny vstup pre import

**Overiť výstup:**
```bash
# Počet riadkov (očakávame ~1885)
wc -l data/csv/import_all_merged.csv

# Skontrolovať konkrétny produkt
grep "31.312.001.21-2" data/csv/import_all_merged.csv
```

---

## Krok 2 — Importovať na server

### Prvý import (čistá DB)
```bash
python manage.py import_product_data --replace-all
```

### Aktualizácia existujúcich produktov
```bash
docker compose exec backend python manage.py import_product_data --update   
```

Výstup importu hlási:
```
1812 products (1605 visible, 207 hidden due to incomplete data)
```

- **visible** = má meno + cenu
- **hidden** = chýba meno alebo cena (je v DB, ale skrytý)

---

## Opakovaný import (re-import od nuly)

Ak potrebuješ úplne resetovať všetky produkty (napr. po zmene logiky importu alebo oprave dát):

```bash
# 1. Vygenerovať čerstvé CSV lokálne na hoste
python data/convert_to_csv.py

# 2. Spustiť plný replace na serveri
docker compose exec backend python manage.py import_product_data --replace-all
```

`--replace-all` zmaže všetky existujúce produkty a nahradí ich novými zo CSV.

> **Pozor:** `--replace-all` odstráni všetky ručné úpravy produktov v DB (popis, parametre, ceny upravené adminom). Ak chceš zachovať ručné úpravy, použi `--update`.

---

## Krok 3 — Overiť v DB

```bash
docker compose exec backend python manage.py shell -c "
from products.models import Product
total = Product.objects.count()
visible = Product.objects.filter(is_visible=True).count()
print(f'Total: {total}, Visible: {visible}, Hidden: {total - visible}')
"
```

---

## Zmena viditeľných systémov

Ak chceš pridať/odobrať systém zo storefrontu:

1. Uprav `data/raw/visible_categories.txt`
2. Spusti `python data/convert_to_csv.py` na hoste
3. Skopíruj `data/csv/import_all_merged.csv` na server
4. Spusti `docker compose exec backend python manage.py import_product_data --update`

> **Pozor:** Zmena `visible_categories.txt` zmení aj `primary_system_category` v CSV,
> čo ovplyvní kategóriu/systém produktu po ďalšom importe, nie samotnú viditeľnosť.

---

## Súhrn súborov

```
data/
├── raw/
│   ├── visible_categories.txt        ← editovateľný zoznam systémov
│   ├── PRODUCT-REFERENCE-2026-01.pdf ← katalóg (len lokálne)
│   ├── references product_ecommerce.xlsx
│   └── DEALER PRICES 2025.xlsx
├── csv/                              ← gitignored, generované
│   └── import_all_merged.csv         ← vstup pre import command
├── convert_to_csv.py                 ← generuje csv/ z raw/
└── parse_catalog.py                  ← parsuje PDF (validácia)

backend/products/management/commands/
└── import_product_data.py            ← Django management command
```
