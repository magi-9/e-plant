import { useQuery } from '@tanstack/react-query';
import { getGlobalSettings } from '../api/settings';

const claimSubjects = [
    'výrobné vady dodaného tovaru',
    'materiálové vady výrobku',
    'nesprávne dodaný tovar',
    'dodanie nekompletného tovaru',
    'vady, ktoré existovali v čase prechodu nebezpečenstva škody na tovare na kupujúceho',
];

const inspectionDuties = [
    'správnosti dodaného tovaru',
    'množstva dodaného tovaru',
    'neporušenosti obalu',
    'viditeľných vád',
];

const claimRequirements = [
    'identifikáciu kupujúceho',
    'číslo faktúry',
    'dátum dodania',
    'názov reklamovaného výrobku',
    'číslo šarže (LOT)',
    'podrobný popis vady',
    'fotografickú dokumentáciu',
    'pri klinických prípadoch aj relevantnú zdravotnícku alebo laboratórnu dokumentáciu',
];

const claimAssessmentRights = [
    'vyžiadať si doplňujúce informácie',
    'vyžiadať si reklamovaný tovar na odborné posúdenie',
    'zaslať reklamovaný výrobok výrobcovi alebo autorizovanému distribútorovi',
];

const dynamicFulfillmentOptions = [
    'výmenu reklamovaného komponentu',
    'dodanie náhradných komponentov',
    'dodanie náhradných skrutiek',
    'ďalšie plnenie v rozsahu schválenom výrobcom',
];

const claimExclusions = [
    'použitia výrobku v rozpore s návodom výrobcu',
    'použitia neoriginálnych komponentov',
    'použitia neoriginálnych skrutiek',
    'neodbornej manipulácie',
    'mechanického poškodenia po prevzatí',
    'úpravy alebo modifikácie výrobku',
    'nesprávneho skladovania',
    'prirodzeného opotrebenia',
    'použitia mimo určených indikácií',
];

const damageExclusions = [
    'náklady na opakované ošetrenie pacienta',
    'ušlý zisk',
    'prestoje laboratória alebo ambulancie',
    'náklady na preobjednanie pacientov',
    'náklady na laboratórne práce vykonané pred uznaním reklamácie',
    'akékoľvek nepriame alebo následné škody',
];

const bulletListClassName = 'list-disc pl-6 space-y-1';

