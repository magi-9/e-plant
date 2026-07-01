/* ════════════════════════════════════════════════════════════════
   DAS / Ebringer — shared shop UI (light/blue system)
   Loaded after React + Babel. Exposes window.Shop = { I, Header, Footer, CART }
   ════════════════════════════════════════════════════════════════ */

/* ---- design tokens + base CSS (injected once) ---- */
(function injectStyle(){
  if(document.getElementById('shop-ui-style'))return;
  const css = `
  :root{
    --bg:#f0f1f3; --card:#ffffff; --ink:#1a1c1e; --ink2:#45474c; --muted:#94a3b8;
    --line:#eef0f2; --line2:#e2e8f0; --blue:#2196f3; --blue-d:#1565c0;
    --maroon:#a51b3f; --ok:#1f9d55; --okbg:#eafaf1; --warn:#b45309;
  }
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body{height:100%}
  body{font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:var(--bg);color:var(--ink);-webkit-font-smoothing:antialiased}
  .mono{font-family:'Inter',ui-monospace,monospace}
  a{color:inherit;text-decoration:none}
  button,select,input,textarea{font-family:inherit}
  button{cursor:pointer;border:none;background:none}
  ::-webkit-scrollbar{width:8px;height:8px}
  ::-webkit-scrollbar-thumb{background:#d3d7dc;border-radius:8px}
  @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  @keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
  @keyframes overlayIn{from{opacity:0}to{opacity:1}}
  @keyframes popIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
  .wrap{max-width:1440px;margin:0 auto;padding:0 32px}
  .reveal{opacity:0;transform:translateY(26px);transition:opacity .7s ease,transform .7s ease}
  .reveal.in{opacity:1;transform:none}
  .navLinks{display:flex;gap:32px;align-items:center}
  .navIcons{display:flex;gap:8px;align-items:center}
  .menuBtn{display:none!important}
  @media(max-width:900px){
    .wrap{padding:0 20px}
    .navLinks{display:none}
    .menuBtn{display:flex!important}
  }`;
  const el=document.createElement('style');
  el.id='shop-ui-style';el.textContent=css;
  document.head.appendChild(el);
})();

/* ---- shared cart store (localStorage) ---- */
const CART = {
  key:'das_cart_v1',
  read(){ try{return JSON.parse(localStorage.getItem(this.key))||[];}catch(e){return[];} },
  write(items){ localStorage.setItem(this.key, JSON.stringify(items)); window.dispatchEvent(new Event('cart:change')); },
  count(){ return this.read().reduce((s,i)=>s+i.qty,0); },
  total(){ return this.read().reduce((s,i)=>s+i.price*i.qty,0); },
  add(item){ const items=this.read(); const k=i=>`${i.id}:${i.variant||''}`;
    const ex=items.find(i=>k(i)===k(item));
    if(ex)ex.qty+=item.qty||1; else items.push({...item,qty:item.qty||1});
    this.write(items); },
  setQty(id,variant,qty){ let items=this.read();
    const it=items.find(i=>i.id===id&&(i.variant||'')===(variant||''));
    if(it){ it.qty=qty; if(it.qty<=0)items=items.filter(i=>i!==it); }
    this.write(items); },
  remove(id,variant){ this.write(this.read().filter(i=>!(i.id===id&&(i.variant||'')===(variant||'')))); },
  clear(){ this.write([]); },
};

