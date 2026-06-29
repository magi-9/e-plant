import { Outlet, Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { getGlobalSettings } from '../api/settings';
import { getCompanyProfile } from '../utils/companyProfile';
import { getLandingHomeHref } from '../utils/landingLinks';
import Navbar from './Navbar';
import ScrollToTop from './ScrollToTop';

export default function ShopLayout() {
  const location = useLocation();
  const isProductsListPage = location.pathname === '/products';
  const { data: globalSettings, isLoading } = useQuery({
    queryKey: ['global-settings'],
    queryFn: getGlobalSettings,
  });
  const company = getCompanyProfile(globalSettings);
  const landingHomeHref = getLandingHomeHref();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: '#2196f3', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pt-16">
      <Helmet>
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="shortcut icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/dynamicabutment-logo.png" />
      </Helmet>
      <ScrollToTop />
      <Navbar />
      
      <main className="flex-1">
        <Outlet />
      </main>

      <footer className={`mt-auto text-slate-300 ${isProductsListPage ? 'lg:ml-60' : ''}`} style={{ background: '#0f1216', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-8 pb-8 border-b border-slate-800/70">
            <div className="flex items-center gap-3">
              <svg className="h-9 w-9 flex-shrink-0" fill="#2196f3" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
              </svg>
              <div>
                <p className="text-lg font-bold text-white tracking-wide">{company.companyName}</p>
                <a href={`mailto:${company.companyEmail}`} className="text-xs mt-0.5 hover:underline underline-offset-2" style={{ color: '#2196f3' }}>
                  {company.companyEmail}
                </a>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-12 gap-y-2.5 text-sm">
              <p className="col-span-2 text-[10px] uppercase tracking-[0.15em] font-semibold mb-1" style={{ color: '#8a93a0' }}>Informácie</p>
              <a href={landingHomeHref} className="text-slate-300/80 hover:text-white transition-colors">O nás</a>
              <Link to="/terms" className="text-slate-300/80 hover:text-white transition-colors">Obchodné podmienky</Link>
              <Link to="/privacy" className="text-slate-300/80 hover:text-white transition-colors">Ochrana osobných údajov</Link>
              <Link to="/complaints" className="text-slate-300/80 hover:text-white transition-colors">Reklamačný poriadok</Link>
              <Link to="/withdrawal" className="text-slate-300/80 hover:text-white transition-colors">Vrátenie tovaru</Link>
            </div>
          </div>
          <div className="pt-6 text-center text-xs text-slate-400/80">
            © {new Date().getFullYear()} {company.companyName} &mdash; Všetky práva vyhradené.
          </div>
        </div>
      </footer>
    </div>
  );
}
