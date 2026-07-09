import { useQuery } from '@tanstack/react-query';
import { getGlobalSettings } from '../api/settings';
import { getCompanyProfile } from '../utils/companyProfile';

export default function PrivacyPage() {
    const { data: globalSettings } = useQuery({
        queryKey: ['global-settings'],
        queryFn: getGlobalSettings,
    });
    const company = getCompanyProfile(globalSettings);

    return (
        <div className="bg-white py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl mb-8">
                    Ochrana osobných údajov (GDPR)
                </h1>

                <div className="prose prose-blue max-w-none">
                    <h2>1. Prevádzkovateľ</h2>
                    <p>
                        Prevádzkovateľom osobných údajov je <strong>{company.companyName}</strong>, {company.fullAddress || 'Slovensko'}
                        {company.companyIco ? `, IČO: ${company.companyIco}` : ''}. Kontakt pre otázky k osobným údajom: <strong>{company.companyEmail}</strong>.
                    </p>

                    <h2>2. Aké údaje zbierame</h2>
                    <p>
                        Pri využívaní našich služieb môžeme zbierať nasledujúce osobné údaje:
                    </p>
                    <ul>
                        <li>Identifikačné údaje (meno, priezvisko, titul)</li>
                        <li>Kontaktné údaje (e-mail, telefónne číslo, fakturačná a dodacia adresa)</li>
                        <li>Údaje o vašich nákupoch a objednávkach</li>
                        <li>Technické údaje potrebné na bezpečnú prevádzku účtu a e-shopu</li>
                    </ul>

                    <h2>3. Na aký účel údaje zbierame</h2>
                    <p>
                        Vaše osobné údaje spracúvame na tieto účely:
                    </p>
                    <ul>
                        <li><strong>Vybavenie objednávky:</strong> Dodanie tovaru a s tým súvisiaca komunikácia.</li>
                        <li><strong>Účtovníctvo a dane:</strong> Plnenie zákonných povinností.</li>
                        <li><strong>Zákaznícky účet:</strong> Správa registrácie, prihlásenia, histórie objednávok a bezpečnosti účtu.</li>
                        <li><strong>Technická prevádzka:</strong> Zabezpečenie dostupnosti, ochrany a diagnostiky e-shopu.</li>
                    </ul>

                    <h2>4. Právny základ</h2>
                    <p>
                        Údaje spracúvame najmä na základe plnenia zmluvy alebo predzmluvných vzťahov, plnenia zákonných povinností, oprávneného záujmu na bezpečnej prevádzke e-shopu a v prípadoch, kde je to potrebné, na základe vášho súhlasu.
                    </p>

                    <h2>5. Doba uchovávania</h2>
                    <p>
                        Faktúry a účtovné doklady uchovávame po dobu vyžadovanú platnými právnymi predpismi.
                        Údaje potrebné na vybavenie objednávky a uplatnenie práv zo zodpovednosti za vady uchovávame po dobu potrebnú na splnenie zmluvných a zákonných povinností. Údaje v zákazníckom účte uchovávame počas trvania účtu, ak osobitný právny dôvod nevyžaduje dlhšiu dobu uchovania.
                    </p>

                    <h2>6. Komu údaje poskytujeme</h2>
                    <p>
                        Pre zabezpečenie fungovania e-shopu môžeme poskytovať údaje tretím stranám:
                    </p>
                    <ul>
                        <li><strong>Kuriérske spoločnosti:</strong> v rozsahu potrebnom na doručenie objednávky.</li>
                        <li><strong>Poskytovateľ účtovných služieb:</strong> v rozsahu potrebnom na splnenie účtovných a daňových povinností.</li>
                        <li><strong>Technický tím a vývojári e-shopovej platformy:</strong> v rozsahu potrebnom na prevádzku, údržbu a technickú podporu e-shopu.</li>
                        <li><strong>Poskytovatelia hostingu, e-mailových služieb a bezpečnostných nástrojov:</strong> v rozsahu potrebnom na prevádzku a ochranu e-shopu.</li>
                    </ul>

                    <h2>7. Cookies</h2>
                    <p>
                        E-shop používa nevyhnutné technické cookies potrebné na prihlásenie, bezpečnosť, košík a základné fungovanie stránky. Analytické alebo diagnostické nástroje, ktoré nie sú nevyhnutné na fungovanie e-shopu, sa spúšťajú až po udelení súhlasu cez cookie lištu. Súhlas môžete odmietnuť; odmietnutie nevyhnutných cookies však môže obmedziť fungovanie účtu alebo objednávky.
                    </p>

                    <h2>8. Práva dotknutej osoby</h2>
                    <p>
                        Máte právo na prístup k svojim údajom, na ich opravu, vymazanie ("právo na zabudnutie"), obmedzenie spracúvania, právo namietať, právo na prenosnosť údajov a právo odvolať súhlas, ak je spracúvanie založené na súhlase. Ak sa domnievate, že spracúvanie osobných údajov je v rozpore s právnymi predpismi, máte právo podať sťažnosť na Úrad na ochranu osobných údajov SR.
                    </p>

                    <h2>9. Kontakt na uplatnenie práv</h2>
                    <p>
                        So žiadosťami týkajúcimi sa osobných údajov nás môžete kontaktovať na e-maile: <strong>{company.companyEmail}</strong>
                    </p>
                </div>
            </div>
        </div>
    );
}