/* ---- icons ---- */
const I = {
  search:(p)=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>,
  user:(p)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/></svg>,
  cart:(p)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="9" cy="21" r="1.4"/><circle cx="19" cy="21" r="1.4"/><path d="M2.5 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L23 7H6"/></svg>,
  chev:(p)=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 9l6 6 6-6"/></svg>,
  chevR:(p)=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 6l6 6-6 6"/></svg>,
  arrow:(p)=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14M13 6l6 6-6 6"/></svg>,
  back:(p)=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M19 12H5M11 6l-6 6 6 6"/></svg>,
  check:(p)=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 6L9 17l-5-5"/></svg>,
  checkc:(p)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/></svg>,
  grid:(p)=><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/></svg>,
  list:(p)=><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M3 5h18v2.4H3V5zm0 6.8h18v2.4H3v-2.4zM3 18.6h18V21H3v-2.4z"/></svg>,
  ext:(p)=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M7 17 17 7M9 7h8v8"/></svg>,
  badge:(p)=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 2l2.4 2.1 3.1-.5 1 3 2.8 1.5-1 3 1 3-2.8 1.5-1 3-3.1-.5L12 22l-2.4-2.1-3.1.5-1-3L2.7 16.4l1-3-1-3 2.8-1.5 1-3 3.1.5L12 2z"/><path d="M9 12l2 2 4-4"/></svg>,
  filter:(p)=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 5h18M6 12h12M10 19h4"/></svg>,
  close:(p)=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M18 6 6 18M6 6l12 12"/></svg>,
  menu:(p)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 6h18M3 12h18M3 18h18"/></svg>,
  trash:(p)=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>,
  minus:(p)=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" {...p}><path d="M5 12h14"/></svg>,
  plus:(p)=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  zoom:(p)=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="11" cy="11" r="7"/><path d="m21 21-3.5-3.5M11 8v6M8 11h6"/></svg>,
  spark:(p)=><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2z"/></svg>,
  tag:(p)=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 7v5l9 9 7-7-9-9H7a4 4 0 0 0-4 4z"/><circle cx="8" cy="9" r="1.2" fill="currentColor"/></svg>,
};

/* ---- nav config ---- */
const NAV = [
  {label:'Produkty', href:'Produkty.html', key:'produkty'},
  {label:'Katalógy', href:'Katalogy.html', key:'katalogy'},
];

