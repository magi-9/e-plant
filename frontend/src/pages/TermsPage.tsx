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
                        <strong>Email:</strong> info@ebringer.sk<br />
                        <strong>Telefón:</strong> {company.companyPhone || 'Neuvedené'}<br />
                    </p>

                    <h2>3. Ceny tovaru</h2>
                    <p>
                        Všetky uvádzané ceny sú zobrazené v eurách. Pri produkte je uvedená cena bez DPH a výsledná cena s DPH. Informácia o DPH je uvedená aj na faktúre.
                    </p>

                    <h2>4. Spôsob platby a dopravy</h2>
                    <p>
                        <strong>Platba:</strong> prevodom na bankový účet.<br />
                        <strong>Doprava:</strong> osobný odber alebo doručenie kuriérom.<br />
                    </p>

                    <h2>5. Dodacie podmienky</h2>
                    <p>
                        Dodanie tovaru závisí od jeho aktuálnej dostupnosti. O vybavení alebo odoslaní objednávky je zákazník informovaný e-mailom.
                    </p>

                    <h2>6. Odstúpenie od zmluvy</h2>
                    <p>
                        Spotrebiteľ má právo odstúpiť od zmluvy bez udania dôvodu do 14 dní od prevzatia tovaru. Pri medicínskych a hygienicky chránených produktoch je možné prijať vrátenie alebo výmenu iba v prípade, že ochranný obal nebol otvorený ani porušený. Vrátený tovar nesmie byť poškodený ani upravovaný zásahom kupujúceho. Oznámenie o odstúpení musí byť doručené prevádzkovateľovi najneskôr v posledný deň lehoty. Formulár na odstúpenie nájdete <a href="/withdrawal" className="text-blue-600 hover:text-blue-800">tu</a>.
                    </p>

                    <h2>7. Reklamačný poriadok</h2>
                    <p>
                        Zákonná zodpovednosť za vady pri spotrebiteľovi trvá 24 mesiacov od prevzatia tovaru, pokiaľ právne predpisy neustanovujú inak. Bližšie informácie o spôsobe uplatnenia reklamácie nájdete v <a href="/complaints" className="text-blue-600 hover:text-blue-800">Reklamačnom poriadku</a>.
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
