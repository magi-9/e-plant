import { Link } from 'react-router-dom';
import { ChevronLeftIcon, MapPinIcon, BuildingOfficeIcon, ShieldCheckIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/products"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-cyan-600 transition-colors mb-6"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Späť na produkty
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">O nás</h1>
          <p className="text-lg text-slate-600">Informácie o distributorovi a právne dokumenty</p>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          {/* About Distributor */}
          <section className="bg-white rounded-lg border border-slate-200 p-8 shadow-sm">
            <div className="flex items-start gap-4 mb-6">
              <BuildingOfficeIcon className="h-8 w-8 text-cyan-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">DentalTech Lab &amp; Academy</h2>
                <p className="text-slate-600">
                  Sme exkluzívnym distribútorom produktov <strong>Dynamic Abutment Solutions</strong> pre Slovensko a Českú republiku.
                </p>
              </div>
            </div>
            <div className="space-y-4 text-slate-700">
              <p>
                Špecializujeme sa na komplexné riešenia v implantológii vrátane:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Uhlové a priame abutmenty</li>
                <li>Skenovacie telesá TiBase</li>
                <li>Multi-Unit abutmenty</li>
                <li>CAD/CAM individuálne suprakonstrukcie</li>
                <li>Digitálne workflow riešenia</li>
              </ul>
              <p className="pt-2">
                Naša ponuka je určená pre zubných lekárov, laboratória a zdravotnícke zariadenia.
              </p>
            </div>
          </section>

          {/* Location */}
          <section className="bg-white rounded-lg border border-slate-200 p-8 shadow-sm">
            <div className="flex items-start gap-4 mb-6">
              <MapPinIcon className="h-8 w-8 text-cyan-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Lokácia a kontakt</h2>
              </div>
            </div>
            <div className="space-y-4 text-slate-700">
              <div>
                <p className="font-semibold text-slate-900 mb-1">Adresa:</p>
                <p>DentalTech Lab &amp; Academy</p>
                <p>Bratislava, Slovensko</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900 mb-1">E-mail:</p>
                <a href="mailto:info@dentaltech.sk" className="text-cyan-600 hover:text-cyan-500">
                  info@dentaltech.sk
                </a>
              </div>
              <div>
                <p className="font-semibold text-slate-900 mb-1">Telefón:</p>
                <a href="tel:+421" className="text-cyan-600 hover:text-cyan-500">
                  +421 2 ****-****
                </a>
              </div>
              <div className="mt-4 p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                <p className="text-sm text-slate-700">
                  <strong>Poznámka:</strong> Toto je e-shop pre B2B klientov. Objednávky sú spracovávané počas pracovných dní.
                </p>
              </div>
            </div>
          </section>

          {/* Legal Documents */}
          <section className="bg-white rounded-lg border border-slate-200 p-8 shadow-sm">
            <div className="flex items-start gap-4 mb-6">
              <DocumentTextIcon className="h-8 w-8 text-cyan-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Právne dokumenty a GDPR</h2>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-slate-700 mb-4">
                Nasledujúce dokumenty obsahujú dôležité právne informácie a pravidlá súvisiace s ochranou vašich údajov:
              </p>
              <div className="space-y-2">
                <Link
                  to="/terms"
                  className="flex items-center gap-3 p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors group"
                >
                  <ShieldCheckIcon className="h-5 w-5 text-cyan-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-900 group-hover:text-cyan-600">Obchodné podmienky</p>
                    <p className="text-xs text-slate-500">Pravidlá nákupu a objednávania na našom e-shope</p>
                  </div>
                </Link>
                <Link
                  to="/privacy"
                  className="flex items-center gap-3 p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors group"
                >
                  <ShieldCheckIcon className="h-5 w-5 text-cyan-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-900 group-hover:text-cyan-600">Ochrana osobných údajov (GDPR)</p>
                    <p className="text-xs text-slate-500">Ako spracúvame a chránime vaše osobné údaje</p>
                  </div>
                </Link>
                <Link
                  to="/complaints"
                  className="flex items-center gap-3 p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors group"
                >
                  <ShieldCheckIcon className="h-5 w-5 text-cyan-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-900 group-hover:text-cyan-600">Reklamačný poriadok</p>
                    <p className="text-xs text-slate-500">Postup pri reklamáciách a riešení problémov</p>
                  </div>
                </Link>
                <Link
                  to="/withdrawal"
                  className="flex items-center gap-3 p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors group"
                >
                  <ShieldCheckIcon className="h-5 w-5 text-cyan-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-900 group-hover:text-cyan-600">Právo na odstúpenie od zmluvy</p>
                    <p className="text-xs text-slate-500">Vaše práva na vrátenie a vrátenie peňazí</p>
                  </div>
                </Link>
              </div>
            </div>
          </section>

          {/* Data Protection */}
          <section className="bg-white rounded-lg border border-slate-200 p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Ochrana dát a bezpečnosť</h2>
            <div className="space-y-4 text-slate-700">
              <p>
                Vaša súkromie a bezpečnosť vašich údajov sú pre nás prioritou. Všetky osobné údaje sú spracúvané v súlade s nasledujúcimi reguláciami:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Všeobecné nariadenie o ochrane dát (GDPR)</li>
                <li>Zákon o ochrane osobných údajov Slovenskej republiky</li>
                <li>Príslušné zákony o elektronickom obchode</li>
              </ul>
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-slate-700">
                  Máte právo na prístup, opravu a vymazanie svojich údajov. Ak máte otázky týkajúce sa ochrany údajov, kontaktujte nás na{' '}
                  <a href="mailto:privacy@dentaltech.sk" className="text-blue-600 hover:text-blue-500 font-medium">
                    privacy@dentaltech.sk
                  </a>
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