function Header({active, onMenu}){
  const { useState, useEffect } = React;
  const [count,setCount]=useState(CART.count());
  useEffect(()=>{const h=()=>setCount(CART.count());window.addEventListener('cart:change',h);window.addEventListener('storage',h);return()=>{window.removeEventListener('cart:change',h);window.removeEventListener('storage',h);};},[]);
  const iconBtn={width:40,height:40,borderRadius:9999,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--ink)',position:'relative'};
  return (
    <header style={{position:'sticky',top:0,zIndex:60,height:65,background:'rgba(255,255,255,.82)',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',borderBottom:'1px solid rgba(15,23,42,.06)'}}>
      <div className="wrap" style={{height:64,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:48}}>
          <a href="Produkty.html" style={{display:'flex',alignItems:'center'}}><img src="assets/dynamicabutment-logo.png" alt="Dynamic Abutment Solutions" style={{height:38,width:'auto',display:'block'}}/></a>
          <nav className="navLinks">
            {NAV.map(n=>{const on=active===n.key;return(
              <a key={n.key} href={n.href} style={{fontSize:14,fontWeight:on?700:500,color:on?'var(--ink)':'var(--ink2)',paddingBottom:2,borderBottom:on?'2px solid var(--ink)':'2px solid transparent'}}>{n.label}</a>
            );})}
          </nav>
        </div>
        <div className="navIcons">
          <button style={iconBtn} aria-label="Hľadať"><I.search width="18" height="18"/></button>
          <a href="#" style={iconBtn} aria-label="Účet"><I.user width="20" height="20"/></a>
          <a href="Kosik.html" style={iconBtn} aria-label="Košík">
            <I.cart width="20" height="20"/>
            {count>0&&<span style={{position:'absolute',top:4,right:2,minWidth:16,height:16,padding:'0 3px',borderRadius:9999,background:'var(--blue)',color:'#fff',fontSize:9,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>{count}</span>}
          </a>
          <button style={{...iconBtn,marginLeft:2}} className="menuBtn" onClick={onMenu} aria-label="Menu"><I.menu/></button>
        </div>
      </div>
    </header>
  );
}

function MobileNav({open,onClose,active}){
  if(!open)return null;
  return (
    <div style={{position:'fixed',inset:0,zIndex:90}}>
      <div onClick={onClose} style={{position:'absolute',inset:0,background:'rgba(15,18,22,.45)',animation:'overlayIn .2s ease'}}/>
      <div style={{position:'absolute',top:0,right:0,bottom:0,width:'min(80vw,320px)',background:'#fff',padding:'22px 22px',animation:'sheetUp .28s cubic-bezier(.22,1,.36,1)',display:'flex',flexDirection:'column'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
          <img src="assets/dynamicabutment-logo.png" alt="" style={{height:30}}/>
          <button onClick={onClose} style={{width:36,height:36,borderRadius:10,background:'#f4f5f6',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--ink2)'}}><I.close/></button>
        </div>
        <nav style={{display:'flex',flexDirection:'column'}}>
          {NAV.map(n=>{const on=active===n.key;return(
            <a key={n.key} href={n.href} style={{padding:'15px 4px',fontSize:17,fontWeight:on?700:500,color:on?'var(--blue)':'var(--ink)',borderBottom:'1px solid var(--line)'}}>{n.label}</a>
          );})}
          <a href="Kosik.html" style={{padding:'15px 4px',fontSize:17,fontWeight:500,color:'var(--ink)',borderBottom:'1px solid var(--line)'}}>Košík</a>
          <a href="#" style={{marginTop:22,height:50,borderRadius:12,background:'var(--blue)',color:'#fff',fontSize:15,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>Prihlásiť sa</a>
        </nav>
      </div>
    </div>
  );
}

function Footer(){
  const cols=[
    ['Informácie',[['Katalógy','Katalogy.html'],['Obchodné podmienky','#'],['Ochrana osobných údajov','#'],['Reklamačný poriadok','#'],['Vrátenie tovaru','#']]],
    ['Sortiment',[['TiBase','Produkty.html'],['Multi-Unit','Produkty.html'],['Scanbody','Produkty.html'],['Analógy','Produkty.html'],['Nástroje','Produkty.html']]],
  ];
  return (
    <footer style={{marginTop:64,background:'#0f1216',color:'#cbd2da'}}>
      <div className="wrap" style={{padding:'56px 32px',display:'flex',flexWrap:'wrap',gap:48,justifyContent:'space-between'}}>
        <div style={{maxWidth:300}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{width:34,height:34,borderRadius:8,background:'var(--maroon)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:800,fontSize:15}}>E</span>
            <strong style={{color:'#fff',fontSize:16}}>Martin Ebringer s.r.o.</strong>
          </div>
          <p style={{marginTop:14,fontSize:14,lineHeight:'22px',color:'#8a93a0'}}>Exkluzívny distribútor Dynamic Abutment Solutions pre Slovensko.</p>
          <a href="mailto:info@ebringer.sk" style={{display:'inline-block',marginTop:12,fontSize:14,color:'var(--blue)',fontWeight:600}}>info@ebringer.sk</a>
        </div>
        {cols.map(([h,items])=>(
          <div key={h}>
            <p style={{fontSize:12,fontWeight:700,letterSpacing:'.6px',color:'#fff',textTransform:'uppercase'}}>{h}</p>
            <ul style={{marginTop:16,display:'flex',flexDirection:'column',gap:12,listStyle:'none'}}>
              {items.map(([it,href])=><li key={it}><a href={href} style={{fontSize:14,color:'#8a93a0'}}>{it}</a></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div style={{borderTop:'1px solid rgba(255,255,255,.08)'}}>
        <div className="wrap" style={{padding:'20px 32px',textAlign:'center',fontSize:13,color:'#6b7480'}}>© 2026 Martin Ebringer s.r.o. — Všetky práva vyhradené.</div>
      </div>
    </footer>
  );
}

/* scroll-reveal helper */
function useReveal(){
  const { useEffect } = React;
  useEffect(()=>{
    const els=document.querySelectorAll('.reveal');
    const io=new IntersectionObserver((es)=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}}),{threshold:.12});
    els.forEach(el=>io.observe(el));
    return()=>io.disconnect();
  });
}

Object.assign(window, { Shop:{ I, Header, MobileNav, Footer, CART, NAV, useReveal } });
