export default function WithdrawalPage() {
    return (
        <div className="bg-white py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl mb-8">
                    Odstúpenie od zmluvy do 14 dní
                </h1>

                <div className="prose prose-blue max-w-none">
                    <p>
                        Ako spotrebiteľ máte zákonné právo bez udania dôvodu odstúpiť od zmluvy v lehote do 14 dní od doručenia a prevzatia tovaru.
                        Toto právo sa nevzťahuje na tovar upravený podľa osobitných požiadaviek (na zákazku) alebo na tovar uzavretý v ochrannom obale, ktorý nie je vhodné vrátiť z dôvodu ochrany zdravia alebo z hygienických dôvodov a ktorého ochranný obal bol po dodaní porušený.
                    </p>

                    <h2 className="mt-8 mb-4">Vzorový formulár na odstúpenie</h2>
                    <div className="bg-gray-50 border border-gray-200 p-6 rounded-md text-sm text-gray-800 font-mono">
                        <p className="mb-4">
                            <strong>Predávajúci:</strong><br />
                            [DOPLNIŤ: Názov spoločnosti]<br />
                            [DOPLNIŤ: Presná adresa, PSČ, Mesto]<br />
                            [DOPLNIŤ: E-mail: email@domena.sk]
                        </p>

                        <p className="mb-4">
                            <strong>Týmto oznamujem/oznamujeme (*), že odstupujem/odstupujeme (*) od zmluvy na tento tovar:</strong>
                        </p>

                        <div className="space-y-2 mb-4">
                            <p><strong>Názov tovaru:</strong> ___________________________________</p>
                            <p><strong>Dátum objednania / dátum prijatia (*):</strong> ________________</p>
                            <p><strong>Číslo objednávky (alebo faktúry):</strong> _______________________</p>
                        </div>

                        <div className="space-y-2 mb-8">
                            <p><strong>Meno a priezvisko spotrebiteľa/spotrebiteľov (*):</strong></p>
                            <p>___________________________________</p>

                            <p><strong>Adresa spotrebiteľa/spotrebiteľov (*):</strong></p>
                            <p>___________________________________</p>

                            <p><strong>Číslo účtu IBAN pre vrátenie platieb:</strong></p>
                            <p>___________________________________</p>
                        </div>

                        <p><strong>Dátum:</strong> _______________</p>
                        <p><strong>Podpis spotrebiteľa/spotrebiteľov (*)</strong> <em>(iba ak sa tento formulár podáva v listinnej podobe)</em>:</p>
                        <p>_______________</p>
                        <br />
                        <p className="text-xs text-gray-500">(*) Nehodiace sa prečiarknite.</p>
                    </div>

                    <h2 className="mt-8">Vrátenie peňazí</h2>
                    <p>
                        Platby Vám budú vrátené bez zbytočného odkladu, najneskôr do 14 dní odo dňa, keď nám bude doručené Vaše oznámenie o odstúpení od zmluvy. Vrátenie platieb môžeme pozdržať až do chvíle prijatia vráteného tovaru alebo preukázania jeho zaslania.
                    </p>
                </div>
            </div>
        </div>
    );
}
