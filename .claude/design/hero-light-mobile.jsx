// HeroLightMobile — mobile (≤430px) version of the Ebringer landing page.
// Exports window.HeroLightMobile. Single column, touch-friendly, natural height.
const MESHOP = 'Products Page.html';

const M = {
  bg: '#eef3f3', surface: '#ffffff', ink: '#173842', body: '#4d6168', muted:'#7c9099',
  teal: '#1a8a9b', tealDk: '#0f6675', tealSoft: '#e2f0f1', line: '#dde7e7',
  peach: '#f4d8c4', lav: '#e0d8ec', sky: '#cfe1ee', butter: '#f4e6bd',
};

function MArrow({ stroke='#fff', size=16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>;
}

function MService({ accent, title, lines }) {
  return (
    <div style={{ background:M.surface, border:`1px solid ${M.line}`, borderRadius:18, padding:'22px 20px 20px',
      display:'flex', flexDirection:'column', gap:12, boxShadow:'0 1px 2px rgba(23,56,66,0.03)' }}>
      <div style={{ width:40, height:40, borderRadius:11, background:accent, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <span style={{ width:13, height:13, borderRadius:4, background:'#fff', opacity:0.92 }}></span>
      </div>
      <h3 style={{ fontFamily:'Marcellus, serif', fontSize:21, lineHeight:1.15, color:M.ink, fontWeight:400, margin:0 }}>{title}</h3>
      <ul style={{ listStyle:'none', margin:0, padding:0, display:'flex', flexDirection:'column', gap:7 }}>
        {lines.map((l,i) => (
          <li key={i} style={{ display:'flex', gap:9, fontSize:14.5, color:M.body, lineHeight:1.45 }}>
            <span style={{ marginTop:8, width:5, height:5, borderRadius:'50%', background:M.teal, flexShrink:0 }}></span>
            <span>{l}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HeroLightMobile() {
  const [menu, setMenu] = React.useState(false);
  const links = [['Domov','#top'],['O nás','#m-about'],['Služby','#m-svc'],['Školenia','#m-svc'],['Kontakt','#m-foot']];
  return (
    <div style={{ width:'100%', maxWidth:480, margin:'0 auto', background:M.bg, fontFamily:'Mulish, sans-serif', color:M.ink, position:'relative', overflowX:'hidden' }} id="top">

      {/* NAV */}
      <nav style={{ position:'sticky', top:0, zIndex:50, height:64, padding:'0 18px', display:'flex', alignItems:'center',
        justifyContent:'space-between', background:'rgba(255,255,255,0.86)', borderBottom:`1px solid ${M.line}`, backdropFilter:'blur(10px)' }}>
        <img src="uploads/logo-clean.png" alt="Dental design studio Ebringer" style={{ height:38 }} />
        <button onClick={()=>setMenu(m=>!m)} aria-label="Menu" style={{ width:44, height:44, borderRadius:12, border:`1px solid ${M.line}`,
          background:'#fff', display:'flex', flexDirection:'column', gap:4, alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
          {[0,1,2].map(i => <span key={i} style={{ width:18, height:2, borderRadius:2, background:M.ink, transition:'.2s',
            transform: menu ? (i===0?'translateY(6px) rotate(45deg)':i===2?'translateY(-6px) rotate(-45deg)':'scaleX(0)') : 'none' }}></span>)}
        </button>
      </nav>

      {/* MENU drawer */}
      {menu && (
        <div style={{ position:'sticky', top:64, zIndex:49, background:'#fff', borderBottom:`1px solid ${M.line}`, padding:'10px 18px 18px',
          display:'flex', flexDirection:'column', gap:2, boxShadow:'0 14px 30px rgba(23,56,66,0.10)' }}>
          {links.map(([l,h]) => (
            <a key={l} href={h} onClick={()=>setMenu(false)} style={{ padding:'12px 6px', fontSize:16, fontWeight:600, color:M.ink, textDecoration:'none', borderBottom:`1px solid ${M.bg}` }}>{l}</a>
          ))}
          <a href={MESHOP} style={{ marginTop:10, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'14px', borderRadius:12,
            background:M.teal, color:'#fff', fontSize:15.5, fontWeight:700, textDecoration:'none' }}>E-shop <MArrow/></a>
        </div>
      )}

      {/* HERO */}
      <section style={{ padding:'34px 20px 0', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:20, right:-40, width:220, height:220, borderRadius:'50%',
          background:`radial-gradient(circle at 30% 30%, ${M.peach}, transparent 70%)`, opacity:0.55, filter:'blur(6px)', pointerEvents:'none' }}></div>
        <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:16, position:'relative' }}>
          <img src="uploads/tooth-icon.png" alt="" style={{ height:22 }} />
          <span style={{ fontSize:11.5, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:M.teal }}>Dental design studio Ebringer</span>
        </div>
        <h1 style={{ fontFamily:'Marcellus, serif', fontWeight:400, fontSize:38, lineHeight:1.08, letterSpacing:'-0.01em', color:M.ink, margin:'0 0 18px', position:'relative' }}>
          Viac ako 25 rokov skúseností v <span style={{ color:M.teal, fontStyle:'italic' }}>zubnej technike</span>
        </h1>
        <p style={{ fontSize:16.5, lineHeight:1.6, color:M.body, margin:'0 0 24px', position:'relative' }}>
          Moderné digitálne riešenia pre implantoprotetiku, CAD/CAM výrobu a zubné laboratóriá — postavené na dlhoročnej praxi pri laboratórnom stole.
        </p>
        <a href={MESHOP} style={{ display:'none' }}></a>
        <p style={{ fontSize:13, color:M.body, margin:'4px 0 0', position:'relative' }}>
          Originálne komponenty <b style={{ color:M.ink }}>Dynamic Ti-Base®</b> · Laboratórne služby · Technická podpora
        </p>

        {/* portrait */}
        <div style={{ position:'relative', height:430, marginTop:18, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
          <div style={{ position:'absolute', bottom:0, width:300, height:360, borderRadius:'150px 150px 24px 24px',
            background:`linear-gradient(160deg, ${M.tealSoft}, ${M.sky})`, overflow:'hidden' }}>
            <div style={{ position:'absolute', top:26, left:26, right:26, height:90, borderRadius:999,
              background:`linear-gradient(90deg, ${M.butter}, ${M.peach}, ${M.lav})`, opacity:0.45 }}></div>
          </div>
          <img src="uploads/martin-portrait.png" alt="Bc. Martin Ebringer" style={{ position:'relative', height:404, objectFit:'contain', zIndex:2,
            filter:'drop-shadow(0 20px 34px rgba(23,56,66,0.18))' }} />
          <div style={{ position:'absolute', bottom:18, left:6, zIndex:3, background:'rgba(255,255,255,0.94)', backdropFilter:'blur(6px)',
            borderRadius:14, padding:'11px 16px', boxShadow:'0 14px 30px rgba(23,56,66,0.16)', border:`1px solid ${M.line}` }}>
            <p style={{ margin:0, fontFamily:'Marcellus, serif', fontSize:17, color:M.ink }}>Bc. Martin Ebringer</p>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section style={{ padding:'8px 20px 0' }}>
        <div style={{ background:M.surface, border:`1px solid ${M.line}`, borderRadius:18, display:'grid', gridTemplateColumns:'1fr 1fr',
          overflow:'hidden', boxShadow:'0 1px 2px rgba(23,56,66,0.03)' }}>
          {[['25+','rokov v zubnej technike'],['Dynamic Ti-Base®','originálne komponenty'],['CAD/CAM','digitálny workflow'],['Bratislava','vlastné laboratórium']].map(([a,b],i) => (
            <div key={i} style={{ padding:'18px 18px', borderTop:i>1?`1px solid ${M.line}`:'none', borderLeft:i%2?`1px solid ${M.line}`:'none' }}>
              <p style={{ margin:0, fontFamily:'Marcellus, serif', fontSize:20, color:M.teal, lineHeight:1.05 }}>{a}</p>
              <p style={{ margin:'5px 0 0', fontSize:13, color:M.body }}>{b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ABOUT */}
      <section id="m-about" style={{ padding:'44px 20px 0' }}>
        <span style={{ fontSize:12, fontWeight:700, letterSpacing:'0.16em', textTransform:'uppercase', color:M.teal }}>O nás</span>
        <h2 style={{ fontFamily:'Marcellus, serif', fontWeight:400, fontSize:28, color:M.ink, margin:'10px 0 16px', lineHeight:1.15 }}>Spoločnosť Martin Ebringer s.r.o.</h2>
        <div style={{ borderRadius:20, overflow:'hidden', position:'relative', border:`1px solid ${M.line}`, marginBottom:18 }}>
          <img src="uploads/smile.jpg" alt="Protetická práca" style={{ width:'100%', height:240, objectFit:'cover', display:'block' }} />
        </div>
        <p style={{ fontSize:15.5, lineHeight:1.6, color:M.body, margin:'0 0 14px' }}>Spájame dlhoročné skúsenosti v oblasti zubnej techniky s modernými digitálnymi riešeniami pre implantoprotetiku. Už viac ako 25 rokov pôsobíme v oblasti zubnej techniky a dentálnych laboratórnych služieb.</p>
        <p style={{ fontSize:15.5, lineHeight:1.6, color:M.body, margin:'0 0 14px' }}>Každodenná spolupráca so zubnými lekármi a klinikami nám umožňuje rozumieť reálnym potrebám modernej stomatologickej praxe.</p>
        <p style={{ margin:0, padding:'16px 18px', background:M.tealSoft, borderLeft:`3px solid ${M.teal}`, borderRadius:'0 14px 14px 0',
          color:M.ink, fontSize:15.5, fontStyle:'italic', lineHeight:1.5 }}>Našou prioritou je ponúkať produkty a služby, ktorým sami dôverujeme a ktoré využívame v každodennej laboratórnej praxi.</p>
      </section>

      {/* SERVICES */}
      <section id="m-svc" style={{ padding:'44px 20px 0' }}>
        <span style={{ fontSize:12, fontWeight:700, letterSpacing:'0.16em', textTransform:'uppercase', color:M.teal }}>Čo ponúkame</span>
        <h2 style={{ fontFamily:'Marcellus, serif', fontWeight:400, fontSize:28, color:M.ink, margin:'10px 0 20px', lineHeight:1.15 }}>Komplexné riešenia pre modernú stomatológiu</h2>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <MService accent={M.teal} title="Zubná technika a laboratórne služby"
            lines={['Korunky, mostíky, celokeramika','Zirkónové a hybridné práce','Teleskopické a snímateľné náhrady','Individuálne CAD/CAM riešenia']} />
          <MService accent="#7c93c4" title="Digitálna implantoprotetika"
            lines={['Dynamic Ti-Base® komponenty','Protetické skrutky','CAD/CAM komponenty','Príslušenstvo pre implantáty']} />
          <MService accent="#d29a76" title="Technická podpora a poradenstvo"
            lines={['Výber vhodných komponentov','Návrh protetických riešení','CAD/CAM workflow','Riešenie komplikovaných prípadov']} />
          <MService accent="#5aa6b0" title="Školenia a workshopy"
            lines={['Digitálny návrh rozsiahlych prác','Práca v 3Shape Dental System','Efektívnejší laboratórny workflow','Pre pokročilých technikov']} />
        </div>
      </section>

      {/* QUOTE */}
      <section style={{ padding:'44px 20px 0' }}>
        <div style={{ background:`linear-gradient(135deg, ${M.tealDk}, ${M.teal})`, borderRadius:22, padding:'30px 24px', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', right:-50, top:-60, width:240, height:240, borderRadius:'50%',
            background:'radial-gradient(circle at 40% 40%, rgba(255,255,255,0.16), transparent 70%)' }}></div>
          <span style={{ fontSize:12, fontWeight:700, letterSpacing:'0.16em', textTransform:'uppercase', color:'rgba(255,255,255,0.72)', position:'relative' }}>Prečo si vybrať nás</span>
          <p style={{ fontFamily:'Marcellus, serif', fontSize:23, lineHeight:1.34, color:'#fff', margin:'14px 0 0', position:'relative' }}>
            „Nie sme len predajca komponentov. Produkty, ktoré ponúkame, poznáme z každodennej laboratórnej praxe a dlhoročnej spolupráce so stomatológmi.“
          </p>
          <p style={{ margin:'18px 0 0', fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.85)', position:'relative' }}>— Bc. Martin Ebringer, Martin Ebringer s.r.o.</p>
        </div>
      </section>

      {/* ESHOP CTA */}
      <section style={{ padding:'18px 20px 0' }}>
        <div style={{ background:`linear-gradient(135deg, ${M.tealDk}, ${M.teal})`, borderRadius:22, padding:'28px 24px 26px', position:'relative', overflow:'hidden' }}>
          <img src="uploads/das-logo-v2.png" alt="Dynamic Abutment Solutions" style={{ height:48, borderRadius:11, marginBottom:14, boxShadow:'0 10px 26px rgba(0,0,0,0.18)' }} />
          <span style={{ display:'block', fontSize:11.5, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(255,255,255,0.75)' }}>E-shop pre laboratóriá a ambulancie</span>
          <h2 style={{ fontFamily:'Marcellus, serif', fontWeight:400, fontSize:26, color:'#fff', margin:'10px 0 0', lineHeight:1.15 }}>Originálne komponenty Dynamic Ti-Base®</h2>
          <p style={{ margin:'10px 0 18px', fontSize:14.5, color:'rgba(255,255,255,0.85)', lineHeight:1.5 }}>Skladom · overené v praxi · s technickou podporou priamo od technika.</p>
          <a href={MESHOP} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:'15px', borderRadius:13,
            background:'#fff', color:M.tealDk, fontSize:16, fontWeight:800, textDecoration:'none', boxShadow:'0 14px 30px rgba(0,0,0,0.18)' }}>
            Otvoriť e-shop <MArrow stroke={M.tealDk} size={17}/>
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="m-foot" style={{ background:'#0e2c34', color:'#cddde0', marginTop:44, padding:'36px 20px 26px' }}>
        <span style={{ background:'#fff', borderRadius:12, padding:'9px 14px', display:'inline-block', marginBottom:16 }}>
          <img src="uploads/logo-clean.png" alt="Dental design studio Ebringer" style={{ height:36 }} />
        </span>
        <p style={{ fontSize:14, color:'#9fb6ba', margin:'0 0 26px', lineHeight:1.5 }}>Martin Ebringer s.r.o. — zubná technika, digitálna implantoprotetika a CAD/CAM riešenia.</p>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, marginBottom:26 }}>
          <div>
            <p style={{ fontSize:11, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'#5fc3cf', margin:'0 0 10px' }}>Kde nás nájdete</p>
            <p style={{ fontSize:14, color:'#e4eef0', margin:0, lineHeight:1.6 }}>Dental design studio Ebringer<br/>Štefana Králika 1/C, Bratislava</p>
          </div>
          <div>
            <p style={{ fontSize:11, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'#5fc3cf', margin:'0 0 10px' }}>Kontakt</p>
            <a href="mailto:info@ebringer.sk" style={{ display:'block', fontSize:14, color:'#e4eef0', textDecoration:'none', marginBottom:6 }}>info@ebringer.sk</a>
            <a href="tel:+421903428948" style={{ display:'block', fontSize:14, color:'#e4eef0', textDecoration:'none' }}>+421 903 428 948</a>
          </div>
        </div>
        <div style={{ borderTop:'1px solid rgba(255,255,255,0.1)', paddingTop:18 }}>
          <p style={{ fontSize:12, color:'#86a0a4', margin:0 }}>© 2026 Martin Ebringer s.r.o. — Všetky práva vyhradené.</p>
        </div>
      </footer>
    </div>
  );
}

window.HeroLightMobile = HeroLightMobile;
