// HeroLight — Variant A: light, editorial, premium-clinical Ebringer homepage hero.
// Exports window.HeroLight. Fixed total height 2320 to frame cleanly in the canvas.
const ESHOP_HREF = 'Products Page.html';

const LP = {
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

function LPChip({ children }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'7px 14px', borderRadius:999,
      background:LP.surface, border:`1px solid ${LP.line}`, fontSize:13.5, fontWeight:600, color:LP.ink, whiteSpace:'nowrap' }}>
      {children}
    </span>
  );
}

function LPService({ accent, title, lines }) {
  return (
    <div style={{ background:LP.surface, border:`1px solid ${LP.line}`, borderRadius:18, padding:'26px 26px 24px',
      display:'flex', flexDirection:'column', gap:14, boxShadow:'0 1px 2px rgba(23,56,66,0.03)' }}>
      <div style={{ width:42, height:42, borderRadius:12, background:accent, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <span style={{ width:14, height:14, borderRadius:4, background:LP.surface, opacity:0.92 }}></span>
      </div>
      <h3 style={{ fontFamily:'Marcellus, serif', fontSize:23, lineHeight:1.15, color:LP.ink, fontWeight:400, margin:0 }}>{title}</h3>
      <ul style={{ listStyle:'none', margin:0, padding:0, display:'flex', flexDirection:'column', gap:7 }}>
        {lines.map((l,i) => (
          <li key={i} style={{ display:'flex', gap:9, fontSize:14, color:LP.body, lineHeight:1.45 }}>
            <span style={{ marginTop:8, width:5, height:5, borderRadius:'50%', background:LP.teal, flexShrink:0 }}></span>
            <span>{l}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HeroLight() {
  return (
    <div style={{ width:1440, height:2320, background:LP.bg, fontFamily:'Mulish, sans-serif', color:LP.ink,
      display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>

      {/* NAV */}
      <nav style={{ height:90, flexShrink:0, padding:'0 64px', display:'flex', alignItems:'center',
        justifyContent:'space-between', background:'rgba(255,255,255,0.7)', borderBottom:`1px solid ${LP.line}`, backdropFilter:'blur(6px)' }}>
        <img src="uploads/logo-clean.png" alt="Dental design studio Ebringer" style={{ height:50 }} />
        <div style={{ display:'flex', alignItems:'center', gap:34 }}>
          {['Domov','Služby','Školenia','O nás','Kontakt'].map((l,i) => (
            <span key={l} style={{ fontSize:14.5, fontWeight:i===0?700:500, color:i===0?LP.ink:LP.body }}>{l}</span>
          ))}
          <a href={ESHOP_HREF} style={{ display:'inline-flex', alignItems:'center', gap:9, padding:'11px 22px', borderRadius:999,
            background:LP.teal, color:'#fff', fontSize:14.5, fontWeight:700, textDecoration:'none', whiteSpace:'nowrap', boxShadow:'0 6px 18px rgba(26,138,155,0.28)' }}>
            E-shop
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ height:640, flexShrink:0, padding:'0 64px', display:'flex', alignItems:'center', gap:56, position:'relative' }}>
        {/* soft pastel blobs */}
        <div style={{ position:'absolute', top:60, right:380, width:300, height:300, borderRadius:'50%',
          background:`radial-gradient(circle at 30% 30%, ${LP.peach}, transparent 70%)`, opacity:0.5, filter:'blur(6px)' }}></div>

        <div style={{ width:640, flexShrink:0, position:'relative', zIndex:2 }}>
          <div style={{ display:'flex', alignItems:'center', gap:11, marginBottom:22 }}>
            <img src="uploads/tooth-icon.png" alt="" style={{ height:26 }} />
            <span style={{ fontSize:13, fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase', color:LP.teal }}>Dental design studio Ebringer</span>
          </div>
          <h1 style={{ fontFamily:'Marcellus, serif', fontWeight:400, fontSize:62, lineHeight:1.05, letterSpacing:'-0.01em', color:LP.ink, margin:'0 0 24px' }}>
            Viac ako 25 rokov<br/>skúseností v <span style={{ color:LP.teal, fontStyle:'italic' }}>zubnej technike</span>
          </h1>
          <p style={{ fontSize:19, lineHeight:1.6, color:LP.body, margin:'0 0 30px', maxWidth:560 }}>
            Moderné digitálne riešenia pre implantoprotetiku, CAD/CAM výrobu a zubné laboratóriá — postavené na dlhoročnej praxi pri laboratórnom stole.
          </p>
          <p style={{ fontSize:13.5, color:LP.body, letterSpacing:'0.01em', margin:0 }}>
            Originálne komponenty <b style={{ color:LP.ink }}>Dynamic Ti-Base®</b> · Laboratórne služby · Technická podpora
          </p>
        </div>

        {/* portrait */}
        <div style={{ flex:1, height:520, position:'relative', display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
          <div style={{ position:'absolute', bottom:0, width:420, height:460, borderRadius:'210px 210px 28px 28px',
            background:`linear-gradient(160deg, ${LP.tealSoft}, ${LP.sky})`, overflow:'hidden' }}>
            <div style={{ position:'absolute', top:34, left:34, right:34, height:120, borderRadius:999,
              background:`linear-gradient(90deg, ${LP.butter}, ${LP.peach}, ${LP.lav})`, opacity:0.45 }}></div>
          </div>
          <img src="uploads/martin-portrait.png" alt="Bc. Martin Ebringer" style={{ position:'relative', height:512, objectFit:'contain', zIndex:2,
            filter:'drop-shadow(0 24px 40px rgba(23,56,66,0.18))' }} />
          <div style={{ position:'absolute', bottom:46, left:18, zIndex:3, background:'rgba(255,255,255,0.94)', backdropFilter:'blur(6px)',
            borderRadius:16, padding:'14px 20px', boxShadow:'0 14px 34px rgba(23,56,66,0.16)', border:`1px solid ${LP.line}` }}>
            <p style={{ margin:0, fontFamily:'Marcellus, serif', fontSize:20, color:LP.ink }}>Bc. Martin Ebringer</p>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section style={{ height:150, flexShrink:0, padding:'0 64px', display:'flex', alignItems:'center' }}>
        <div style={{ flex:1, height:104, background:LP.surface, border:`1px solid ${LP.line}`, borderRadius:20,
          display:'flex', alignItems:'center', boxShadow:'0 1px 2px rgba(23,56,66,0.03)' }}>
          {[['25+','rokov v zubnej technike'],['Dynamic Ti-Base®','originálne komponenty'],['CAD/CAM','digitálny workflow'],['Bratislava','vlastné laboratórium']].map(([a,b],i) => (
            <div key={i} style={{ flex:1, padding:'0 30px', borderLeft:i?`1px solid ${LP.line}`:'none' }}>
              <p style={{ margin:0, fontFamily:'Marcellus, serif', fontSize:26, color:LP.teal, lineHeight:1 }}>{a}</p>
              <p style={{ margin:'7px 0 0', fontSize:14, color:LP.body }}>{b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section style={{ height:560, flexShrink:0, padding:'34px 64px 0' }}>
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:28 }}>
          <div>
            <span style={{ fontSize:13, fontWeight:700, letterSpacing:'0.16em', textTransform:'uppercase', color:LP.teal }}>Čo ponúkame</span>
            <h2 style={{ fontFamily:'Marcellus, serif', fontWeight:400, fontSize:40, color:LP.ink, margin:'12px 0 0', lineHeight:1.1 }}>
              Komplexné riešenia pre modernú stomatológiu
            </h2>
          </div>
          <p style={{ maxWidth:330, fontSize:14.5, color:LP.body, lineHeight:1.55, margin:0 }}>
            Ponúkame produkty a služby, ktorým sami dôverujeme a používame ich v každodennej laboratórnej praxi.
          </p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:20 }}>
          <LPService accent={LP.teal} title="Zubná technika a laboratórne služby"
            lines={['Korunky, mostíky, celokeramika','Zirkónové a hybridné práce','Teleskopické a snímateľné náhrady','Individuálne CAD/CAM riešenia']} />
          <LPService accent="#7c93c4" title="Digitálna implantoprotetika"
            lines={['Dynamic Ti-Base® komponenty','Protetické skrutky','CAD/CAM komponenty','Príslušenstvo pre implantáty']} />
          <LPService accent="#d29a76" title="Technická podpora a poradenstvo"
            lines={['Výber vhodných komponentov','Návrh protetických riešení','CAD/CAM workflow','Riešenie komplikovaných prípadov']} />
          <LPService accent="#5aa6b0" title="Školenia a workshopy"
            lines={['Digitálny návrh rozsiahlych prác','Práca v 3Shape Dental System','Efektívnejší laboratórny workflow','Pre pokročilých technikov']} />
        </div>
      </section>

      {/* ABOUT / MAN band */}
      <section id="martin" style={{ height:400, flexShrink:0, padding:'40px 64px 0' }}>
        <div style={{ height:320, borderRadius:24, overflow:'hidden', display:'flex', background:LP.surface, border:`1px solid ${LP.line}` }}>
          <div style={{ width:440, flexShrink:0, position:'relative' }}>
            <img src="uploads/smile.jpg" alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          </div>
          <div style={{ flex:1, padding:'44px 52px', display:'flex', flexDirection:'column', justifyContent:'center' }}>
            <span style={{ fontSize:13, fontWeight:700, letterSpacing:'0.16em', textTransform:'uppercase', color:LP.teal, marginBottom:18 }}>Prečo si vybrať nás</span>
            <p style={{ fontFamily:'Marcellus, serif', fontSize:30, lineHeight:1.32, color:LP.ink, margin:0 }}>
              „Nie sme len predajca komponentov. Produkty, ktoré ponúkame, poznáme z každodennej laboratórnej praxe a dlhoročnej spolupráce so stomatológmi.“
            </p>
            <p style={{ margin:'22px 0 0', fontSize:15, fontWeight:700, color:LP.body }}>— Bc. Martin Ebringer, Martin Ebringer s.r.o.</p>
          </div>
        </div>
      </section>

      {/* ESHOP CTA band */}
      <section style={{ height:300, flexShrink:0, padding:'40px 64px 0' }}>
        <div style={{ height:252, borderRadius:24, padding:'0 56px', position:'relative', overflow:'hidden',
          background:`linear-gradient(120deg, ${LP.tealDk}, ${LP.teal})`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ position:'absolute', right:-40, top:-60, width:340, height:340, borderRadius:'50%',
            background:'radial-gradient(circle at 40% 40%, rgba(255,255,255,0.18), transparent 70%)' }}></div>
          <div style={{ position:'relative', zIndex:2 }}>
            <img src="uploads/das-logo-v2.png" alt="Dynamic Abutment Solutions" style={{ height:54, borderRadius:11, marginBottom:14, boxShadow:'0 10px 26px rgba(0,0,0,0.18)' }} />
            <span style={{ display:'block', fontSize:13, fontWeight:700, letterSpacing:'0.16em', textTransform:'uppercase', color:'rgba(255,255,255,0.75)' }}>E-shop pre laboratóriá a ambulancie</span>
            <h2 style={{ fontFamily:'Marcellus, serif', fontWeight:400, fontSize:38, color:'#fff', margin:'14px 0 0', lineHeight:1.1 }}>
              Originálne komponenty Dynamic&nbsp;Ti-Base®
            </h2>
            <p style={{ margin:'12px 0 0', fontSize:15.5, color:'rgba(255,255,255,0.82)' }}>Skladom · overené v praxi · s technickou podporou priamo od technika.</p>
          </div>
          <a href={ESHOP_HREF} style={{ position:'relative', zIndex:2, display:'inline-flex', alignItems:'center', gap:11, padding:'17px 32px', borderRadius:999,
            background:'#fff', color:LP.tealDk, fontSize:16.5, fontWeight:800, textDecoration:'none', whiteSpace:'nowrap', boxShadow:'0 14px 30px rgba(0,0,0,0.18)' }}>
            Otvoriť e-shop
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={LP.tealDk} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ flex:1, padding:'34px 64px 26px', display:'flex', flexDirection:'column', borderTop:`1px solid ${LP.line}`, marginTop:34 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <img src="uploads/logo-clean.png" alt="" style={{ height:44, marginBottom:14 }} />
          <p style={{ fontSize:13.5, color:LP.body, margin:0, maxWidth:300, lineHeight:1.5 }}>Martin Ebringer s.r.o. — zubná technika, digitálna implantoprotetika a CAD/CAM riešenia.</p>
        </div>
        <div style={{ display:'flex', gap:64 }}>
          <div>
            <p style={{ fontSize:11.5, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:LP.teal, margin:'0 0 12px' }}>Kde nás nájdete</p>
            <p style={{ fontSize:14, color:LP.ink, margin:0, lineHeight:1.6 }}>Dental design studio Ebringer<br/>Štefana Králika 1/C, Bratislava</p>
          </div>
          <div>
            <p style={{ fontSize:11.5, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:LP.teal, margin:'0 0 12px' }}>Kontakt</p>
            <p style={{ fontSize:14, color:LP.ink, margin:0, lineHeight:1.6 }}>info@ebringer.sk<br/>+421 903 428 948</p>
          </div>
        </div>
        </div>
        <div style={{ marginTop:'auto', paddingTop:22, borderTop:`1px solid ${LP.line}`, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
          <span style={{ fontSize:12.5, color:LP.body }}>© 2026 Martin Ebringer s.r.o. — Všetky práva vyhradené.</span>
          <span style={{ fontSize:12.5, color:LP.body }}>Dynamic Ti-Base® · Laboratórne služby · Technická podpora · Digitálna stomatológia</span>
        </div>
      </footer>
    </div>
  );
}

window.HeroLight = HeroLight;
