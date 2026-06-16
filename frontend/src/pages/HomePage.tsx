import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useEffect, useState, type CSSProperties } from 'react';

const C = {
  bg: '#eef3f3',
  surface: '#ffffff',
  ink: '#173842',
  body: '#4d6168',
  teal: '#1a8a9b',
  tealDk: '#0f6675',
  tealSoft: '#e2f0f1',
  line: '#dde7e7',
  peach: '#f4d8c4',
  lav: '#e0d8ec',
  sky: '#cfe1ee',
  butter: '#f4e6bd',
};

function Arrow({ stroke = '#fff', size = 15 }: { stroke?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function ServiceCard({ accent, title, lines }: { accent: string; title: string; lines: string[] }) {
  return (
    <div className="home-service-card" style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 18, padding: '26px 26px 24px', display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 1px 2px rgba(23,56,66,0.03)' }}>
      <div style={{ width: 42, height: 42, borderRadius: 12, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ width: 14, height: 14, borderRadius: 4, background: C.surface, opacity: 0.92 }} />
      </div>
      <h3 style={{ fontFamily: 'Marcellus, serif', fontSize: 22, lineHeight: 1.15, color: C.ink, fontWeight: 400, margin: 0 }}>{title}</h3>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
        {lines.map((l, i) => (
          <li key={i} style={{ display: 'flex', gap: 9, fontSize: 14, color: C.body, lineHeight: 1.45 }}>
            <span style={{ marginTop: 8, width: 5, height: 5, borderRadius: '50%', background: C.teal, flexShrink: 0 }} />
            <span>{l}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReasonCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="home-service-card" style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 18, padding: '24px 24px 22px', boxShadow: '0 1px 2px rgba(23,56,66,0.03)' }}>
      <h3 style={{ fontFamily: 'Marcellus, serif', fontSize: 22, lineHeight: 1.15, color: C.ink, fontWeight: 400, margin: 0 }}>{title}</h3>
      <p style={{ margin: '12px 0 0', fontSize: 14.5, lineHeight: 1.55, color: C.body }}>{text}</p>
    </div>
  );
}

const SERVICES = [
  { accent: C.teal, title: 'Zubná technika a laboratórne služby', lines: ['Korunky a mostíky', 'Implantoprotetické práce', 'Celokeramické rekonštrukcie', 'Zirkónové práce', 'Hybridné mostíky', 'Teleskopické práce', 'Snímateľné náhrady', 'Individuálne CAD/CAM riešenia'] },
  { accent: '#7c93c4', title: 'Digitálna implantoprotetika', lines: ['Dynamic Ti-Base® komponenty', 'Protetické skrutky', 'CAD/CAM komponenty', 'Príslušenstvo pre implantáty'] },
  { accent: '#d29a76', title: 'Technická podpora a poradenstvo', lines: ['Výber vhodných komponentov', 'Návrh protetických riešení', 'CAD/CAM workflow', 'Implantoprotetické rekonštrukcie', 'Riešenie komplikovaných prípadov'] },
  { accent: '#5aa6b0', title: 'Školenia a workshopy', lines: ['Digitálny návrh rozsiahlych prác', 'Práca v 3Shape Dental System', 'Efektívnejší laboratórny workflow', 'Praktické školenia pre pokročilých technikov'] },
];

const ABOUT_PARAGRAPHS = [
  'Spoločnosť Martin Ebringer s.r.o. spája dlhoročné skúsenosti v oblasti zubnej techniky s modernými digitálnymi riešeniami pre implantoprotetiku.',
  'Už viac ako 25 rokov pôsobíme v oblasti zubnej techniky a dentálnych laboratórnych služieb, počas ktorých sme získali rozsiahle skúsenosti s výrobou protetických prác, implantoprotetikou, CAD/CAM technológiami a digitálnymi pracovnými postupmi.',
  'Každodenná spolupráca so zubnými lekármi a klinikami nám umožňuje rozumieť reálnym potrebám modernej stomatologickej praxe.',
  'Na základe týchto skúseností sme rozšírili naše pôsobenie aj o distribúciu špičkových protetických komponentov a digitálnych riešení pre zubné laboratóriá a stomatologické pracoviská.',
];

const WHY_CHOOSE = [
  { title: '25 rokov skúseností v zubnej technike', text: 'Nie sme len predajca komponentov. Produkty, ktoré ponúkame, poznáme z každodennej laboratórnej praxe a dlhoročnej spolupráce so stomatológmi.' },
  { title: 'Odbornosť založená na praxi', text: 'Rozumieme potrebám zubných lekárov aj dentálnych technikov, pretože sa implantoprotetike venujeme profesionálne už viac ako dve desaťročia.' },
  { title: 'Moderné digitálne technológie', text: 'Využívame CAD/CAM technológie a podporujeme digitálne workflow od plánovania až po finálnu protetickú rekonštrukciu.' },
  { title: 'Individuálny prístup', text: 'Každý prípad posudzujeme individuálne a pomáhame nájsť optimálne riešenie pre konkrétnu klinickú situáciu.' },
];

const STATS: [string, string][] = [
  ['25+', 'rokov v zubnej technike'],
  ['Dynamic Ti-Base®', 'originálne komponenty'],
  ['CAD/CAM', 'digitálny workflow'],
  ['Bratislava', 'vlastné laboratórium'],
];

const DESKTOP_NAV_LINKS: [string, string][] = [
  ['Domov', '#d-top'],
  ['Služby', '#d-services'],
  ['Kontakt', '#d-contact'],
];

const MAPS_URL = 'https://www.google.com/maps/search/?api=1&query=%C5%A0tefana%20Kr%C3%A1lika%201%2FC%2C%20Bratislava';

function useActiveDesktopSection() {
  const [activeSection, setActiveSection] = useState('d-top');

  useEffect(() => {
    const sectionIds = ['d-top', 'd-services', 'd-about', 'd-contact'];
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => Boolean(section));

    if (!sections.length) {
      return undefined;
    }

    const updateForScrollEnd = () => {
      const scrollBottom = window.innerHeight + window.scrollY;
      const documentHeight = document.documentElement.scrollHeight;
      if (documentHeight - scrollBottom < 120) {
        setActiveSection('d-contact');
        return true;
      }
      return false;
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (updateForScrollEnd()) {
          return;
        }
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible?.target.id) {
          setActiveSection(visible.target.id);
        }
      },
      {
        rootMargin: '-35% 0px -45% 0px',
        threshold: [0.08, 0.18, 0.32, 0.48, 0.64],
      },
    );

    sections.forEach((section) => observer.observe(section));
    window.addEventListener('scroll', updateForScrollEnd, { passive: true });
    updateForScrollEnd();

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', updateForScrollEnd);
    };
  }, []);

  return activeSection;
}

