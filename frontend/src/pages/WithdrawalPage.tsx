import { useQuery } from '@tanstack/react-query';
import { getGlobalSettings } from '../api/settings';
import { getCompanyProfile } from '../utils/companyProfile';

export default function WithdrawalPage() {
    const { data: globalSettings } = useQuery({
        queryKey: ['global-settings'],
        queryFn: getGlobalSettings,
    });
    const company = getCompanyProfile(globalSettings);

    return (
        <div className="bg-white py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl mb-8">
                    Vrátenie tovaru v B2B režime
                </h1>

                <div className="prose prose-blue max-w-none">
                    <p>
                        Tento e-shop je určený pre podnikateľské subjekty v rámci B2B obchodného vzťahu. Zákonné spotrebiteľské právo na odstúpenie od zmluvy bez uvedenia dôvodu do 14 dní sa preto neuplatňuje.
                    </p>
                    <p>
                        Vrátenie alebo výmena tovaru mimo reklamácie je možná iba po predchádzajúcej dohode s predávajúcim. Pri medicínskych a hygienicky chránených produktoch je možné prijať vrátenie alebo výmenu iba v prípade, že ochranný obal nebol otvorený ani porušený. Vrátený tovar nesmie byť poškodený, použitý ani upravovaný zásahom kupujúceho.
                    </p>

                    <h2 className="mt-8 mb-4">Žiadosť o vrátenie alebo výmenu tovaru</h2>
                    <div className="bg-gray-50 border border-gray-200 p-6 rounded-md text-sm text-gray-800 font-mono">
                        <p className="mb-4">
                            <strong>Predávajúci:</strong><br />
                            {company.companyName}<br />
                            {company.fullAddress || 'Slovensko'}<br />
                            E-mail: {company.companyEmail}
                        </p>

                        <p className="mb-4">
                            <strong>Týmto žiadam/žiadame (*) o vrátenie alebo výmenu tohto tovaru:</strong>
                        </p>

                        <div className="space-y-2 mb-4">
                            <p><strong>Názov tovaru:</strong> ___________________________________</p>
                            <p><strong>Dátum objednania / dátum prijatia:</strong> ________________</p>
                            <p><strong>Číslo objednávky (alebo faktúry):</strong> _______________________</p>
                            <p><strong>Dôvod žiadosti:</strong> ___________________________________</p>
                        </div>

                        <div className="space-y-2 mb-8">
                            <p><strong>Obchodné meno kupujúceho:</strong></p>
                            <p>___________________________________</p>

                            <p><strong>Adresa kupujúceho:</strong></p>
                            <p>___________________________________</p>

                            <p><strong>Číslo účtu IBAN pre vrátenie platieb:</strong></p>
                            <p>___________________________________</p>
                        </div>

                        <p><strong>Dátum:</strong> _______________</p>
                        <p><strong>Podpis kupujúceho</strong> <em>(iba ak sa formulár podáva v listinnej podobe)</em>:</p>
                        <p>_______________</p>
                        <br />
                        <p className="text-xs text-gray-500">(*) Nehodiace sa prečiarknite.</p>
                    </div>

                    <h2 className="mt-8">Vyhodnotenie žiadosti</h2>
                    <p>
                        Predávajúci žiadosť posúdi individuálne podľa povahy tovaru, jeho stavu a predchádzajúcej komunikácie s kupujúcim. Náklady na vrátenie tovaru znáša kupujúci, pokiaľ sa strany nedohodnú inak.
                    </p>
                </div>
            </div>
        </div>
    );
}
