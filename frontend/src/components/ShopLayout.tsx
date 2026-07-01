import { Outlet, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { getGlobalSettings } from '../api/settings';
import { getCompanyProfile } from '../utils/companyProfile';
import { getLandingContactHref } from '../utils/landingLinks';
import Navbar from './Navbar';
import ScrollToTop from './ScrollToTop';
import ebringerLogoUrl from '../assets/logo-ebringer.png';

export default function ShopLayout() {
  const { data: globalSettings, isLoading } = useQuery({
    queryKey: ['global-settings'],
    queryFn: getGlobalSettings,
  });
  const company = getCompanyProfile(globalSettings);
  const landingContactHref = getLandingContactHref();
  const footerLinkStyle = { fontSize: 14, color: '#8a93a0', textDecoration: 'none' } as const;
  const footerHeadingStyle = { fontSize: 12, fontWeight: 700, letterSpacing: '.6px', color: '#fff', textTransform: 'uppercase', marginBottom: 16 } as const;
  const footerListStyle = { listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12, margin: 0, padding: 0 } as const;
  const legalLinks = [
    { label: 'Obchodné podmienky', to: '/terms' },
    { label: 'Ochrana osobných údajov', to: '/privacy' },
    { label: 'Reklamačný poriadok', to: '/complaints' },
    { label: 'Vrátenie tovaru', to: '/withdrawal' },
  ];
  const assortmentLinks = [
    { label: 'TiBase', type: 'tibase' },
    { label: 'Multi-Unit', type: 'multi_unit' },
    { label: 'Scanbody', type: 'scanbody' },
    { label: 'Analógy', type: 'analogs' },
    { label: 'Abutmenty', type: 'abutments' },
    { label: 'Nástroje', type: 'tools' },
  ];

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

      <footer style={{ marginTop: 64, background: '#0f1216', color: '#cbd2da', borderTop: '1px solid rgba(255,255,255,0.08)', fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif" }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', padding: '56px 32px 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 40, boxSizing: 'border-box' }}>
          <div style={{ maxWidth: 360 }}>
            <img src={ebringerLogoUrl} alt="Dental design studio Ebringer" style={{ width: 220, maxWidth: '100%', height: 'auto', display: 'block', background: '#fff', borderRadius: 10, padding: '10px 14px' }} />
            <p style={{ marginTop: 16, fontSize: 14, lineHeight: '22px', color: '#8a93a0' }}>Exkluzívny distribútor Dynamic Abutment Solutions pre Slovensko.</p>
            <Link to="/catalogs" style={{ display: 'inline-block', marginTop: 12, fontSize: 14, color: '#2196f3', fontWeight: 600, textDecoration: 'none' }}>Katalógy produktov</Link>
          </div>

          <div>
            <p style={footerHeadingStyle}>Sortiment</p>
            <ul style={footerListStyle}>
              {assortmentLinks.map(({ label, type }) => (
                <li key={type}>
                  <Link to={`/products?type=${type}`} style={footerLinkStyle} onMouseEnter={e => (e.currentTarget.style.color = '#fff')} onMouseLeave={e => (e.currentTarget.style.color = '#8a93a0')}>{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p style={footerHeadingStyle}>Dokumenty</p>
            <ul style={footerListStyle}>
              {legalLinks.map(item => (
                <li key={item.label}>
                  <Link to={item.to} style={footerLinkStyle} onMouseEnter={e => (e.currentTarget.style.color = '#fff')} onMouseLeave={e => (e.currentTarget.style.color = '#8a93a0')}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p style={footerHeadingStyle}>Kontakt</p>
            <ul style={footerListStyle}>
              <li><a href={landingContactHref} style={footerLinkStyle} onMouseEnter={e => (e.currentTarget.style.color = '#fff')} onMouseLeave={e => (e.currentTarget.style.color = '#8a93a0')}>O nás a kontakt</a></li>
              <li><a href={`mailto:${company.companyEmail}`} style={footerLinkStyle} onMouseEnter={e => (e.currentTarget.style.color = '#fff')} onMouseLeave={e => (e.currentTarget.style.color = '#8a93a0')}>{company.companyEmail}</a></li>
              <li style={{ fontSize: 14, color: '#8a93a0', lineHeight: '22px' }}>{company.companyName}</li>
            </ul>
          </div>
        </div>

        <div style={{ marginTop: 48, borderTop: '1px solid rgba(255,255,255,.08)' }}>
          <div style={{ maxWidth: 1440, margin: '0 auto', padding: '20px 32px', textAlign: 'center', fontSize: 13, color: '#6b7480', boxSizing: 'border-box' }}>
            © {new Date().getFullYear()} {company.companyName} — Všetky práva vyhradené.
          </div>
        </div>
      </footer>
    </div>
  );
}
