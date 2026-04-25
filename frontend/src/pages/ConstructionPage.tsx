import {
  ArrowRightIcon,
  BuildingOffice2Icon,
  SparklesIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

const floorWindows = [
  ['bg-amber-200/90', 'bg-amber-100/90', 'bg-amber-300/90', 'bg-amber-100/90'],
  ['bg-sky-200/90', 'bg-sky-100/90', 'bg-sky-300/90', 'bg-sky-100/90'],
  ['bg-emerald-200/90', 'bg-emerald-100/90', 'bg-emerald-300/90', 'bg-emerald-100/90'],
];

export default function ConstructionPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.2),_transparent_38%),linear-gradient(180deg,_#0f172a_0%,_#111827_52%,_#020617_100%)] text-slate-50">
      <div className="absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-cyan-400/10 via-transparent to-transparent" />
        <div className="absolute -left-16 top-20 h-56 w-56 rounded-full bg-amber-300/10 blur-3xl" />
        <div className="absolute -right-12 bottom-16 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950 to-transparent" />
      </div>

      <section className="relative mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.1fr),minmax(0,0.9fr)] lg:gap-16">
          <div className="space-y-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100 backdrop-blur-sm">
              <WrenchScrewdriverIcon className="h-4 w-4 text-cyan-300" />
              Stránku ešte dokončujeme
            </span>

            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                Táto stránka je stále vo výstavbe.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                Na hlavnej stránke ešte pracujeme, aby bola pripravená v plnej kvalite. Ak však
                chcete pokračovať do e-shopu, kliknite na tlačidlo nižšie a môžete nakupovať hneď.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/products"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400 px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_40px_rgba(34,211,238,0.25)] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(34,211,238,0.32)] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                Prejsť do e-shopu
                <ArrowRightIcon className="h-5 w-5" />
              </Link>

              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 backdrop-blur-sm">
                <SparklesIcon className="h-5 w-5 text-amber-300" />
                E-shop funguje normálne aj počas úprav.
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
                  Stav projektu
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Doladujeme obsah, vizuál a detailné informácie, aby bol web pripravený na ostré
                  spustenie.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
                  Rýchly vstup
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Kliknutím na tlačidlo sa dostanete priamo do e-shopu bez čakania na dokončenie
                  úvodnej stránky.
                </p>
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute left-1/2 top-0 h-1 w-64 -translate-x-1/2 rounded-full bg-amber-300/80 shadow-[0_0_20px_rgba(253,224,71,0.35)] animate-[crane-swing_4.5s_ease-in-out_infinite]" />
            <div className="absolute left-1/2 top-1 h-56 w-px -translate-x-1/2 bg-gradient-to-b from-amber-200/90 via-amber-200/40 to-transparent" />
            <div className="absolute left-1/2 top-40 flex -translate-x-1/2 items-end gap-2 animate-[lift_4.5s_ease-in-out_infinite]">
              <div className="h-8 w-8 rounded-md bg-amber-300 shadow-lg shadow-amber-300/40" />
              <div className="h-5 w-12 rounded-md bg-slate-200/90 shadow-lg shadow-slate-900/20" />
            </div>

            <div className="relative mt-20 rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-[0_30px_80px_rgba(15,23,42,0.45)] backdrop-blur-sm sm:p-6">
              <div className="absolute inset-x-8 top-6 h-px bg-white/10" />
              <div className="absolute inset-y-10 left-8 w-px bg-white/10" />
              <div className="absolute inset-y-10 right-8 w-px bg-white/10" />

              <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/90">
                      Stavba e-shopu
                    </p>
                    <p className="mt-1 text-lg font-bold text-white">
                      Pracujeme na novej hlavnej stránke
                    </p>
                  </div>

                  <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-3 text-cyan-100">
                    <BuildingOffice2Icon className="h-7 w-7" />
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-[1.4rem] border border-white/10 bg-gradient-to-b from-slate-800/90 to-slate-900/95 p-4">
                    <div className="flex items-end gap-2">
                      <div className="h-28 w-full rounded-t-2xl border border-white/10 bg-gradient-to-b from-cyan-400/20 via-slate-700 to-slate-900 p-3 shadow-inner shadow-black/20">
                        <div className="grid h-full grid-cols-4 gap-2">
                          {floorWindows.map((row, rowIndex) => (
                            <div key={rowIndex} className="flex flex-col gap-2">
                              {row.map((windowClass, windowIndex) => (
                                <span
                                  key={windowIndex}
                                  className={`aspect-square rounded-md border border-white/10 ${windowClass} ${
                                    rowIndex === 0 && windowIndex === 1
                                      ? 'animate-[float-slow_5s_ease-in-out_infinite]'
                                      : 'animate-pulse'
                                  }`}
                                  style={{ animationDelay: `${rowIndex * 180 + windowIndex * 140}ms` }}
                                />
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="h-36 w-4 rounded-t-full bg-gradient-to-b from-amber-300 via-amber-400 to-amber-700 shadow-[0_0_24px_rgba(251,191,36,0.35)]" />
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
                      <span>Výstavba</span>
                      <span>Vizuál sa ladí</span>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between gap-3 rounded-[1.4rem] border border-white/10 bg-white/5 p-4 text-slate-200">
                    <div className="rounded-2xl border border-cyan-300/15 bg-cyan-400/10 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
                        Pre zákazníkov
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-200">
                        E-shop, objednávky aj ostatné stránky bežia ďalej. Táto stránka je len dočasná.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-3">
                        <p className="text-xs text-slate-400">Dizajn</p>
                        <p className="mt-1 text-sm font-semibold text-white">Dokončovanie</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-3">
                        <p className="text-xs text-slate-400">E-shop</p>
                        <p className="mt-1 text-sm font-semibold text-emerald-300">Plne dostupný</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}