function HomeMotionStyles() {
  return (
    <style>{`
      html {
        scroll-behavior: smooth;
      }

      .home-nav-link {
        position: relative;
        display: inline-flex;
        align-items: center;
        min-height: 42px;
        padding: 0 3px;
        transition: color 180ms ease, transform 180ms ease;
      }

      .home-nav-link::after {
        content: "";
        position: absolute;
        left: 0;
        right: 0;
        bottom: 2px;
        height: 2px;
        border-radius: 999px;
        background: ${C.teal};
        transform: scaleX(0);
        transform-origin: left;
        transition: transform 220ms ease;
      }

      .home-nav-link:hover,
      .home-nav-link:focus-visible,
      .home-nav-link.is-active {
        color: ${C.ink} !important;
        transform: translateY(-1px);
      }

      .home-nav-link:hover::after,
      .home-nav-link:focus-visible::after,
      .home-nav-link.is-active::after {
        transform: scaleX(1);
      }

      .home-cta,
      .home-map-link,
      .home-service-card,
      .home-stat,
      .home-mobile-link,
      .home-mobile-card,
      .home-portrait-card {
        transition: transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease, background 220ms ease;
      }

      .home-cta:hover,
      .home-cta:focus-visible,
      .home-map-link:hover,
      .home-map-link:focus-visible {
        transform: translateY(-2px);
        box-shadow: 0 16px 34px rgba(26,138,155,0.28) !important;
      }

      .home-service-card:hover,
      .home-mobile-card:hover {
        transform: translateY(-6px);
        border-color: rgba(26,138,155,0.35) !important;
        box-shadow: 0 18px 38px rgba(23,56,66,0.12) !important;
      }

      .home-stat:hover {
        background: ${C.tealSoft};
        transform: translateY(-3px);
      }

      .home-mobile-link:hover,
      .home-mobile-link:focus-visible {
        background: ${C.tealSoft};
        padding-left: 14px !important;
      }

      .home-portrait-card:hover {
        transform: translateY(-4px) rotate(-0.4deg);
        box-shadow: 0 22px 42px rgba(23,56,66,0.18) !important;
      }

      .home-float-soft {
        animation: homeFloatSoft 7s ease-in-out infinite;
      }

      .home-float-slow {
        animation: homeFloatSlow 9s ease-in-out infinite;
      }

      .home-orbit {
        animation: homeOrbit 12s linear infinite;
      }

      .home-sheen::before {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(110deg, transparent 0%, rgba(255,255,255,0.34) 42%, transparent 62%);
        transform: translateX(-120%);
        animation: homeSheen 5.5s ease-in-out infinite;
        pointer-events: none;
      }

      @keyframes homeFloatSoft {
        0%, 100% { transform: translate3d(0, 0, 0); }
        50% { transform: translate3d(0, -14px, 0); }
      }

      @keyframes homeFloatSlow {
        0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
        50% { transform: translate3d(10px, -10px, 0) rotate(2deg); }
      }

      @keyframes homeOrbit {
        from { transform: rotate(0deg) translateX(8px) rotate(0deg); }
        to { transform: rotate(360deg) translateX(8px) rotate(-360deg); }
      }

      @keyframes homeSheen {
        0%, 42% { transform: translateX(-120%); }
        62%, 100% { transform: translateX(120%); }
      }

      @media (prefers-reduced-motion: reduce) {
        html {
          scroll-behavior: auto;
        }

        .home-float-soft,
        .home-float-slow,
        .home-orbit,
        .home-sheen::before {
          animation: none;
        }

        .home-nav-link,
        .home-cta,
        .home-map-link,
        .home-service-card,
        .home-stat,
        .home-mobile-link,
        .home-mobile-card,
        .home-portrait-card {
          transition: none;
        }
      }
    `}</style>
  );
}

