import { Outlet, Link, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import ScrollToTop from './ScrollToTop';

export default function ShopLayout() {
  const location = useLocation();
  const isProductsPage = location.pathname.startsWith('/products');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pt-16">
      <ScrollToTop />
      <Navbar />
      
      <main className="flex-1">
        <Outlet />
      </main>

      <footer className={`bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 border-t border-cyan-500/20 mt-auto text-slate-300 ${isProductsPage ? 'lg:ml-56' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-8 pb-8 border-b border-slate-800/70">
            <div className="flex items-center gap-3">
              <svg className="h-9 w-9 text-cyan-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
              </svg>
              <div>
                <p className="text-lg font-bold text-white tracking-wide">DentalTech Lab &amp; Academy</p>
                <p className="text-xs text-cyan-300/80 mt-0.5">Dentálne implantáty, školenia &amp; e‑shop</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-12 gap-y-2.5 text-sm">
              <p className="col-span-2 text-[10px] text-cyan-300/70 uppercase tracking-[0.15em] font-semibold mb-1">Právne informácie</p>
              <Link to="/terms" className="text-slate-300/80 hover:text-white transition-colors">Obchodné podmienky</Link>
              <Link to="/privacy" className="text-slate-300/80 hover:text-white transition-colors">Ochrana osobných údajov</Link>
              <Link to="/complaints" className="text-slate-300/80 hover:text-white transition-colors">Reklamačný poriadok</Link>
              <Link to="/withdrawal" className="text-slate-300/80 hover:text-white transition-colors">Odstúpenie od zmluvy</Link>
            </div>
          </div>
          <div className="pt-6 text-center text-xs text-slate-400/80">
            © {new Date().getFullYear()} DentalTech Lab &amp; Academy &mdash; Dentálne riešenia, školenia a e‑shop. Všetky práva vyhradené.
          </div>
        </div>
      </footer>
    </div>
  );
}
