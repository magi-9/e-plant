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
                    <h2>1. Aké údaje zbierame</h2>
                    <p>
                        Pri využívaní našich služieb môžeme zbierať nasledujúce osobné údaje:
                    </p>
                    <ul>
                        <li>Identifikačné údaje (meno, priezvisko, titul)</li>
                        <li>Kontaktné údaje (e-mail, telefónne číslo, fakturačná a dodacia adresa)</li>
                        <li>Údaje o vašich nákupoch a objednávkach</li>
                        <li>[DOPLNIŤ: Ďalšie údaje ako IP adresa technické údaje, ak ich uchovávate]</li>
                    </ul>

                    <h2>2. Na aký účel údaje zbierame</h2>
                    <p>
                        Vaše osobné údaje spracúvame na tieto účely:
                    </p>
                    <ul>
                        <li><strong>Vybavenie objednávky:</strong> Dodanie tovaru a s tým súvisiaca komunikácia.</li>
                        <li><strong>Účtovníctvo a dane:</strong> Plnenie zákonných povinností.</li>
                        <li><strong>Marketingové účely:</strong> [DOPLNIŤ: napr. zasielanie noviniek, iba so súhlasom].</li>
                    </ul>

                    <h2>3. Právny základ</h2>
                    <p>
                        Údaje spracúvame na základe plnenia zmluvy (vybavenie objednávky), našej zákonnej povinnosti (účtovné doklady) a vo vybraných prípadoch na základe vášho súhlasu (napr. newsletter).
                    </p>

                    <h2>4. Doba uchovávania</h2>
                    <p>
                        Faktúry a účtovné doklady sme v zmysle zákona povinní uchovávať po dobu [DOPLNIŤ: spravidla 10 rokov].
                        Údaje pre vybavenie objednávky sa uchovávajú po dobu trvania záruky (zvyčajne 2 roky). Udelené súhlasy uchovávame do ich odvolania.
                    </p>

                    <h2>5. Komu údaje poskytujeme</h2>
                    <p>
                        Pre zabezpečenie fungovania e-shopu môžeme poskytovať údaje tretím stranám:
                    </p>
                    <ul>
                        <li><strong>Kuriérske spoločnosti:</strong> [DOPLNIŤ: názvy prepravcov]</li>
                        <li><strong>Poskytovateľ účtovných služieb:</strong> [DOPLNIŤ: názov firmy]</li>
                        <li><strong>Poskytovateľ webhostingu/ekomerčnej platformy:</strong> [DOPLNIŤ: identifikácia]</li>
                    </ul>

                    <h2>6. Práva dotknutej osoby</h2>
                    <p>
                        Máte právo na prístup k svojim údajom, na ich opravu, vymazanie ("právo na zabudnutie"), obmedzenie spracúvania, právo nenamietať a právo na prenosnosť údajov. Ak spracúvame údaje na základe súhlasu, máte právo ho kedykoľvek odvolať.
                    </p>

                    <h2>7. Kontakt na uplatnenie práv</h2>
                    <p>
                        So žiadosťami týkajúcimi sa osobných údajov nás môžete kontaktovať na e-maile: <strong>{company.companyEmail}</strong>
                    </p>
                </div>
            </div>
        </div>
    );
}
