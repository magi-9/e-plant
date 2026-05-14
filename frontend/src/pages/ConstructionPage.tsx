import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

export default function ConstructionPage() {
  return (
    <main className="min-h-screen bg-[#f7faf8] text-slate-950">
      <section className="mx-auto grid min-h-screen w-full max-w-7xl items-center gap-10 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,0.95fr),minmax(360px,0.75fr)] lg:gap-16 lg:py-12">
        <div className="space-y-8">
          <img
            src="/dynamicabutment-logo.png"
            alt="Dynamic Abutment Solutions"
            className="h-14 w-auto"
          />

          <div className="space-y-5">
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white px-4 py-2 text-sm font-semibold text-cyan-800 shadow-sm">
              <ClockIcon className="h-5 w-5" />
              Pripravujeme novú hlavnú stránku
            </p>

            <h1 className="max-w-3xl text-4xl font-black leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Stránka sa dokončuje. E-shop je otvorený.
            </h1>

            <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Úvodnú stránku ešte ladíme, aby bola jednoduchšia a prehľadnejšia. Sortiment,
              objednávky aj zákaznícka zóna fungujú bez obmedzenia.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              to="/products"
              className="inline-flex min-h-14 items-center justify-center gap-3 rounded-lg bg-cyan-700 px-6 py-4 text-base font-bold text-white shadow-lg shadow-cyan-900/15 transition hover:bg-cyan-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2"
            >
              Prejsť do e-shopu
              <ArrowRightIcon className="h-5 w-5" />
            </Link>

            <p className="inline-flex items-center gap-2 text-sm font-medium text-slate-600">
              <CheckCircleIcon className="h-5 w-5 text-emerald-600" />
              E-shop funguje normálne aj počas úprav.
            </p>
          </div>
        </div>

        <div className="relative">
          <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Dynamic Abutment Solutions</p>
                  <p className="text-xl font-black text-slate-950">E-shop dostupný</p>
                </div>
                <div className="rounded-lg bg-cyan-50 p-3 text-cyan-700">
                  <ShoppingBagIcon className="h-7 w-7" />
                </div>
              </div>
            </div>

            <div className="grid gap-px bg-slate-100 sm:grid-cols-2">
              {[
                ['Produkty', 'Komponenty pripravené na objednanie'],
                ['Objednávky', 'Košík aj checkout zostávajú aktívne'],
                ['Účet', 'Prihlásenie a história objednávok fungujú'],
                ['Podpora', 'Kontaktné údaje sú dostupné v e-shope'],
              ].map(([title, text]) => (
                <div key={title} className="bg-white p-5">
                  <p className="text-sm font-bold text-slate-950">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
                </div>
              ))}
            </div>

            <div className="bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-800">
              Bez čakania môžete pokračovať priamo do katalógu produktov.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
