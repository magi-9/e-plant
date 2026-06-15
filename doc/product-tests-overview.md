## Konkrétne produktové testy

Tieto testy si chcel mať pre presne pomenované produkty a ich parametre:

| Referencia | Čo sa má testovať |
| --- | --- |
| `31.313.012.21-2` | kompatibilita, `engagement_type`, `GH_mm`, `As_CH_5mm`, `As_CH_7mm`, `As_CH_9mm` |
| `31.322.014.01-2` | kompatibilita, `engagement_type`, `GH_mm`, `As`, `Ac` |
| `48.312.015.01-2` | kompatibilita, `GH_mm` obsahuje viac hodnôt (`1.5` a `2.9`) |
| `50.313.020.01-2` | kompatibilita a výška/dĺžka `H_mm` alebo `L_mm` so hodnotou `8` |
| `31.312.023.01-2` | kompatibilita, `engagement_type`, `GH_mm`, `As`, `Ac` |
| `31.323.024.24-2` | kompatibilita, `engagement_type`, `GH_mm`, `As_CH_5mm`, `As_CH_7mm`, `As_CH_9mm` |
| `33.690.716.01-2` | kompatibilita, `SHANK`, `Adi` |
| `49.416.000.02-2` | kompatibilita, `Height`, `type`, `screwdriver_ref`, `scanbody_ref` |
| `43.624.201.01-2` | kompatibilita, `Length`, `dynamic_screw_ref` |
| `50.313.010.04-2` | bez `L_mm`, s `H_mm=12` |
| `22.613.024.01-2` | bez `H_mm` |
| `34.610.166.01-2` | `H_mm=3` |
| `41.320.060.01-2` | bez `GH_mm` |

## Poznámky k očakávaniam

- Niektoré názvy parametrov sa v importoch môžu objaviť v normalizovanej forme, napríklad `GH_mm` namiesto `GH(mm)`.
- Pri kombinovaných hodnotách treba overiť, že parameter obsahuje všetky očakávané hodnoty, nie iba jednu z nich.
- Ak sa test robí proti reálnej DB, produkt musí byť naozaj prítomný v test datasete.

## Aktuálna stratégia v teste

Momentálne je bezpečnejšie držať tieto produktové testy ako fixture-based testy, ak chceme:

- stabilné spúšťanie,
- presné kontrolovanie parametrov,
- nezávislosť od toho, či je v test DB pripravený importovaný katalóg.