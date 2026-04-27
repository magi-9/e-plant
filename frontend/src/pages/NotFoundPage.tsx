import { Link } from 'react-router-dom';
import { HomeIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function NotFoundPage() {
    return (
        <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 bg-slate-50">
            <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 sm:p-10 text-center shadow-sm">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-50">
                    <MagnifyingGlassIcon className="h-8 w-8 text-cyan-700" />
                </div>
                <p className="text-xs font-semibold tracking-[0.18em] text-cyan-700 uppercase">404</p>
                <h1 className="mt-2 text-3xl font-bold text-slate-900">Stránka sa nenašla</h1>
                <p className="mt-3 text-sm text-slate-600">
                    Odkaz je neplatný alebo stránka už neexistuje. Môžete sa vrátiť na produkty a pokračovať v nákupe.
                </p>
                <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 transition-colors"
                    >
                        <HomeIcon className="h-4 w-4" />
                        Späť na začiatok
                    </Link>
                    <Link
                        to="/products"
                        className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                        Zobraziť produkty
                    </Link>
                </div>
            </div>
        </div>
    );
}
