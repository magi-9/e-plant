export default function PrivacyPage() {
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
                    </ul>

                    <h2>2. Na aký účel údaje zbierame</h2>
                    <p>
                        Vaše osobné údaje spracúvame na tieto účely:
                    </p>
                    <ul>
                        <li><strong>Vybavenie objednávky:</strong> Dodanie tovaru a s tým súvisiaca komunikácia.</li>
                        <li><strong>Účtovníctvo a dane:</strong> Plnenie zákonných povinností.</li>
                    </ul>

                    <h2>3. Právny základ</h2>
                    <p>
                        Údaje spracúvame na základe plnenia zmluvy (vybavenie objednávky) a našej zákonnej povinnosti (účtovné doklady).
                    </p>

                    <h2>4. Doba uchovávania</h2>
                    <p>
                        Faktúry a účtovné doklady uchovávame po dobu vyžadovanú platnými právnymi predpismi.
                        Údaje pre vybavenie objednávky sa uchovávajú po dobu trvania zákonnej zodpovednosti za vady.
                    </p>

                    <h2>5. Komu údaje poskytujeme</h2>
                    <p>
                        Pre zabezpečenie fungovania e-shopu môžeme poskytovať údaje tretím stranám:
                    </p>
                    <ul>
                        <li><strong>Kuriérske spoločnosti:</strong> v rozsahu potrebnom na doručenie objednávky.</li>
                        <li><strong>Poskytovateľ účtovných služieb:</strong> v rozsahu potrebnom na splnenie účtovných a daňových povinností.</li>
                        <li><strong>Technický tím a vývojári e-shopovej platformy:</strong> v rozsahu potrebnom na prevádzku, údržbu a technickú podporu e-shopu.</li>
                    </ul>

                    <h2>6. Práva dotknutej osoby</h2>
                    <p>
                        Máte právo na prístup k svojim údajom, na ich opravu, vymazanie ("právo na zabudnutie"), obmedzenie spracúvania, právo namietať a právo na prenosnosť údajov. Ak sa domnievate, že spracúvanie osobných údajov je v rozpore s právnymi predpismi, máte právo podať sťažnosť na Úrad na ochranu osobných údajov SR.
                    </p>

                    <h2>7. Kontakt na uplatnenie práv</h2>
                    <p>
                        So žiadosťami týkajúcimi sa osobných údajov nás môžete kontaktovať na e-maile: <strong>info@ebringer.sk</strong>
                    </p>
                </div>
            </div>
        </div>
    );
}
