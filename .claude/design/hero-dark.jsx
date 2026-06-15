// HeroDark — Variant B: deep-navy, bold, confident Ebringer homepage hero.
// Exports window.HeroDark. Fixed total height 2320 to match Variant A.
const ESHOP_HREF_D = 'Products Page.html';

const DP = {
  bg: '#0b2636',
  panel: '#103146',
  panel2: '#0e2a3c',
  ink: '#ffffff',
  body: '#9fbccb',
  teal: '#1fa6b7',
  tealLt: '#43c4d4',
  line: 'rgba(255,255,255,0.10)',
};

function DPLogoBadge({ h = 44, pad = '10px 18px' }) {
  return (
    <span style={{ display:'inline-flex', background:'#fff', borderRadius:14, padding:pad, boxShadow:'0 6px 20px rgba(0,0,0,0.25)' }}>
      <img src="uploads/logo-clean.png" alt="Dental design studio Ebringer" style={{ height:h }} />
    </span>
  );
}

function DPService({ title, lines }) {
  return (
    <div style={{ background:DP.panel, border:`1px solid ${DP.line}`, borderRadius:18, padding:'26px 24px 24px',
      display:'flex', flexDirection:'column', gap:13 }}>
      <div style={{ width:42, height:42, borderRadius:12, background:'rgba(31,166,183,0.16)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <span style={{ width:14, height:14, borderRadius:4, background:DP.tealLt }}></span>
      </div>
      <h3 style={{ fontFamily:'Archivo, sans-serif', fontSize:20, fontWeight:700, lineHeight:1.2, color:DP.ink, margin:0 }}>{title}</h3>
      <ul style={{ listStyle:'none', margin:0, padding:0, display:'flex', flexDirection:'column', gap:7 }}>
        {lines.map((l,i) => (
          <li key={i} style={{ display:'flex', gap:9, fontSize:14, color:DP.body, lineHeight:1.45 }}>
            <span style={{ marginTop:8, width:5, height:5, borderRadius:'50%', background:DP.tealLt, flexShrink:0 }}></span>
            <span>{l}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HeroDark() {
  return (
    <div style={{ width:1440, height:2320, background:DP.bg, fontFamily:'Mulish, sans-serif', color:DP.ink,
      display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>

      {/* NAV */}
      <nav style={{ height:90, flexShrink:0, padding:'0 64px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:`1px solid ${DP.line}` }}>
        <DPLogoBadge h={42} />
        <div style={{ display:'flex', alignItems:'center', gap:34 }}>
          {['Domov','Služby','Školenia','O nás','Kontakt'].map((l,i) => (
            <span key={l} style={{ fontSize:14.5, fontWeight:i===0?700:500, color:i===0?DP.ink:DP.body }}>{l}</span>
          ))}
          <a href={ESHOP_HREF_D} style={{ display:'inline-flex', alignItems:'center', gap:9, padding:'11px 22px', borderRadius:999,
            background:DP.teal, color:'#fff', fontSize:14.5, fontWeight:700, textDecoration:'none', whiteSpace:'nowrap', boxShadow:'0 6px 18px rgba(31,166,183,0.35)' }}>
            E-shop
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ height:640, flexShrink:0, padding:'0 64px', display:'flex', alignItems:'center', gap:48, position:'relative' }}>
        {/* dotted texture + teal glow */}
        <div style={{ position:'absolute', right:0, top:0, bottom:0, width:560,
          background:'radial-gradient(circle at 70% 45%, rgba(31,166,183,0.22), transparent 62%)' }}></div>

        <div style={{ width:660, flexShrink:0, position:'relative', zIndex:2 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:10, padding:'7px 14px', borderRadius:999,
            background:'rgba(31,166,183,0.14)', border:`1px solid rgba(31,166,183,0.35)`, marginBottom:26 }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:DP.tealLt }}></span>
            <span style={{ fontSize:12.5, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:DP.tealLt }}>Dental design studio Ebringer</span>
          </div>
          <h1 style={{ fontFamily:'Archivo, sans-serif', fontWeight:800, fontSize:78, lineHeight:0.98, letterSpacing:'-0.02em', color:DP.ink, margin:'0 0 22px' }}>
            25 ROKOV<br/>V <span style={{ color:DP.tealLt }}>ZUBNEJ</span><br/>TECHNIKE
          </h1>
          <p style={{ fontSize:19, lineHeight:1.6, color:DP.body, margin:'0 0 34px', maxWidth:540 }}>
            Moderné digitálne riešenia pre implantoprotetiku, CAD/CAM výrobu a zubné laboratóriá — od plánovania až po finálnu protetickú rekonštrukciu.
          </p>
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:30 }}>
            <a href={ESHOP_HREF_D} style={{ display:'inline-flex', alignItems:'center', gap:10, padding:'16px 30px', borderRadius:10,
              background:DP.teal, color:'#fff', fontSize:16, fontWeight:800, textDecoration:'none', boxShadow:'0 12px 30px rgba(31,166,183,0.38)' }}>
              Vstúpiť do e-shopu
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            </a>
            <a href="#martin-d" style={{ display:'inline-flex', alignItems:'center', padding:'16px 28px', borderRadius:10,
              background:'transparent', color:DP.ink, fontSize:16, fontWeight:700, textDecoration:'none', border:`1.5px solid ${DP.line}` }}>
              Spoznať Martina
            </a>
          </div>
          <p style={{ fontSize:13.5, color:DP.body, margin:0 }}>
            Originálne komponenty <b style={{ color:DP.ink }}>Dynamic Ti-Base®</b> · Laboratórne služby · Technická podpora
          </p>
        </div>

        {/* portrait */}
        <div style={{ flex:1, height:540, position:'relative', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2 }}>
          <div style={{ width:430, height:430, borderRadius:'50%', overflow:'hidden', position:'relative',
            border:'2px solid rgba(31,166,183,0.45)', boxShadow:'0 30px 60px rgba(0,0,0,0.45)',
            background:'linear-gradient(160deg, #163b50, #0e2c3e)' }}>
            <img src="uploads/martin-portrait.png" alt="Bc. Martin Ebringer" style={{ position:'absolute', bottom:-8, left:'50%', transform:'translateX(-50%)', height:470, objectFit:'contain' }} />
          </div>
          <div style={{ position:'absolute', bottom:30, left:48, zIndex:3, background:DP.panel, border:`1px solid ${DP.line}`,
            borderRadius:14, padding:'14px 20px', boxShadow:'0 18px 40px rgba(0,0,0,0.4)' }}>
            <p style={{ margin:0, fontFamily:'Archivo, sans-serif', fontWeight:700, fontSize:19, color:'#fff' }}>Bc. Martin Ebringer</p>
            <p style={{ margin:'3px 0 0', fontSize:12.5, fontWeight:700, letterSpacing:'0.05em', color:DP.tealLt, textTransform:'uppercase' }}>Zakladateľ · zubný technik</p>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section style={{ height:150, flexShrink:0, padding:'0 64px', display:'flex', alignItems:'center' }}>
        <div style={{ flex:1, height:104, background:DP.panel, border:`1px solid ${DP.line}`, borderRadius:18, display:'flex', alignItems:'center' }}>
          {[['25+','rokov v zubnej technike'],['Dynamic Ti-Base®','originálne komponenty'],['CAD/CAM','digitálny workflow'],['Bratislava','vlastné laboratórium']].map(([a,b],i) => (
            <div key={i} style={{ flex:1, padding:'0 30px', borderLeft:i?`1px solid ${DP.line}`:'none' }}>
              <p style={{ margin:0, fontFamily:'Archivo, sans-serif', fontWeight:800, fontSize:26, color:DP.tealLt, lineHeight:1 }}>{a}</p>
              <p style={{ margin:'7px 0 0', fontSize:14, color:DP.body }}>{b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section style={{ height:560, flexShrink:0, padding:'34px 64px 0' }}>
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:28 }}>
          <div>
            <span style={{ fontSize:13, fontWeight:700, letterSpacing:'0.16em', textTransform:'uppercase', color:DP.tealLt }}>Čo ponúkam</span>
            <h2 style={{ fontFamily:'Archivo, sans-serif', fontWeight:800, fontSize:42, color:DP.ink, margin:'12px 0 0', lineHeight:1.05, letterSpacing:'-0.01em' }}>
              KOMPLEXNÉ RIEŠENIA<br/>PRE MODERNÚ STOMATOLÓGIU
            </h2>
          </div>
          <p style={{ maxWidth:330, fontSize:14.5, color:DP.body, lineHeight:1.55, margin:0 }}>
            Ponúkam produkty a služby, ktorým sám dôverujem a používam ich v každodennej laboratórnej praxi.
          </p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:20 }}>
          <DPService title="Zubná technika a laboratórne služby"
            lines={['Korunky, mostíky, celokeramika','Zirkónové a hybridné práce','Teleskopické a snímateľné náhrady','Individuálne CAD/CAM riešenia']} />
          <DPService title="Digitálna implantoprotetika"
            lines={['Dynamic Ti-Base® komponenty','Protetické skrutky','CAD/CAM komponenty','Príslušenstvo pre implantáty']} />
          <DPService title="Technická podpora a poradenstvo"
            lines={['Výber vhodných komponentov','Návrh protetických riešení','CAD/CAM workflow','Riešenie komplikovaných prípadov']} />
          <DPService title="Školenia — All on X"
            lines={['Návrh prác v 3Shape Dental System','Digitálny wax-up','Celkové rekonštrukcie na implantátoch','Pre pokročilých technikov']} />
        </div>
      </section>

      {/* ABOUT / MAN band */}
      <section id="martin-d" style={{ height:400, flexShrink:0, padding:'40px 64px 0' }}>
        <div style={{ height:320, borderRadius:24, overflow:'hidden', display:'flex', background:DP.panel, border:`1px solid ${DP.line}` }}>
          <div style={{ width:440, flexShrink:0, position:'relative' }}>
            <img src="uploads/smile.jpg" alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg, transparent 70%, rgba(16,49,70,0.9))' }}></div>
          </div>
          <div style={{ flex:1, padding:'44px 52px', display:'flex', flexDirection:'column', justifyContent:'center' }}>
            <span style={{ fontSize:13, fontWeight:700, letterSpacing:'0.16em', textTransform:'uppercase', color:DP.tealLt, marginBottom:18 }}>Prečo si vybrať mňa</span>
            <p style={{ fontFamily:'Archivo, sans-serif', fontWeight:600, fontSize:29, lineHeight:1.3, color:DP.ink, margin:0 }}>
              „Nie som len predajca komponentov. Produkty, ktoré ponúkam, poznám z každodennej laboratórnej praxe a dlhoročnej spolupráce so stomatológmi.“
            </p>
            <p style={{ margin:'22px 0 0', fontSize:15, fontWeight:700, color:DP.body }}>— Bc. Martin Ebringer, Martin Ebringer s.r.o.</p>
          </div>
        </div>
      </section>

      {/* ESHOP CTA band */}
      <section style={{ height:300, flexShrink:0, padding:'40px 64px 0' }}>
        <div style={{ height:220, borderRadius:24, padding:'0 56px', position:'relative', overflow:'hidden',
          background:`linear-gradient(120deg, ${DP.teal}, #16808f)`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ position:'absolute', right:-40, top:-60, width:340, height:340, borderRadius:'50%',
            background:'radial-gradient(circle at 40% 40%, rgba(255,255,255,0.20), transparent 70%)' }}></div>
          <div style={{ position:'relative', zIndex:2 }}>
            <span style={{ fontSize:13, fontWeight:700, letterSpacing:'0.16em', textTransform:'uppercase', color:'rgba(255,255,255,0.78)' }}>E-shop pre laboratóriá a ambulancie</span>
            <h2 style={{ fontFamily:'Archivo, sans-serif', fontWeight:800, fontSize:38, color:'#fff', margin:'14px 0 0', lineHeight:1.05 }}>
              ORIGINÁLNE KOMPONENTY DYNAMIC&nbsp;TI-BASE®
            </h2>
            <p style={{ margin:'12px 0 0', fontSize:15.5, color:'rgba(255,255,255,0.85)' }}>Skladom · overené v praxi · s technickou podporou priamo od technika.</p>
          </div>
          <a href={ESHOP_HREF_D} style={{ position:'relative', zIndex:2, display:'inline-flex', alignItems:'center', gap:11, padding:'17px 32px', borderRadius:10,
            background:'#fff', color:'#0e6b78', fontSize:16.5, fontWeight:800, textDecoration:'none', whiteSpace:'nowrap', boxShadow:'0 14px 30px rgba(0,0,0,0.25)' }}>
            Otvoriť e-shop
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0e6b78" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ flex:1, padding:'34px 64px 0', display:'flex', alignItems:'flex-start', justifyContent:'space-between', borderTop:`1px solid ${DP.line}`, marginTop:34 }}>
        <div>
          <div style={{ marginBottom:14 }}><DPLogoBadge h={40} pad="9px 16px" /></div>
          <p style={{ fontSize:13.5, color:DP.body, margin:0, maxWidth:300, lineHeight:1.5 }}>Martin Ebringer s.r.o. — zubná technika, digitálna implantoprotetika a CAD/CAM riešenia.</p>
        </div>
        <div style={{ display:'flex', gap:64 }}>
          <div>
            <p style={{ fontSize:11.5, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:DP.tealLt, margin:'0 0 12px' }}>Kde nás nájdete</p>
            <p style={{ fontSize:14, color:DP.ink, margin:0, lineHeight:1.6 }}>Dental design studio Ebringer<br/>Štefana Králika 1/C, Bratislava</p>
          </div>
          <div>
            <p style={{ fontSize:11.5, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:DP.tealLt, margin:'0 0 12px' }}>Kontakt</p>
            <p style={{ fontSize:14, color:DP.ink, margin:0, lineHeight:1.6 }}>info@ebringer.sk<br/>+421 903 428 948</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

window.HeroDark = HeroDark;
