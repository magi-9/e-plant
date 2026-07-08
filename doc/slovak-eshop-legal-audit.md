# Audit legislativnych povinnosti e-shopu

Datum auditu: 2026-07-08
Projekt: e-plant / dynamicabutment.ebringer.sk
Rezim predaja: primarne B2B predaj podnikatelom v dental segmente

Tento dokument je technicky compliance audit aplikacie. Nenahradza pravne stanovisko.

## Zaver

E-shop ma zakladne pravne povrchy vytvorene: VOP, ochranu osobnych udajov, reklamacny poriadok, pravidla vratenia tovaru, cookie listu, checkout suhlas a objednavkove e-maily s PDF prilohou. Po tomto audite boli doplnene najma aktualne B2B formulacie, dozorny organ, trvaly nosic, cookies/GDPR rozsah a informacia, ze EU RSO/ODR platforma bola ukoncena 20. jula 2025.

Najvacsi otvoreny bod nie je technicky, ale obchodno-pravny: prevadzkovatel musi potvrdit, ze e-shop naozaj zostava B2B-only. Ak sa ma predavat aj spotrebitelom, treba doplnit plny B2C rezim.

## Auditovane oblasti

### 1. Identifikacia predavajuceho

Stav: ciastocne splnene, doplnene.

Na webe su identifikacne udaje tahane z global settings. VOP boli doplnene o register a organ dozoru. Prevadzkovatel ma este potvrdit presny registracny text, napriklad obchodny register, oddiel, vlozka, alebo zivnostensky register.

Subory:
- `frontend/src/pages/TermsPage.tsx`
- `frontend/src/utils/companyProfile.ts`
- `frontend/src/components/ShopLayout.tsx`

Otvorene:
- potvrdit presne znenie zapisu v registri
- potvrdit prislusny inspektorat SOI podla aktualneho sidla

### 2. VOP a B2B rozsah

Stav: splnene pre deklarovany B2B rezim.

VOP jasne hovoria, ze obchodne podmienky sa vztahuju na podnikatelske subjekty a vztah sa spravuje najma Obchodnym zakonnikom. Doplnene bolo aj uzavretie objednavky, potvrdenie objednavky a PDF ako trvaly nosic.

Subor:
- `frontend/src/pages/TermsPage.tsx`

Otvorene:
- ak sa spusti B2C predaj, treba doplnit spotrebitelske informacne povinnosti, 14-dnove odstupenie a vzorovy formular pre spotrebitela

### 3. Checkout

Stav: splnene.

Finalne tlacidlo pouziva text `Objednat s povinnostou platby`. Checkbox nie je vopred zaskrtnuty. Text checkboxu bol doplneny tak, aby odkazoval aj na reklamacny poriadok.

Subor:
- `frontend/src/pages/CheckoutPage.tsx`

### 4. Odstupenie a vratenie tovaru

Stav: splnene pre B2B rezim.

Stranka vysvetluje, ze 14-dnove spotrebitelske odstupenie sa pri B2B neuplatnuje. Formular je formulovany ako ziadost o vratenie alebo vymenu po dohode, nie ako spotrebitelske odstupenie.

Subor:
- `frontend/src/pages/WithdrawalPage.tsx`

Otvorene:
- pri B2C predaji treba samostatny spotrebitelsky formular na odstupenie od zmluvy

### 5. Zodpovednost za vady / reklamacie

Stav: splnene pre B2B rezim, doplnene upozornenie pre vynimocny B2C predaj.

Reklamacny poriadok je B2B a pouziva aj terminologiu zodpovednosti za vady. Doplnene bolo, ze ak by sa vynimocne predavalo spotrebitelovi, spotrebitelske prava tymto B2B poriadkom nie su obmedzene.

Subor:
- `frontend/src/pages/ComplaintsPage.tsx`

Otvorene:
- pravne potvrdit lehoty a obmedzenia nahrady skody pre konkretny sortiment a dodavatelske podmienky Dynamic Abutment Solutions

### 6. ARS / RSO

Stav: aktualizovane.

Stary odkaz na EU platformu RSO/ODR sa nema pouzivat ako aktualna povinnost, pretoze platforma bola ukoncena 20. jula 2025. VOP teraz hovoria len o alternativnom rieseni spotrebitelskych sporov pre pripad vynimocneho B2C predaja a vysvetluju ukoncenie RSO/ODR.

Subor:
- `frontend/src/pages/TermsPage.tsx`

### 7. GDPR

Stav: doplnene, zaklad splneny.

Privacy page bola doplnena o prevadzkovatela, pravne zaklady, technicku prevadzku, zakaznicky ucet, prijemcov udajov, cookies a prava dotknutej osoby.

Subor:
- `frontend/src/pages/PrivacyPage.tsx`

Otvorene:
- doplnit presne zoznamy externych spracovatelov, ak sa pouzivaju v produkcii: hosting, e-mail provider, uctovnictvo, kurier, Sentry alebo iny monitoring
- potvrdit retencne doby s uctovnikom a prevadzkovatelom

### 8. Cookies

Stav: technicky primerane pre aktualny stav.

Cookie lista uklada `accepted` alebo `declined`. Sentry diagnostika sa inicializuje iba po suhlase. Text listy bol upraveny tak, aby rozlisoval nevyhnutne cookies od volitelnych analytickych/diagnostickych cookies.

Subory:
- `frontend/src/components/CookieConsent.tsx`
- `frontend/src/App.tsx`

Otvorene:
- ak pribudne Google Analytics, Meta Pixel alebo ine marketingove nastroje, treba ich striktne podmienit suhlasom a doplnit detailny zoznam cookies
- zvazit tlacidlo alebo link na neskorsiu zmenu cookie volby

### 9. Objednavkove e-maily a trvaly nosic

Stav: ciastocne splnene.

Objednavkovy e-mail priklada predfakturu PDF. Finalna faktura sa posiela pri relevantnej zmene stavu objednavky. VOP boli doplnene o informaciu, ze PDF priloha sluzi ako trvaly nosic objednavkovych udajov.

Subory:
- `backend/services/email/order_emails.py`
- `backend/services/email/templates.py`
- `backend/orders/invoice.py`

Otvorene:
- ak sa vyzaduje aj PDF kopia VOP alebo formularu pri kazdej objednavke, treba doplnit generovanie/staticke prilohy do objednavkoveho e-mailu

### 10. Fakturacia a eFaktura 2027

Stav: mimo aktualnej implementacie, sledovat.

Aplikacia generuje PDF faktury. Od 1. januara 2027 treba sledovat povinnu elektronicku fakturaciu pre B2B/B2G transakcie cez strukturovany format a Peppol/dorucovaciu infrastrukturu.

Otvorene:
- naplanovat rozhodnutie, ci e-shop bude eFakturu riesit priamo, alebo cez uctovny/fakturacny system

## Odporucane dalsie kroky

1. Prevadzkovatel potvrdi presny register, sidlo, SOI inspektorat a externych spracovatelov osobnych udajov.
2. Pravnicky skontrolovat B2B VOP, lehoty pri vadach a obmedzenie nahrady skody.
3. Rozhodnut, ci e-shop ostava striktne B2B-only. Ak nie, vytvorit samostatny B2C rezim.
4. Pred nasadenim spustit frontend lint/build a spravit vizualnu kontrolu legal pages a checkoutu.
