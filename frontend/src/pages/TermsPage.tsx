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

                    <h2>2. Rozsah pôsobnosti</h2>
                    <p>
                        Tieto obchodné podmienky sa vzťahujú na nákup tovaru podnikateľskými subjektmi v rámci B2B obchodného vzťahu, najmä zubnými laboratóriami, zubnými klinikami, stomatologickými ambulanciami a ďalšími zdravotníckymi zariadeniami. Vzťahy medzi predávajúcim a kupujúcim sa spravujú príslušnými ustanoveniami Obchodného zákonníka, pokiaľ nie je dohodnuté inak.
                    </p>

                    <h2>3. Kontaktné údaje</h2>
                    <p>
                        <strong>Email:</strong> info@ebringer.sk<br />
                        <strong>Telefón:</strong> {company.companyPhone || 'Neuvedené'}<br />
                    </p>

                    <h2>4. Ceny tovaru</h2>
                    <p>
                        Všetky uvádzané ceny sú zobrazené v eurách. Pri produkte je uvedená cena bez DPH a výsledná cena s DPH. Informácia o DPH je uvedená aj na faktúre.
                    </p>

                    <h2>5. Spôsob platby a dopravy</h2>
                    <p>
                        <strong>Platba:</strong> prevodom na bankový účet.<br />
                        <strong>Doprava:</strong> osobný odber alebo doručenie kuriérom.<br />
                    </p>

                    <h2>6. Dodacie podmienky</h2>
                    <p>
                        Dodanie tovaru závisí od jeho aktuálnej dostupnosti. O vybavení alebo odoslaní objednávky je zákazník informovaný e-mailom.
                    </p>

                    <h2>7. Odstúpenie od zmluvy a vrátenie tovaru</h2>
                    <p>
                        Keďže ide o B2B obchodný vzťah medzi podnikateľmi, zákonné spotrebiteľské právo na odstúpenie od zmluvy bez uvedenia dôvodu do 14 dní sa neuplatňuje. Vrátenie alebo výmena tovaru mimo reklamácie je možná iba po predchádzajúcej dohode s predávajúcim. Podmienky vrátenia nájdete na stránke <a href="/withdrawal" className="text-blue-600 hover:text-blue-800">Vrátenie tovaru v B2B režime</a>.
                    </p>

                    <h2>8. Reklamačný poriadok</h2>
                    <p>
                        Práva zo zodpovednosti za vady sa uplatňujú v B2B režime podľa Obchodného zákonníka a podľa reklamačného poriadku predávajúceho. Bližšie informácie o spôsobe uplatnenia reklamácie nájdete v <a href="/complaints" className="text-blue-600 hover:text-blue-800">Reklamačnom poriadku pre B2B zákazníkov</a>.
                    </p>

                    <h2>9. Riešenie sporov</h2>
                    <p>
                        Prípadné spory budú zmluvné strany riešiť prednostne vzájomnou komunikáciou a dohodou. Ak nedôjde k dohode, spor sa bude riešiť podľa príslušných právnych predpisov Slovenskej republiky.
                    </p>
                </div>
            </div>
        </div>
    );
}
