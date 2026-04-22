import { useQuery } from '@tanstack/react-query';
import { getGlobalSettings } from '../api/settings';
import { getCompanyProfile } from '../utils/companyProfile';

export default function TermsPage() {
    const { data: globalSettings } = useQuery({
        queryKey: ['global-settings'],
        queryFn: getGlobalSettings,
    });
    const company = getCompanyProfile(globalSettings);

    return (
        <div className="bg-white py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl mb-8">
                    Všeobecné obchodné podmienky (VOP)
                </h1>

                <div className="prose prose-blue max-w-none">
                    <h2>1. Identifikačné údaje prevádzkovateľa</h2>
                    <p>
                        <strong>Názov spoločnosti:</strong> {company.companyName}<br />
                        <strong>Sídlo:</strong> {company.fullAddress || 'Slovensko'}<br />
                        <strong>IČO:</strong> {company.companyIco || 'Neuvedené'}<br />
                        <strong>DIČ / IČ DPH:</strong> {[company.companyDic, company.companyVatId].filter(Boolean).join(' / ') || 'Neuvedené'}<br />
                    </p>

                    <h2>2. Kontaktné údaje</h2>
                    <p>
                        <strong>Email:</strong> {company.companyEmail}<br />
                        <strong>Telefón:</strong> {company.companyPhone || 'Neuvedené'}<br />
                    </p>

                    <h2>3. Ceny tovaru</h2>
                    <p>
                        Všetky uvádzané ceny [sú / nie sú] konečné a [zahŕňajú / nezahŕňajú] DPH v zákonnej výške.<br />
                        [DOPLNIŤ: Ďalšie podrobnosti o zmenách cien alebo zľavách.]
                    </p>

                    <h2>4. Spôsob platby a dopravy</h2>
                    <p>
                        <strong>Platba:</strong> [DOPLNIŤ: napr. kartou online, prevodom, na dobierku]<br />
                        <strong>Doprava:</strong> [DOPLNIŤ: napr. kuriérska spoločnosť, Slovenská pošta, osobný odber]<br />
                    </p>

                    <h2>5. Dodacie podmienky</h2>
                    <p>
                        Tvorí sa v závislosti od dostupnosti tovaru. Štandardná dodacia lehota je [DOPLNIŤ: napr. 2-5 pracovných dní]. O odoslaní tovaru je zákazník informovaný e-mailom.
                    </p>

                    <h2>6. Odstúpenie od zmluvy</h2>
                    <p>
                        Spotrebiteľ má právo odstúpiť od zmluvy bez udania dôvodu do 14 dní od prevzatia tovaru. Oznámenie o odstúpení musí byť doručené prevádzkovateľovi najneskôr v posledný deň lehoty. Formulár na odstúpenie nájdete <a href="/withdrawal" className="text-blue-600 hover:text-blue-800">tu</a>.
                    </p>

                    <h2>7. Reklamačný poriadok</h2>
                    <p>
                        Záručná doba na tovar je 24 mesiacov (pokiaľ nie je uvedené inak alebo pokiaľ nejde o firemného zákazníka). Bližšie informácie o spôsobe uplatnenia reklamácie nájdete v <a href="/complaints" className="text-blue-600 hover:text-blue-800">Reklamačnom poriadku</a>.
                    </p>

                    <h2>8. Mimosúdne riešenie sporov (ADR)</h2>
                    <p>
                        Ak spotrebiteľ nie je spokojný so spôsobom, ktorým predávajúci vybavil jeho reklamáciu alebo ak sa domnieva, že predávajúci porušil jeho práva, má možnosť obrátiť sa na predávajúceho so žiadosťou o nápravu. Ak predávajúci na žiadosť o nápravu odpovie zamietavo alebo na ňu neodpovie do 30 dní odo dňa jej odoslania, spotrebiteľ má právo podať návrh na začatie alternatívneho riešenia svojho sporu podľa ustanovenia § 12 zákona č. 391/2015 Z. z. o alternatívnom riešení spotrebiteľských sporov.
                    </p>
                </div>
            </div>
        </div>
    );
}