// ──────────────────────────────────────────────
// DESKTOP LAYOUT (≥1024 px)
// ──────────────────────────────────────────────
function DesktopHome() {
  const activeSection = useActiveDesktopSection();
  const wrap: CSSProperties = { background: C.bg, fontFamily: 'Mulish, sans-serif', color: C.ink };
  const inner: CSSProperties = { maxWidth: 1440, margin: '0 auto', padding: '0 64px' };

  return (
    <div style={wrap}>
      <Helmet>
        <link rel="icon" type="image/x-icon" href="/favico2.ico" />
        <link rel="shortcut icon" type="image/x-icon" href="/favico2.ico" />
      </Helmet>
      <HomeMotionStyles />
      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, height: 90, background: 'rgba(255,255,255,0.76)', borderBottom: `1px solid ${C.line}`, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div style={{ ...inner, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <img src="/uploads/logo-clean.png" alt="Dental design studio Ebringer" style={{ height: 50 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 34 }}>
            {DESKTOP_NAV_LINKS.map(([label, href], i) => (
              <a
                key={label}
                className={`home-nav-link ${href === `#${activeSection}` ? 'is-active' : ''}`}
                href={href}
                style={{ fontSize: 14.5, fontWeight: i === 0 ? 700 : 500, color: href === `#${activeSection}` ? C.ink : C.body, textDecoration: 'none' }}
              >
                {label}
              </a>
            ))}
            <Link className="home-cta" to="/products" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '11px 22px', borderRadius: 999, background: C.teal, color: '#fff', fontSize: 14.5, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', boxShadow: '0 6px 18px rgba(26,138,155,0.28)' }}>
              E-shop <Arrow />
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section id="d-top" style={{ padding: '90px 64px 0', position: 'relative', scrollMarginTop: 110 }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 56, paddingTop: 40, paddingBottom: 10, position: 'relative' }}>
          <div className="home-float-slow" style={{ position: 'absolute', top: 60, right: 380, width: 300, height: 300, borderRadius: '50%', background: `radial-gradient(circle at 30% 30%, ${C.peach}, transparent 70%)`, opacity: 0.5, filter: 'blur(6px)', pointerEvents: 'none' }} />
          <div style={{ width: 640, flexShrink: 0, position: 'relative', zIndex: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 22 }}>
              <img src="/uploads/tooth-icon.png" alt="" style={{ height: 26 }} />
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.teal }}>Dental design studio Ebringer</span>
            </div>
            <h1 style={{ fontFamily: 'Marcellus, serif', fontWeight: 400, fontSize: 62, lineHeight: 1.05, letterSpacing: '-0.01em', color: C.ink, margin: '0 0 24px' }}>
              Viac ako 25 rokov<br />skúseností v <span style={{ color: C.teal, fontStyle: 'italic' }}>zubnej technike</span>
            </h1>
            <p style={{ fontSize: 19, lineHeight: 1.6, color: C.body, margin: '0 0 30px', maxWidth: 560 }}>
              Moderné digitálne riešenia pre implantoprotetiku, CAD/CAM výrobu a zubné laboratóriá.
            </p>
            <p style={{ fontSize: 13.5, color: C.body, letterSpacing: '0.01em', margin: 0 }}>
              Originálne komponenty <b style={{ color: C.ink }}>Dynamic Ti-Base®</b> · Laboratórne služby · Technická podpora · Digitálna stomatológia
            </p>
          </div>

          <div style={{ flex: 1, height: 520, position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <div className="home-sheen" style={{ position: 'absolute', bottom: 0, width: 420, height: 460, borderRadius: '210px 210px 28px 28px', background: `linear-gradient(160deg, ${C.tealSoft}, ${C.sky})`, overflow: 'hidden' }}>
              <div className="home-float-soft" style={{ position: 'absolute', top: 34, left: 34, right: 34, height: 120, borderRadius: 999, background: `linear-gradient(90deg, ${C.butter}, ${C.peach}, ${C.lav})`, opacity: 0.45 }} />
              <span className="home-orbit" style={{ position: 'absolute', top: 170, right: 34, width: 18, height: 18, borderRadius: '50%', background: C.teal, opacity: 0.18 }} />
              <span className="home-float-slow" style={{ position: 'absolute', bottom: 88, left: 46, width: 26, height: 26, borderRadius: 9, background: C.peach, opacity: 0.56 }} />
            </div>
            <img src="/uploads/martin-portrait.png" alt="Bc. Martin Ebringer" style={{ position: 'relative', height: 512, objectFit: 'contain', zIndex: 2, filter: 'drop-shadow(0 24px 40px rgba(23,56,66,0.18))' }} />
            <div className="home-portrait-card" style={{ position: 'absolute', bottom: 46, left: 18, zIndex: 3, background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(6px)', borderRadius: 16, padding: '14px 20px', boxShadow: '0 14px 34px rgba(23,56,66,0.16)', border: `1px solid ${C.line}` }}>
              <p style={{ margin: 0, fontFamily: 'Marcellus, serif', fontSize: 20, color: C.ink }}>Bc. Martin Ebringer</p>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section style={{ padding: '24px 64px' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 20, display: 'flex', alignItems: 'center', padding: '0', boxShadow: '0 1px 2px rgba(23,56,66,0.03)' }}>
            {STATS.map(([a, b], i) => (
              <div className="home-stat" key={i} style={{ flex: 1, padding: '28px 30px', borderLeft: i ? `1px solid ${C.line}` : 'none' }}>
                <p style={{ margin: 0, fontFamily: 'Marcellus, serif', fontSize: 26, color: C.teal, lineHeight: 1 }}>{a}</p>
                <p style={{ margin: '7px 0 0', fontSize: 14, color: C.body }}>{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="d-services" style={{ padding: '40px 64px 0', scrollMarginTop: 110 }}>
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.teal }}>Čo ponúkame</span>
              <h2 style={{ fontFamily: 'Marcellus, serif', fontWeight: 400, fontSize: 40, color: C.ink, margin: '12px 0 0', lineHeight: 1.1 }}>
                Komplexné riešenia pre modernú stomatológiu
              </h2>
            </div>
            <p style={{ maxWidth: 330, fontSize: 14.5, color: C.body, lineHeight: 1.55, margin: 0 }}>
              Ponúkame produkty a služby, ktorým sami dôverujeme a používame ich v každodennej laboratórnej praxi.
            </p>
          </div>
          <p style={{ maxWidth: 760, fontSize: 15, lineHeight: 1.65, color: C.body, margin: '0 0 24px' }}>
            Pri výrobe využívame moderné digitálne technológie, intraorálne skeny a CAD/CAM výrobné procesy, ktoré zabezpečujú vysokú presnosť a predvídateľné výsledky.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {SERVICES.map((s) => <ServiceCard key={s.title} {...s} />)}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="d-about" style={{ padding: '56px 64px 0', scrollMarginTop: 110 }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', borderRadius: 24, overflow: 'hidden', display: 'flex', background: C.surface, border: `1px solid ${C.line}` }}>
          <div style={{ width: 440, flexShrink: 0 }}>
            <img src="/uploads/smile.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ flex: 1, padding: '44px 52px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.teal, marginBottom: 14 }}>O nás</span>
            <h2 style={{ fontFamily: 'Marcellus, serif', fontWeight: 400, fontSize: 38, lineHeight: 1.12, color: C.ink, margin: '0 0 18px' }}>Spoločnosť Martin Ebringer s.r.o.</h2>
            {ABOUT_PARAGRAPHS.map((text) => (
              <p key={text} style={{ margin: '0 0 12px', fontSize: 15.5, lineHeight: 1.62, color: C.body }}>{text}</p>
            ))}
            <p style={{ margin: '8px 0 0', padding: '16px 18px', background: C.tealSoft, borderLeft: `3px solid ${C.teal}`, borderRadius: '0 14px 14px 0', color: C.ink, fontSize: 15.5, fontStyle: 'italic', lineHeight: 1.5 }}>
              Našou prioritou je ponúkať produkty a služby, ktorým sami dôverujeme a ktoré využívame v každodennej laboratórnej praxi.
            </p>
          </div>
        </div>
      </section>

      {/* WHY */}
      <section style={{ padding: '48px 64px 0' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.teal }}>Prečo si vybrať nás</span>
          <h2 style={{ fontFamily: 'Marcellus, serif', fontWeight: 400, fontSize: 40, color: C.ink, margin: '12px 0 26px', lineHeight: 1.1 }}>
            Prax, technológie a individuálny prístup
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
            {WHY_CHOOSE.map((item) => <ReasonCard key={item.title} {...item} />)}
          </div>
        </div>
      </section>

      {/* ESHOP CTA */}
      <section style={{ padding: '40px 64px 0' }}>
        <div className="home-sheen" style={{ maxWidth: 1440, margin: '0 auto', borderRadius: 24, padding: '0 56px', position: 'relative', overflow: 'hidden', background: `linear-gradient(120deg, ${C.tealDk}, ${C.teal})`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 240 }}>
          <div style={{ position: 'absolute', right: -40, top: -60, width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle at 40% 40%, rgba(255,255,255,0.18), transparent 70%)' }} />
          <div style={{ position: 'relative', zIndex: 2 }}>
            <img src="/uploads/das-logo-v2.png" alt="Dynamic Abutment Solutions" style={{ height: 54, borderRadius: 11, marginBottom: 14, boxShadow: '0 10px 26px rgba(0,0,0,0.18)' }} />
            <span style={{ display: 'block', fontSize: 13, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)' }}>E-shop pre laboratóriá a ambulancie</span>
            <h2 style={{ fontFamily: 'Marcellus, serif', fontWeight: 400, fontSize: 38, color: '#fff', margin: '14px 0 0', lineHeight: 1.1 }}>
              Originálne komponenty Dynamic&nbsp;Ti-Base®
            </h2>
            <p style={{ margin: '12px 0 0', fontSize: 15.5, color: 'rgba(255,255,255,0.82)' }}>Skladom · overené v praxi · s technickou podporou priamo od technika.</p>
          </div>
          <Link className="home-cta" to="/products" style={{ position: 'relative', zIndex: 2, display: 'inline-flex', alignItems: 'center', gap: 11, padding: '17px 32px', borderRadius: 999, background: '#fff', color: C.tealDk, fontSize: 16.5, fontWeight: 800, textDecoration: 'none', whiteSpace: 'nowrap', boxShadow: '0 14px 30px rgba(0,0,0,0.18)', flexShrink: 0 }}>
            Otvoriť e-shop
            <Arrow stroke={C.tealDk} size={18} />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="d-contact" style={{ padding: '48px 64px 32px', borderTop: `1px solid ${C.line}`, marginTop: 56, scrollMarginTop: 110 }}>
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
            <div>
              <img src="/uploads/logo-clean.png" alt="" style={{ height: 44, marginBottom: 14 }} />
              <p style={{ fontSize: 13.5, color: C.body, margin: 0, maxWidth: 300, lineHeight: 1.5 }}>Martin Ebringer s.r.o. — zubná technika, digitálna implantoprotetika a CAD/CAM riešenia.</p>
            </div>
            <div style={{ display: 'flex', gap: 64 }}>
              <div>
                <p style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.teal, margin: '0 0 12px' }}>Kde nás nájdete</p>
                <p style={{ fontSize: 14, color: C.ink, margin: 0, lineHeight: 1.6 }}>Dental design studio Ebringer<br />Štefana Králika 1/C, Bratislava</p>
                <a
                  className="home-map-link"
                  href={MAPS_URL}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 12, padding: '9px 13px', borderRadius: 999, background: C.tealSoft, color: C.tealDk, fontSize: 13, fontWeight: 800, textDecoration: 'none', border: `1px solid rgba(26,138,155,0.18)`, boxShadow: '0 6px 18px rgba(23,56,66,0.06)' }}
                >
                  Zobraziť na mape
                  <Arrow stroke={C.tealDk} size={14} />
                </a>
              </div>
              <div>
                <p style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.teal, margin: '0 0 12px' }}>Kontakt</p>
                <p style={{ fontSize: 14, color: C.ink, margin: 0, lineHeight: 1.6 }}>
                  <a href="mailto:info@ebringer.sk" style={{ color: C.ink, textDecoration: 'none' }}>info@ebringer.sk</a><br />
                  <a href="tel:+421903428948" style={{ color: C.ink, textDecoration: 'none' }}>+421 903 428 948</a>
                </p>
              </div>
            </div>
          </div>
          <div style={{ paddingTop: 22, borderTop: `1px solid ${C.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 12.5, color: C.body }}>© 2026 Martin Ebringer s.r.o. — Všetky práva vyhradené.</span>
            <span style={{ fontSize: 12.5, color: C.body }}>Dynamic Ti-Base® · Laboratórne služby · Technická podpora · Digitálna stomatológia</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ──────────────────────────────────────────────
// MOBILE LAYOUT (<1024 px)
// ──────────────────────────────────────────────
function MobileServiceCard({ accent, title, lines }: { accent: string; title: string; lines: string[] }) {
  return (
    <div className="home-mobile-card" style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 18, padding: '22px 20px 20px', display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 1px 2px rgba(23,56,66,0.03)' }}>
      <div style={{ width: 40, height: 40, borderRadius: 11, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ width: 13, height: 13, borderRadius: 4, background: '#fff', opacity: 0.92 }} />
      </div>
      <h3 style={{ fontFamily: 'Marcellus, serif', fontSize: 21, lineHeight: 1.15, color: C.ink, fontWeight: 400, margin: 0 }}>{title}</h3>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
        {lines.map((l, i) => (
          <li key={i} style={{ display: 'flex', gap: 9, fontSize: 14.5, color: C.body, lineHeight: 1.45 }}>
            <span style={{ marginTop: 8, width: 5, height: 5, borderRadius: '50%', background: C.teal, flexShrink: 0 }} />
            <span>{l}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MobileHome() {
  const [menu, setMenu] = useState(false);
  const links: [string, string][] = [['Domov', '#m-top'], ['Služby', '#m-svc'], ['Kontakt', '#m-foot']];

  return (
    <div style={{ width: '100%', background: C.bg, fontFamily: 'Mulish, sans-serif', color: C.ink, overflowX: 'hidden' }} id="m-top">
      <Helmet>
        <link rel="icon" type="image/x-icon" href="/favico2.ico" />
        <link rel="shortcut icon" type="image/x-icon" href="/favico2.ico" />
      </Helmet>
      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, height: 64, padding: '0 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.86)', borderBottom: `1px solid ${C.line}`, backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
        <img src="/uploads/logo-clean.png" alt="Dental design studio Ebringer" style={{ height: 38 }} />
        <button
          onClick={() => setMenu((m) => !m)}
          aria-label="Menu"
          style={{ width: 44, height: 44, borderRadius: 12, border: `1px solid ${C.line}`, background: '#fff', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ width: 18, height: 2, borderRadius: 2, background: C.ink, transition: '.2s', transform: menu ? (i === 0 ? 'translateY(6px) rotate(45deg)' : i === 2 ? 'translateY(-6px) rotate(-45deg)' : 'scaleX(0)') : 'none' }} />
          ))}
        </button>
      </nav>

      {/* MENU drawer */}
      {menu && (
        <div style={{ position: 'fixed', top: 64, left: 0, right: 0, zIndex: 49, background: '#fff', borderBottom: `1px solid ${C.line}`, padding: '10px 18px 18px', display: 'flex', flexDirection: 'column', gap: 2, boxShadow: '0 14px 30px rgba(23,56,66,0.10)' }}>
          {links.map(([l, h]) => (
            <a className="home-mobile-link" key={l} href={h} onClick={() => setMenu(false)} style={{ padding: '12px 6px', fontSize: 16, fontWeight: 600, color: C.ink, textDecoration: 'none', borderBottom: `1px solid ${C.bg}` }}>{l}</a>
          ))}
          <Link className="home-cta" to="/products" onClick={() => setMenu(false)} style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', borderRadius: 12, background: C.teal, color: '#fff', fontSize: 15.5, fontWeight: 700, textDecoration: 'none' }}>
            E-shop <Arrow />
          </Link>
        </div>
      )}

      {/* HERO */}
      <section style={{ padding: '98px 20px 0', position: 'relative', overflow: 'hidden' }}>
        <div className="home-float-slow" style={{ position: 'absolute', top: 20, right: -40, width: 220, height: 220, borderRadius: '50%', background: `radial-gradient(circle at 30% 30%, ${C.peach}, transparent 70%)`, opacity: 0.55, filter: 'blur(6px)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16, position: 'relative' }}>
          <img src="/uploads/tooth-icon.png" alt="" style={{ height: 22 }} />
          <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.teal }}>Dental design studio Ebringer</span>
        </div>
        <h1 style={{ fontFamily: 'Marcellus, serif', fontWeight: 400, fontSize: 38, lineHeight: 1.08, letterSpacing: '-0.01em', color: C.ink, margin: '0 0 18px', position: 'relative' }}>
          Viac ako 25 rokov skúseností v <span style={{ color: C.teal, fontStyle: 'italic' }}>zubnej technike</span>
        </h1>
        <p style={{ fontSize: 16.5, lineHeight: 1.6, color: C.body, margin: '0 0 24px', position: 'relative' }}>
          Moderné digitálne riešenia pre implantoprotetiku, CAD/CAM výrobu a zubné laboratóriá.
        </p>
        <p style={{ fontSize: 13, color: C.body, margin: '4px 0 0', position: 'relative' }}>
          Originálne komponenty <b style={{ color: C.ink }}>Dynamic Ti-Base®</b> · Laboratórne služby · Technická podpora · Digitálna stomatológia
        </p>

        <div style={{ position: 'relative', height: 430, marginTop: 18, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div className="home-sheen" style={{ position: 'absolute', bottom: 0, width: 300, height: 360, borderRadius: '150px 150px 24px 24px', background: `linear-gradient(160deg, ${C.tealSoft}, ${C.sky})`, overflow: 'hidden' }}>
            <div className="home-float-soft" style={{ position: 'absolute', top: 26, left: 26, right: 26, height: 90, borderRadius: 999, background: `linear-gradient(90deg, ${C.butter}, ${C.peach}, ${C.lav})`, opacity: 0.45 }} />
            <span className="home-orbit" style={{ position: 'absolute', top: 150, right: 28, width: 16, height: 16, borderRadius: '50%', background: C.teal, opacity: 0.18 }} />
          </div>
          <img src="/uploads/martin-portrait.png" alt="Bc. Martin Ebringer" style={{ position: 'relative', height: 404, objectFit: 'contain', zIndex: 2, filter: 'drop-shadow(0 20px 34px rgba(23,56,66,0.18))' }} />
          <div className="home-portrait-card" style={{ position: 'absolute', bottom: 18, left: 6, zIndex: 3, background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(6px)', borderRadius: 14, padding: '11px 16px', boxShadow: '0 14px 30px rgba(23,56,66,0.16)', border: `1px solid ${C.line}` }}>
            <p style={{ margin: 0, fontFamily: 'Marcellus, serif', fontSize: 17, color: C.ink }}>Bc. Martin Ebringer</p>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section style={{ padding: '8px 20px 0' }}>
        <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden', boxShadow: '0 1px 2px rgba(23,56,66,0.03)' }}>
          {STATS.map(([a, b], i) => (
            <div key={i} style={{ padding: '18px 18px', borderTop: i > 1 ? `1px solid ${C.line}` : 'none', borderLeft: i % 2 ? `1px solid ${C.line}` : 'none' }}>
              <p style={{ margin: 0, fontFamily: 'Marcellus, serif', fontSize: 20, color: C.teal, lineHeight: 1.05 }}>{a}</p>
              <p style={{ margin: '5px 0 0', fontSize: 13, color: C.body }}>{b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ABOUT */}
      <section id="m-about" style={{ padding: '44px 20px 0', scrollMarginTop: 84 }}>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.teal }}>O nás</span>
        <h2 style={{ fontFamily: 'Marcellus, serif', fontWeight: 400, fontSize: 28, color: C.ink, margin: '10px 0 16px', lineHeight: 1.15 }}>Spoločnosť Martin Ebringer s.r.o.</h2>
        <div style={{ borderRadius: 20, overflow: 'hidden', border: `1px solid ${C.line}`, marginBottom: 18 }}>
          <img src="/uploads/smile.jpg" alt="Protetická práca" style={{ width: '100%', height: 240, objectFit: 'cover', display: 'block' }} />
        </div>
        {ABOUT_PARAGRAPHS.map((text) => (
          <p key={text} style={{ fontSize: 15.5, lineHeight: 1.6, color: C.body, margin: '0 0 14px' }}>{text}</p>
        ))}
        <p style={{ margin: 0, padding: '16px 18px', background: C.tealSoft, borderLeft: `3px solid ${C.teal}`, borderRadius: '0 14px 14px 0', color: C.ink, fontSize: 15.5, fontStyle: 'italic', lineHeight: 1.5 }}>Našou prioritou je ponúkať produkty a služby, ktorým sami dôverujeme a ktoré využívame v každodennej laboratórnej praxi.</p>
      </section>

      {/* SERVICES */}
      <section id="m-svc" style={{ padding: '44px 20px 0', scrollMarginTop: 84 }}>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.teal }}>Čo ponúkame</span>
        <h2 style={{ fontFamily: 'Marcellus, serif', fontWeight: 400, fontSize: 28, color: C.ink, margin: '10px 0 20px', lineHeight: 1.15 }}>Komplexné riešenia pre modernú stomatológiu</h2>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: C.body, margin: '0 0 18px' }}>
          Pri výrobe využívame moderné digitálne technológie, intraorálne skeny a CAD/CAM výrobné procesy, ktoré zabezpečujú vysokú presnosť a predvídateľné výsledky.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {SERVICES.map((s) => <MobileServiceCard key={s.title} {...s} />)}
        </div>
      </section>

      {/* WHY */}
      <section style={{ padding: '44px 20px 0' }}>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.teal }}>Prečo si vybrať nás</span>
        <h2 style={{ fontFamily: 'Marcellus, serif', fontWeight: 400, fontSize: 28, color: C.ink, margin: '10px 0 20px', lineHeight: 1.15 }}>Prax, technológie a individuálny prístup</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {WHY_CHOOSE.map((item) => (
            <div key={item.title} className="home-mobile-card" style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 18, padding: '20px 18px', boxShadow: '0 1px 2px rgba(23,56,66,0.03)' }}>
              <h3 style={{ fontFamily: 'Marcellus, serif', fontSize: 21, lineHeight: 1.15, color: C.ink, fontWeight: 400, margin: 0 }}>{item.title}</h3>
              <p style={{ margin: '10px 0 0', fontSize: 14.5, lineHeight: 1.55, color: C.body }}>{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ESHOP CTA */}
      <section style={{ padding: '18px 20px 0' }}>
        <div className="home-sheen" style={{ background: `linear-gradient(135deg, ${C.tealDk}, ${C.teal})`, borderRadius: 22, padding: '28px 24px 26px', position: 'relative', overflow: 'hidden' }}>
          <img src="/uploads/das-logo-v2.png" alt="Dynamic Abutment Solutions" style={{ height: 48, borderRadius: 11, marginBottom: 14, boxShadow: '0 10px 26px rgba(0,0,0,0.18)' }} />
          <span style={{ display: 'block', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)' }}>E-shop pre laboratóriá a ambulancie</span>
          <h2 style={{ fontFamily: 'Marcellus, serif', fontWeight: 400, fontSize: 26, color: '#fff', margin: '10px 0 0', lineHeight: 1.15 }}>Originálne komponenty Dynamic Ti-Base®</h2>
          <p style={{ margin: '10px 0 18px', fontSize: 14.5, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>Skladom · overené v praxi · s technickou podporou priamo od technika.</p>
          <Link className="home-cta" to="/products" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '15px', borderRadius: 13, background: '#fff', color: C.tealDk, fontSize: 16, fontWeight: 800, textDecoration: 'none', boxShadow: '0 14px 30px rgba(0,0,0,0.18)' }}>
            Otvoriť e-shop <Arrow stroke={C.tealDk} size={17} />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="m-foot" style={{ background: '#0e2c34', color: '#cddde0', marginTop: 44, padding: '36px 20px 26px', scrollMarginTop: 84 }}>
        <span style={{ background: '#fff', borderRadius: 12, padding: '9px 14px', display: 'inline-block', marginBottom: 16 }}>
          <img src="/uploads/logo-clean.png" alt="Dental design studio Ebringer" style={{ height: 36 }} />
        </span>
        <p style={{ fontSize: 14, color: '#9fb6ba', margin: '0 0 26px', lineHeight: 1.5 }}>Martin Ebringer s.r.o. — zubná technika, digitálna implantoprotetika a CAD/CAM riešenia.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 26 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5fc3cf', margin: '0 0 10px' }}>Kde nás nájdete</p>
            <p style={{ fontSize: 14, color: '#e4eef0', margin: 0, lineHeight: 1.6 }}>Dental design studio Ebringer<br />Štefana Králika 1/C, Bratislava</p>
            <a
              className="home-map-link"
              href={MAPS_URL}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 12, padding: '9px 12px', borderRadius: 999, background: 'rgba(95,195,207,0.14)', color: '#c9f5f8', fontSize: 12.5, fontWeight: 800, textDecoration: 'none', border: '1px solid rgba(95,195,207,0.28)', boxShadow: '0 10px 24px rgba(0,0,0,0.12)' }}
            >
              Zobraziť na mape
              <Arrow stroke="#c9f5f8" size={14} />
            </a>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5fc3cf', margin: '0 0 10px' }}>Kontakt</p>
            <a href="mailto:info@ebringer.sk" style={{ display: 'block', fontSize: 14, color: '#e4eef0', textDecoration: 'none', marginBottom: 6 }}>info@ebringer.sk</a>
            <a href="tel:+421903428948" style={{ display: 'block', fontSize: 14, color: '#e4eef0', textDecoration: 'none' }}>+421 903 428 948</a>
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 18 }}>
          <p style={{ fontSize: 12, color: '#86a0a4', margin: 0 }}>© 2026 Martin Ebringer s.r.o. — Všetky práva vyhradené.</p>
        </div>
      </footer>
    </div>
  );
}

// ──────────────────────────────────────────────
// ENTRY POINT
// ──────────────────────────────────────────────
export default function HomePage() {
  return (
    <>
      <div className="hidden lg:block">
        <DesktopHome />
      </div>
      <div className="block lg:hidden">
        <MobileHome />
      </div>
    </>
  );
}
