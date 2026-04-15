import {
  BeakerIcon,
  AcademicCapIcon,
  ShoppingBagIcon,
  ArrowRightIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { useEffect, useRef, useState, type ReactNode } from 'react';

type FadeInSectionProps = {
  children: ReactNode;
  delay?: number;
};

function FadeInSection({ children, delay = 0 }: FadeInSectionProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.15,
      },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transform-gpu transition-all duration-700 ease-out motion-safe:duration-700 ${
        isVisible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-10'
      }`}
    >
      {children}
    </div>
  );
}

export default function HomePage() {
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="bg-slate-50 text-slate-900 flex flex-col min-h-screen">
      {/* Hero */}
      <section
        id="uvod"
        className="relative overflow-hidden bg-gradient-to-b from-cyan-50 via-sky-50 to-white"
      >
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&w=1600&q=80"
            alt="Dentálne laboratórium"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-100/90 via-sky-100/70 to-white/90" />
          <div className="absolute -right-32 -top-40 w-80 h-80 bg-cyan-300/40 rounded-full blur-3xl" />
          <div className="absolute -left-24 bottom-0 w-64 h-64 bg-emerald-200/40 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-16 lg:pt-24 lg:pb-24 grid lg:grid-cols-[minmax(0,1.3fr),minmax(0,1fr)] gap-10 lg:gap-14 items-center">
          <FadeInSection>
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-cyan-300/50 bg-white/70 px-3 py-1 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700 mb-4 shadow-sm">
                DentalTech Lab &amp; Academy
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </p>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight text-slate-900">
                Moderné dentálne laboratórium,
                <span className="block text-cyan-700 mt-2">
                  školenia &amp; e‑shop v jednom.
                </span>
              </h1>

              <p className="mt-6 text-base sm:text-lg text-slate-700 max-w-2xl leading-relaxed">
                <span className="font-semibold text-cyan-700">Dynamic Abutment Solutions</span> – Líder v uhlových abutmentoch a digitálnych workflow pre modernú implantológiu. Komplexné riešenia od skenovacích tiel TiBase, Multi‑Unit abutmentov, až po CAD/CAM individuálne suprakonstrukcie.
              </p>

              <p className="mt-4 text-sm text-slate-600 max-w-2xl">
                Ako exkluzívny predajca pre Slovensko kombinujem prédajcu komponentov s pracovným dentálnym laboratóriom. To znamená: každý produkt som skúšal sám, každý návrh je postavený na reálnej skúsenosti.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => scrollToSection('produkty')}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 px-6 py-3 text-sm sm:text-base font-semibold text-white shadow-lg shadow-cyan-500/30 hover:shadow-emerald-500/40 transition-all hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cyan-50"
                >
                  Produkty &amp; e‑shop
                  <ArrowRightIcon className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={() => scrollToSection('onas')}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-cyan-400/70 bg-white/80 px-5 py-2.5 text-sm sm:text-base font-medium text-cyan-800 hover:bg-cyan-50 hover:border-cyan-500 transition-all hover:-translate-y-0.5"
                >
                  O mne
                  <ArrowRightIcon className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={() => scrollToSection('kontakt')}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-400/70 bg-white/80 px-5 py-2.5 text-sm sm:text-base font-medium text-emerald-800 hover:bg-emerald-50 hover:border-emerald-500 transition-all hover:-translate-y-0.5"
                >
                  Kontakt
                  <EnvelopeIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white border border-emerald-400/50 text-emerald-600 text-[10px] font-semibold">
                    1:1
                  </span>
                  <span>Individuálny prístup pri každej spolupráci</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white border border-cyan-400/60 text-cyan-700 text-[10px] font-semibold">
                    CAD
                  </span>
                  <span>Digitálny workflow od skenu po finálnu prácu</span>
                </div>
              </div>
            </div>
          </FadeInSection>

          <FadeInSection delay={120}>
            <div className="relative">
              <div className="relative rounded-3xl border border-cyan-300/60 bg-white/90 backdrop-blur-xl p-5 sm:p-6 lg:p-7 shadow-2xl shadow-cyan-100">
                <div className="flex items-center gap-4">
                  <div className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-2xl overflow-hidden border border-cyan-300/70 shadow-md shadow-cyan-200/90">
                    <img
                      src="https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=400&q=80"
                      alt="Dentálny technik pri práci"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-700 font-semibold">
                      Dentálny technik
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      Meno Technika
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      Skúsenosti s rôznymi technológiami – od klasickej keramiky až po
                      digitálny dizajn, CAD/CAM a moderné materiály.
                    </p>
                  </div>
                </div>

                <dl className="mt-6 grid grid-cols-2 gap-4 text-xs sm:text-sm">
                  <div className="rounded-2xl bg-cyan-50 border border-cyan-100 p-3">
                    <dt className="flex items-center gap-1.5 text-slate-700">
                      <AcademicCapIcon className="h-4 w-4 text-cyan-600" />
                      Školenia
                    </dt>
                    <dd className="mt-1 font-semibold text-slate-900">
                      On‑site &amp; online
                    </dd>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3">
                    <dt className="flex items-center gap-1.5 text-slate-700">
                      <BeakerIcon className="h-4 w-4 text-emerald-600" />
                      Laboratórium
                    </dt>
                    <dd className="mt-1 font-semibold text-slate-900">
                      Kompletné implantologické práce
                    </dd>
                  </div>
                  <div className="rounded-2xl bg-cyan-50 border border-cyan-100 p-3">
                    <dt className="flex items-center gap-1.5 text-slate-700">
                      <ShoppingBagIcon className="h-4 w-4 text-cyan-600" />
                      E‑shop
                    </dt>
                    <dd className="mt-1 font-semibold text-slate-900">
                      Komponenty pre implantológiu
                    </dd>
                  </div>
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                    <dt className="text-slate-700">
                      Spolupráca
                    </dt>
                    <dd className="mt-1 font-semibold text-emerald-600">
                      Najmä so zubnými technikmi &amp; zubármi
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* O nás */}
      <section
        id="onas"
        className="bg-white border-t border-slate-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24 grid lg:grid-cols-[minmax(0,1.1fr),minmax(0,1fr)] gap-10 lg:gap-16 items-center">
          <FadeInSection>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-700">
                O mne / O nás
              </p>
              <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900">
                Dentálne laboratórium pripravené na
                <span className="block text-cyan-700 mt-1">
                  prácu s rôznymi technológiami.
                </span>
              </h2>

              <p className="mt-5 text-sm sm:text-base text-slate-700 leading-relaxed max-w-xl">
                Spájam precíznu ručnú prácu s digitálnymi technológiami. Od prvého skenu až po
                finálne nasadenie pracujem v úzkej spolupráci so zubným lekárom, aby bol výsledok
                funkčný, estetický a dlhodobo stabilný.
              </p>

              <p className="mt-3 text-sm sm:text-base text-slate-600 max-w-xl">
                Každý prípad beriem ako referenčný – či už ide o&nbsp;jeden zub, alebo komplexnejšiu
                rekonštrukciu. Vďaka školeniam a praxi so systémami{' '}
                <span className="font-semibold text-cyan-700">
                  Dynamic Abutment Solutions
                </span>{' '}
                pomáham technikom aj zubárom nastaviť efektívny CAD/CAM workflow.
              </p>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-2xl font-semibold text-cyan-700">10+</p>
                  <p className="mt-1 text-xs text-slate-600">
                    rokov skúseností v dentálnej technike
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-2xl font-semibold text-emerald-700">100+</p>
                  <p className="mt-1 text-xs text-slate-600">
                    komplexných implantologických prípadov ročne
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-2xl font-semibold text-cyan-700">1</p>
                  <p className="mt-1 text-xs text-slate-600">
                    osobný kontakt – priamo s technikom
                  </p>
                </div>
              </div>
            </div>
          </FadeInSection>

          <FadeInSection delay={140}>
            <div className="relative">
              <div className="relative aspect-[4/3] rounded-3xl overflow-hidden border border-slate-200 bg-slate-100 shadow-xl shadow-slate-200">
                <img
                  src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80"
                  alt="Dentálne laboratórium – pracovné prostredie"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-slate-900/10 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
                  <div>
                    <p className="font-semibold text-white">
                      Dentálne laboratórium – Bratislava
                    </p>
                    <p className="text-slate-100">
                      Spolupráca so zubnými technikmi aj zubármi pri rôznych typoch prípadov.
                    </p>
                  </div>
                  {/* removed online consultation badge based on requirements */}
                </div>
              </div>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* Produkty / e‑shop */}
      <section
        id="produkty"
        className="bg-gradient-to-b from-white via-slate-50 to-cyan-50 border-t border-slate-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
          <FadeInSection>
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-700">
                  Produkty &amp; e‑shop
                </p>
                <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900">
                  Prémiové komponenty pre
                  <span className="block text-cyan-700 mt-1">
                    implantológiu a digitálnu protetiku.
                  </span>
                </h2>
                <p className="mt-4 text-sm sm:text-base text-slate-700 max-w-xl">
                  V e‑shope nájdete sortiment vybraný pre reálnu prax v laboratóriu
                  aj na klinike – od skenovacích tiel, cez TiBase, až po Multi‑Unit riešenia
                  a príslušenstvo pre riadenú chirurgiu.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to="/products"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/40 hover:shadow-emerald-500/40 transition-all hover:-translate-y-0.5"
                >
                  Prejsť do e‑shopu
                  <ArrowRightIcon className="h-5 w-5" />
                </Link>
                <button
                  type="button"
                  onClick={() => window.open('https://www.dynamicabutmentstore.com/es', '_blank', 'noopener')}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-cyan-400/70 bg-white px-5 py-2.5 text-sm font-medium text-cyan-800 hover:bg-cyan-50 hover:border-cyan-500 transition-all"
                >
                  Dynamic Abutment Solutions
                </button>
              </div>
            </div>
          </FadeInSection>

          <FadeInSection delay={100}>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              <div className="group relative overflow-hidden rounded-3xl border border-cyan-100 bg-white p-5 sm:p-6 shadow-md hover:shadow-xl transition-shadow">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-100/50 via-transparent to-emerald-100/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
                      Dynamic Abutment Solutions
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-slate-900">
                      CAD/CAM &amp; Multi‑Unit workflow
                    </h3>
                    <p className="mt-2 text-xs sm:text-sm text-slate-700">
                      Kompletné portfólio kompatibilné s desiatkami implantátových systémov –
                      TiBase, skenovacie tiela, Multi‑Unit abutmenty a viac.
                    </p>
                  </div>
                  <div className="h-14 w-14 rounded-2xl bg-white/90 border border-cyan-300 flex items-center justify-center text-cyan-700 text-xs font-semibold text-center px-2">
                    DAS
                  </div>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-3xl border border-emerald-100 bg-white p-5 sm:p-6 shadow-md hover:shadow-xl transition-shadow">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/60 via-transparent to-cyan-100/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                      Laboratórne riešenia
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-slate-900">
                      Individualizované abutmenty &amp; nadstavby
                    </h3>
                    <p className="mt-2 text-xs sm:text-sm text-slate-700">
                      Individuálne navrhnuté nadstavby a konštrukcie podľa potreby prípadu – od
                      single korunky po celkovú rekonštrukciu.
                    </p>
                  </div>
                  <div className="h-14 w-14 rounded-2xl bg-white/90 border border-emerald-300 flex items-center justify-center text-emerald-700 text-xs font-semibold text-center px-2">
                    LAB
                  </div>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-3xl border border-sky-100 bg-white p-5 sm:p-6 shadow-md hover:shadow-xl transition-shadow">
                <div className="absolute inset-0 bg-gradient-to-br from-sky-100/60 via-transparent to-cyan-100/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                      Chirurgia &amp; plánovanie
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-slate-900">
                      Vedená chirurgia &amp; príslušenstvo
                    </h3>
                    <p className="mt-2 text-xs sm:text-sm text-slate-700">
                      Komponenty pre riadenú chirurgiu, scany a plánovanie – pre konzistentné
                      výsledky pri zložitých prípadoch.
                    </p>
                  </div>
                  <div className="h-14 w-14 rounded-2xl bg-white/90 border border-sky-300 flex items-center justify-center text-sky-700 text-xs font-semibold text-center px-2">
                    GUIDED
                  </div>
                </div>
              </div>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* Čo ponúkame / služby */}
      <section
        id="skolenia"
        className="bg-white border-t border-slate-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
          <FadeInSection>
            <div className="text-center max-w-2xl mx-auto">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-700">
                Čo ponúkame
              </p>
              <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900">
                Školenia, laboratórne práce a{' '}
                <span className="text-cyan-700">partnerstvo pre vašu prax.</span>
              </h2>
              <p className="mt-4 text-sm sm:text-base text-slate-700">
                Flexibilne kombinujem priamu laboratórnu spoluprácu so zubnými technikmi a zubármi
                a e‑shop s&nbsp;komponentmi, ktoré sám denne používam.
              </p>
            </div>
          </FadeInSection>

          <FadeInSection delay={100}>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              <div className="group rounded-3xl border border-cyan-100 bg-white p-6 sm:p-7 shadow-md hover:shadow-xl transition-shadow flex flex-col">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 border border-cyan-200">
                  <AcademicCapIcon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  Školenia &amp; workshopy
                </h3>
                <p className="mt-3 text-sm text-slate-700 flex-1">
                  Prakticky orientované školenia pre lekárov aj technikov – od skenovania a plánovania,
                  cez návrh až po cementáciu. Možné aj priamo vo vašej ambulancii.
                </p>
                <ul className="mt-4 space-y-1.5 text-xs text-slate-600">
                  <li>• Individuálne alebo malé skupiny</li>
                  <li>• CAD/CAM workflow s Dynamic Abutment Solutions</li>
                  <li>• All‑on‑X / full‑arch prípady</li>
                </ul>
              </div>

              <div className="group rounded-3xl border border-emerald-100 bg-white p-6 sm:p-7 shadow-md hover:shadow-xl transition-shadow flex flex-col">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <BeakerIcon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  Laboratórne práce
                </h3>
                <p className="mt-3 text-sm text-slate-700 flex-1">
                  Kompletný servis pre implantologické prípady – od analýzy až po dodanie finálnej
                  práce. Konzultácie pred zákrokom, návrh konštrukcie a dlhoveké materiály.
                </p>
                <ul className="mt-4 space-y-1.5 text-xs text-slate-600">
                  <li>• Individuálne abutmenty &amp; suprakonstrukcie</li>
                  <li>• Dočasné aj definitívne riešenia</li>
                  <li>• Digitálne plánovanie a komunikácia</li>
                </ul>
              </div>

              <div className="group rounded-3xl border border-sky-100 bg-white p-6 sm:p-7 shadow-md hover:shadow-xl transition-shadow flex flex-col">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 border border-sky-200">
                  <ShoppingBagIcon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  E‑shop &amp; technická podpora
                </h3>
                <p className="mt-3 text-sm text-slate-700 flex-1">
                  Pri každej objednávke získavate aj možnosť konzultácie – ak si nie ste istí
                  komponentom, nastavíme riešenie podľa konkrétneho prípadu.
                </p>
                <ul className="mt-4 space-y-1.5 text-xs text-slate-600">
                  <li>• Výber kompatibilných komponentov</li>
                  <li>• Pomoc s digitálnym workflow</li>
                  <li>• Rýchla komunikácia cez e‑mail alebo telefón</li>
                </ul>
              </div>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* Kontakt */}
      <section
        id="kontakt"
        className="bg-slate-50 border-t border-slate-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24 grid lg:grid-cols-[minmax(0,1.1fr),minmax(0,1fr)] gap-10 lg:gap-16 items-start">
          <FadeInSection>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-700">
                Kontakt
              </p>
              <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900">
                Začnime spolupracovať na vašich prípadoch.
              </h2>
              <p className="mt-4 text-sm sm:text-base text-slate-700 max-w-xl">
                Napíšte mi pár viet o vašej praxi a typoch prípadov, ktoré riešite. Ozvem sa vám
                s návrhom spolupráce, termínmi školení a odporučením produktov.
              </p>

              <dl className="mt-6 space-y-4 text-sm text-slate-700">
                <div className="flex items-start gap-3">
                  <dt className="mt-0.5">
                    <PhoneIcon className="h-5 w-5 text-cyan-600" />
                  </dt>
                  <dd>
                    <p className="font-medium text-slate-900">Telefón</p>
                    <p className="text-slate-700">+421&nbsp;000&nbsp;000&nbsp;000</p>
                  </dd>
                </div>
                <div className="flex items-start gap-3">
                  <dt className="mt-0.5">
                    <EnvelopeIcon className="h-5 w-5 text-cyan-600" />
                  </dt>
                  <dd>
                    <p className="font-medium text-slate-900">E‑mail</p>
                    <p className="text-slate-700">info@dentaltechlab.sk</p>
                  </dd>
                </div>
                <div className="flex items-start gap-3">
                  <dt className="mt-0.5">
                    <MapPinIcon className="h-5 w-5 text-cyan-600" />
                  </dt>
                  <dd>
                    <p className="font-medium text-slate-900">Lokalita</p>
                    <p className="text-slate-700">Bratislava, Slovensko</p>
                  </dd>
                </div>
              </dl>
            </div>
          </FadeInSection>

          <FadeInSection delay={120}>
            <div className="relative">
              <div className="relative rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 lg:p-7 shadow-xl shadow-slate-200">
                <div className="absolute -top-10 -right-10 h-24 w-24 rounded-full bg-cyan-100 blur-3xl" />
                <div className="absolute bottom-0 -left-8 h-24 w-24 rounded-full bg-emerald-100 blur-3xl" />

                <h3 className="text-lg font-semibold text-slate-900">
                  Rýchla nezáväzná správa
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-700">
                  Formulár je zatiaľ ilustračný – po nasadení produkcie ho prepojíme
                  s vaším e‑mailom alebo CRM systémom.
                </p>

                <form
                  className="mt-6 space-y-4"
                  onSubmit={(e) => e.preventDefault()}
                >
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Meno a priezvisko / klinika
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                      placeholder="MUDr. Jana Nováková – zubná klinika"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        E‑mail
                      </label>
                      <input
                        type="email"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                        placeholder="vas@email.sk"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Telefón
                      </label>
                      <input
                        type="tel"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                        placeholder="+421…"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      O čo máte záujem?
                    </label>
                    <select
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Vyberte možnosť
                      </option>
                      <option>Spolupráca na laboratórnych prípadoch</option>
                      <option>Školenie / workshop</option>
                      <option>Pomoc s výberom komponentov</option>
                      <option>Iné</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Správa
                    </label>
                    <textarea
                      rows={4}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent resize-none"
                      placeholder="Stručne popíšte, čo by ste chceli riešiť – typ prípadu, termíny, očakávania."
                    />
                  </div>

                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/40 hover:shadow-emerald-500/40 transition-all hover:-translate-y-0.5"
                  >
                    Odoslať správu
                  </button>

                  <p className="text-[11px] text-slate-500 mt-1">
                    Odoslaním správy súhlasíte s kontaktovaním za účelom nezáväznej konzultácie.
                  </p>
                </form>
              </div>
            </div>
          </FadeInSection>
        </div>
      </section>
    </div>
  );
}