export default function ComplaintsPage() {
    const { data: globalSettings } = useQuery({
        queryKey: ['global-settings'],
        queryFn: getGlobalSettings,
    });
    const companyName = globalSettings?.company_name?.trim() || 'Martin Ebringer s.r.o.';
    const companyIco = globalSettings?.company_ico?.trim() || '52595684';
    const companyStreet = globalSettings?.company_street?.trim() || 'Charkovská 13';
    const companyCityLine =
        [globalSettings?.company_postal_code?.trim() || '841 07', globalSettings?.company_city?.trim() || 'Bratislava'].filter(Boolean).join(' ');
    const companyState = globalSettings?.company_state?.trim() || 'Slovenská republika';
    const companyEmail = globalSettings?.company_email?.trim() || 'info@ebringer.sk';

    return (
        <div className="bg-white py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl mb-8">
                    Reklamačný poriadok pre B2B zákazníkov
                </h1>

                <div className="prose prose-blue max-w-none">
                    <p>
                        <strong>{companyName}</strong>
                    </p>
                    <p>
                        <strong>Obchodné meno:</strong> {companyName}<br />
                        <strong>IČO:</strong> {companyIco}<br />
                        <strong>Sídlo:</strong> {companyStreet}, {companyCityLine}, {companyState}
                    </p>

                    <h2>1. Úvodné ustanovenia</h2>
                    <p>
                        Tento reklamačný poriadok upravuje postup pri uplatňovaní práv zo zodpovednosti za vady tovaru dodaného spoločnosťou {companyName} podnikateľským subjektom, najmä zubným laboratóriám, zubným klinikám, stomatologickým ambulanciám a ďalším zdravotníckym zariadeniam (ďalej len „kupujúci“).
                    </p>
                    <p>
                        Tento reklamačný poriadok sa vzťahuje výlučne na obchodnoprávne vzťahy medzi podnikateľmi v zmysle príslušných ustanovení Obchodného zákonníka.
                    </p>
                    <p>
                        Ak by predávajúci výnimočne predával tovar spotrebiteľovi, práva zo zodpovednosti za vady sa posudzujú podľa spotrebiteľských ustanovení Občianskeho zákonníka a zákona o ochrane spotrebiteľa. Tento B2B reklamačný poriadok takéto spotrebiteľské práva neobmedzuje.
                    </p>

                    <h2>2. Predmet reklamácie</h2>
                    <p>Reklamovať je možné:</p>
                    <ul className={bulletListClassName}>
                        {claimSubjects.map((subject) => (
                            <li key={subject}>{subject}</li>
                        ))}
                    </ul>
                    <p>
                        Predmetom reklamácie nemôžu byť vady vzniknuté po prevzatí tovaru nesprávnym používaním alebo manipuláciou.
                    </p>

                    <h2>3. Povinnosť kontroly tovaru</h2>
                    <p>Kupujúci je povinný bezodkladne po prevzatí zásielky vykonať kontrolu:</p>
                    <ul className={bulletListClassName}>
                        {inspectionDuties.map((duty) => (
                            <li key={duty}>{duty}</li>
                        ))}
                    </ul>
                    <p>Zjavné vady musí kupujúci oznámiť predávajúcemu najneskôr do 5 pracovných dní od prevzatia tovaru.</p>
                    <p>Na neskôr oznámené zjavné vady nemusí byť prihliadnuté.</p>

                    <h2>4. Skryté vady</h2>
                    <p>Skryté vady je kupujúci povinný oznámiť bez zbytočného odkladu po ich zistení, najneskôr však do:</p>
                    <ul className={bulletListClassName}>
                        <li>12 mesiacov od dodania tovaru pri jednorazových komponentoch,</li>
                        <li>doby stanovenej výrobcom pri produktoch, na ktoré sa vzťahuje rozšírená garancia výrobcu Dynamic Abutment Solutions.</li>
                    </ul>
                    <p>Po uplynutí uvedenej lehoty nárok na reklamáciu zaniká.</p>

                    <h2>5. Spôsob uplatnenia reklamácie</h2>
                    <p>Reklamáciu je možné uplatniť:</p>
                    <ul className={bulletListClassName}>
                        <li>
                            e-mailom: <strong>{companyEmail}</strong>
                        </li>
                        <li>
                            písomne na adresu:<br />
                            {companyName}<br />
                            {companyStreet}<br />
                            {companyCityLine}
                        </li>
                    </ul>
                    <p>Reklamácia musí obsahovať:</p>
                    <ul className={bulletListClassName}>
                        {claimRequirements.map((requirement) => (
                            <li key={requirement}>{requirement}</li>
                        ))}
                    </ul>

                    <h2>6. Posúdenie reklamácie</h2>
                    <p>Predávajúci je oprávnený:</p>
                    <ul className={bulletListClassName}>
                        {claimAssessmentRights.map((right) => (
                            <li key={right}>{right}</li>
                        ))}
                    </ul>
                    <p>Počas odborného posudzovania reklamácie nie je predávajúci povinný poskytnúť náhradný výrobok.</p>

                    <h2>7. Spôsob vybavenia reklamácie</h2>
                    <p>V prípade uznania reklamácie môže predávajúci podľa povahy vady:</p>
                    <ul className={bulletListClassName}>
                        <li>vymeniť tovar za nový,</li>
                        <li>dodať chýbajúcu časť dodávky,</li>
                        <li>poskytnúť primeranú zľavu z kúpnej ceny,</li>
                        <li>vystaviť dobropis,</li>
                        <li>odstúpiť od zmluvy a vrátiť zaplatenú cenu.</li>
                    </ul>
                    <p>Voľba spôsobu vybavenia reklamácie patrí predávajúcemu, pokiaľ právne predpisy neustanovujú inak.</p>

                    <h2>8. Produkty Dynamic Ti-Base®</h2>
                    <p>
                        Pri originálnych produktoch Dynamic Ti-Base®, Dynamic 3TiBase®, protetických skrutkách a ďalších originálnych komponentoch výrobcu Dynamic Abutment Solutions môže byť reklamácia postúpená výrobcovi na odborné posúdenie.
                    </p>
                    <p>
                        Ak výrobca uzná výrobnú alebo materiálovú vadu, môže podľa svojich aktuálnych záručných podmienok zabezpečiť:
                    </p>
                    <ul className={bulletListClassName}>
                        {dynamicFulfillmentOptions.map((option) => (
                            <li key={option}>{option}</li>
                        ))}
                    </ul>
                    <p>Rozhodnutie výrobcu o uznaní alebo zamietnutí reklamácie je pre predávajúceho záväzným odborným podkladom.</p>

                    <h2>9. Výluky z reklamácie</h2>
                    <p>Reklamáciu nie je možné uznať najmä v prípade:</p>
                    <ul className={bulletListClassName}>
                        {claimExclusions.map((exclusion) => (
                            <li key={exclusion}>{exclusion}</li>
                        ))}
                    </ul>

                    <h2>10. Náhrada škody</h2>
                    <p>Predávajúci nezodpovedá za:</p>
                    <ul className={bulletListClassName}>
                        {damageExclusions.map((exclusion) => (
                            <li key={exclusion}>{exclusion}</li>
                        ))}
                    </ul>
                    <p>Maximálna výška prípadnej náhrady je obmedzená na hodnotu reklamovaného tovaru.</p>

                    <h2>11. Záverečné ustanovenia</h2>
                    <p>
                        Tento reklamačný poriadok je súčasťou obchodných podmienok spoločnosti {companyName} a nadobúda účinnosť dňom jeho zverejnenia na internetovej stránke predávajúceho.
                    </p>
                    <p>
                        {companyName} si vyhradzuje právo na zmenu alebo doplnenie tohto reklamačného poriadku v súlade s platnými právnymi predpismi Slovenskej republiky.
                    </p>
                </div>
            </div>
        </div>
    );
}
