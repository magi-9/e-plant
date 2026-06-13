import { useQuery } from '@tanstack/react-query';
import { getGlobalSettings } from '../api/settings';
import { getCompanyProfile } from '../utils/companyProfile';

export default function ComplaintsPage() {
    const { data: globalSettings } = useQuery({
        queryKey: ['global-settings'],
        queryFn: getGlobalSettings,
    });
    const company = getCompanyProfile(globalSettings);

    return (
        <div className="bg-white py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl mb-8">
                    Reklamačný poriadok
                </h1>

                <div className="prose prose-blue max-w-none">
                    <h2>1. Všeobecné ustanovenia</h2>
                    <p>
                        Tento reklamačný poriadok upravuje spôsob uplatňovania nárokov z vád tovaru zakúpeného v našom internetovom obchode.
                    </p>

                    <h2>2. Práva spotrebiteľa</h2>
                    <p>
                        Zákonná zodpovednosť za vady pri spotrebiteľovi trvá 24 mesiacov od prevzatia tovaru, pokiaľ právne predpisy neustanovujú inak. <br />
                        Kupujúci má právo na bezplatné odstránenie vady, výmenu tovaru za nový, primeranú zľavu z ceny, alebo právo na odstúpenie od zmluvy (vrátenie peňazí) v prípadoch, ktoré definuje zákon.
                    </p>

                    <h2>3. Spôsob uplatnenia reklamácie</h2>
                    <p>
                        Pred odoslaním reklamovaného tovaru nás najprv kontaktujte na e-mailovej adrese <strong>info@ebringer.sk</strong>. Po prijatí oznámenia Vám pošleme všetky potrebné informácie k ďalšiemu postupu.
                    </p>
                    <ol>
                        <li>Zabaľte tovar tak, aby sa pri preprave nepoškodil.</li>
                        <li>Priložte kópiu faktúry (dokladu o kúpe) a popis závady.</li>
                        <li>Tovar odošlite až po tom, ako od nás dostanete pokyny k reklamácii.</li>
                    </ol>

                    <h2>4. Lehoty pri vybavení reklamácie</h2>
                    <p>
                        Po prijatí reklamácie vydáme spotrebiteľovi potvrdenie. O spôsobe vybavenia reklamácie rozhodneme bez zbytočného odkladu.
                        Vybavenie reklamácie nesmie trvať dlhšie ako 30 dní odo dňa uplatnenia (zrušíme tovar, vrátime peniaze alebo vymeníme tovar).
                    </p>

                    <h2>5. Kontaktné údaje pre zaslanie tovaru</h2>
                    <p>
                        <strong>Adresa pre zasielanie reklamácií:</strong><br />
                        {company.companyName}<br />
                        {company.companyStreet || 'Neuvedená adresa'}<br />
                        {[company.companyPostalCode, company.companyCity].filter(Boolean).join(' ') || 'Neuvedené mesto'}<br />
                    </p>
                    <p>
                        E-mail pre oznámenie reklamácie vopred: <strong>info@ebringer.sk</strong>
                    </p>
                </div>
            </div>
        </div>
    );
}
