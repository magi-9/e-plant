// Shared atoms, data, theme for E-Plant Admin
const { useState, useMemo, useEffect, useRef, useCallback } = React;

const C = {
  bg: '#f6f8fb',
  card: '#ffffff',
  border: '#e2e8f0',
  borderSoft: '#eef2f6',
  text: '#0f172a',
  sub: '#475569',
  muted: '#94a3b8',
  cyan: '#0891b2',
  cyanLite: '#e0f7fa',
  emerald: '#10b981',
  grad: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
  nav: '#020617',
  navBorder: 'rgba(6,182,212,0.18)',
  danger: '#dc2626',
  dangerLite: '#fee2e2',
  warn: '#f59e0b',
  warnLite: '#fef3c7',
};

// ── DATA ─────────────────────────────────────────────────────
const CATEGORIES_SEED = [
  'TiBase', 'Skenovacie telá', 'Abutmenty', 'Multi-Unit',
  'CAD/CAM', 'Chirurgia', 'Odtlačky', 'Hojenie', 'Nástroje',
];

const COMPAT_SEED = [
  'Straumann BL', 'Nobel Active', 'Nobel Biocare',
  'Zimmer Biomet', 'Universal', 'MIS C1', 'BioHorizons',
];

// Typical key-value details for these products
const DETAIL_SUGGESTIONS = [
  'GH (mm)', 'αS', 'αC', 'Ø (mm)', 'H (mm)', 'Materiál',
  'Tork (Ncm)', 'Závit', 'Konektor', 'Hmotnosť (g)', 'Sterilizácia',
];

const PRODUCTS_SEED = [
  { id:1,  ref:'DAS-TB-035-SBL',   name:'TiBase',                              variant:'Ø 3.5 – Straumann BL',  cats:['TiBase'],                price:79,    visible:true,  compat:['Straumann BL'],                              details:{'Ø (mm)':'3.5','GH (mm)':'1.0','αS':'15°','Materiál':'Titán Gr.5'} },
  { id:2,  ref:'DAS-TB-040-SBL',   name:'TiBase',                              variant:'Ø 4.0 – Straumann BL',  cats:['TiBase'],                price:89,    visible:true,  compat:['Straumann BL'],                              details:{'Ø (mm)':'4.0','GH (mm)':'1.0','αS':'15°','Materiál':'Titán Gr.5'} },
  { id:3,  ref:'DAS-TB-045-NA',    name:'TiBase',                              variant:'Ø 4.5 – Nobel Active',  cats:['TiBase'],                price:89,    visible:true,  compat:['Nobel Active'],                              details:{'Ø (mm)':'4.5','GH (mm)':'1.5','αS':'15°','Materiál':'Titán Gr.5'} },
  { id:4,  ref:'DAS-ST-MU-050',    name:'Skenovacie telo Multi-Unit',          variant:'Ø 5.0',                 cats:['Skenovacie telá','Multi-Unit'], price:45.5, visible:true, compat:['Straumann BL','Nobel Active','Nobel Biocare','Zimmer Biomet'], details:{'Ø (mm)':'5.0','H (mm)':'10','Materiál':'PEEK'} },
  { id:5,  ref:'DAS-ST-035',       name:'Skenovacie telo',                     variant:'Ø 3.5',                 cats:['Skenovacie telá'],       price:38,    visible:true,  compat:['Straumann BL','Nobel Active','Nobel Biocare','Zimmer Biomet'], details:{'Ø (mm)':'3.5','H (mm)':'9','Materiál':'PEEK'} },
  { id:6,  ref:'DAS-UA-17-SBL',    name:'Uhľový Abutment 17°',                 variant:'Straumann BL',          cats:['Abutmenty'],             price:124,   visible:true,  compat:['Straumann BL'],                              details:{'αC':'17°','GH (mm)':'2.0','Materiál':'Titán Gr.5','Tork (Ncm)':'35'} },
  { id:7,  ref:'DAS-MUA-040-LP',   name:'Multi-Unit Abutment',                 variant:'Ø 4.0 Low Profile',     cats:['Multi-Unit','Abutmenty'],price:142,   visible:true,  compat:['Straumann BL','Nobel Active'],               details:{'Ø (mm)':'4.0','GH (mm)':'1.0','αS':'0°','Tork (Ncm)':'25'} },
  { id:8,  ref:'DAS-MUA-050-ST',   name:'Multi-Unit Abutment',                 variant:'Ø 5.0 Standard',        cats:['Multi-Unit'],            price:156,   visible:true,  compat:['Nobel Active','Nobel Biocare'],              details:{'Ø (mm)':'5.0','GH (mm)':'3.0','αS':'0°','Tork (Ncm)':'25'} },
  { id:9,  ref:'DAS-CC-TI5',       name:'CAD/CAM Blank Titanium',              variant:'Grade 5',               cats:['CAD/CAM'],               price:67,    visible:true,  compat:['Universal'],                                 details:{'Ø (mm)':'98','H (mm)':'14','Materiál':'Titán Gr.5'} },
  { id:10, ref:'DAS-GS-TSS',       name:'Guided Surgery Template System',      variant:null,                    cats:['Chirurgia'],             price:320,   visible:true,  compat:['Straumann BL','Nobel Active','Nobel Biocare'], details:{} },
  { id:11, ref:'DAS-DP-NB',        name:'Drill Protocol Set',                  variant:'Nobel Biocare',         cats:['Chirurgia','Nástroje'],  price:298,   visible:false, compat:['Nobel Biocare'],                             details:{'Tork (Ncm)':'45','Sterilizácia':'Autoklávovateľné'} },
  { id:12, ref:'DAS-IC-OT',        name:'Impression Coping',                   variant:'Open Tray',             cats:['Odtlačky'],              price:32,    visible:true,  compat:['Straumann BL','Nobel Active','Nobel Biocare','Zimmer Biomet'], details:{'Ø (mm)':'4.0','Materiál':'PEEK'} },
  { id:13, ref:'DAS-HA-040-H4',    name:'Healing Abutment',                    variant:'Ø 4.0 H4',              cats:['Hojenie'],               price:28.5,  visible:true,  compat:['Straumann BL','Nobel Active'],               details:{'Ø (mm)':'4.0','GH (mm)':'4.0','Materiál':'Titán Gr.5'} },
  { id:14, ref:'DAS-TW-35K',       name:'Torque Wrench Kit',                   variant:'35 Ncm',                cats:['Nástroje'],              price:189,   visible:true,  compat:['Universal'],                                 details:{'Tork (Ncm)':'35','Hmotnosť (g)':'180'} },
  { id:15, ref:'DAS-ZB-98FC',      name:'Zirconia Blank',                      variant:'98 mm Full Contour',    cats:['CAD/CAM'],               price:54,    visible:true,  compat:['Universal'],                                 details:{'Ø (mm)':'98','H (mm)':'14','Materiál':'Zirkón'} },
  { id:16, ref:'DAS-PMMA-98-A2',   name:'PMMA Blank',                          variant:'98 mm A2',              cats:['CAD/CAM'],               price:18,    visible:false, compat:['Universal'],                                 details:{'Ø (mm)':'98','H (mm)':'20','Materiál':'PMMA'} },
];

// ── ATOMS ────────────────────────────────────────────────────
function GBtn({ children, onClick, outline, danger, ghost, sm, lg, full, disabled, type, icon, style = {} }) {
  const [hov, setHov] = useState(false);
  const [pressed, setPressed] = useState(false);
  let bg, color, border;
  if (danger) { bg = outline ? 'transparent' : C.danger; color = outline ? C.danger : '#fff'; border = outline ? `1.5px solid ${C.danger}` : 'none'; }
  else if (ghost) { bg = hov ? '#eef2f6' : 'transparent'; color = C.sub; border = 'none'; }
  else if (outline) { bg = hov ? C.cyanLite : 'transparent'; color = C.cyan; border = `1.5px solid ${C.cyan}`; }
  else { bg = disabled ? '#e2e8f0' : C.grad; color = disabled ? C.muted : '#fff'; border = 'none'; }
  return (
    <button type={type || 'button'} onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => { setHov(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)} onMouseUp={() => setPressed(false)}
      style={{
        display:'inline-flex', alignItems:'center', justifyContent:'center', gap:7,
        padding: lg ? '13px 26px' : sm ? '7px 14px' : '10px 18px',
        width: full ? '100%' : undefined,
        borderRadius: 10,
        background: bg, color, border,
        fontSize: lg ? 15 : sm ? 12.5 : 14, fontWeight:600, fontFamily:'Inter',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transform: pressed && !disabled ? 'scale(0.98)' : 'scale(1)',
        transition:'transform 0.08s, box-shadow 0.15s, background 0.15s',
        boxShadow: outline || ghost || disabled || danger ? 'none' : hov ? '0 6px 20px rgba(6,182,212,0.30)' : '0 3px 12px rgba(6,182,212,0.18)',
        letterSpacing:'-0.01em', whiteSpace:'nowrap', ...style,
      }}>{icon}{children}</button>
  );
}

function IconBtn({ icon, label, onClick, danger, active, style = {} }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} title={label}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        width: 32, height: 32, display:'inline-flex', alignItems:'center', justifyContent:'center',
        borderRadius: 8, border: `1px solid ${hov ? (danger ? C.danger : C.cyan) : 'transparent'}`,
        background: hov ? (danger ? C.dangerLite : C.cyanLite) : 'transparent',
        color: hov ? (danger ? C.danger : C.cyan) : active ? C.cyan : C.sub,
        cursor:'pointer', transition:'all 0.12s', flexShrink:0, ...style,
      }}>{icon}</button>
  );
}

function Label({ children, required, hint }) {
  return (
    <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom: 7 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: C.sub, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {children}{required && <span style={{ color: C.danger, marginLeft: 4 }}>*</span>}
      </label>
      {hint && <span style={{ fontSize: 11, color: C.muted, fontWeight: 500 }}>{hint}</span>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, mono, lg, prefix, suffix, style = {}, type = 'text', readOnly, onFocus, onBlur, autoFocus }) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{
      display:'flex', alignItems:'center',
      width:'100%', borderRadius: 10,
      border: `1.5px solid ${focus ? C.cyan : C.border}`,
      background: readOnly ? C.bg : '#fff',
      transition: 'border-color 0.15s, box-shadow 0.15s',
      boxShadow: focus ? '0 0 0 4px rgba(6,182,212,0.10)' : 'none',
      ...style,
    }}>
      {prefix && <span style={{ paddingLeft: 14, fontSize: lg ? 16 : 14, color: C.muted, fontWeight: 500 }}>{prefix}</span>}
      <input
        type={type} value={value ?? ''} readOnly={readOnly} autoFocus={autoFocus}
        onChange={e => onChange && onChange(e.target.value)} placeholder={placeholder}
        onFocus={e => { setFocus(true); onFocus && onFocus(e); }}
        onBlur={e => { setFocus(false); onBlur && onBlur(e); }}
        style={{
          flex: 1, padding: lg ? '14px 16px' : '11px 14px',
          background: 'transparent', border: 'none', outline: 'none',
          fontSize: lg ? 18 : 14, fontWeight: lg ? 600 : 500,
          color: C.text, fontFamily: mono ? '"JetBrains Mono", ui-monospace, monospace' : 'Inter',
          letterSpacing: mono ? '0.02em' : '-0.005em',
          minWidth: 0,
        }}
      />
      {suffix && <span style={{ paddingRight: 14, fontSize: 14, color: C.muted, fontWeight: 500 }}>{suffix}</span>}
    </div>
  );
}

function TextArea({ value, onChange, placeholder, rows = 4 }) {
  const [focus, setFocus] = useState(false);
  return (
    <textarea
      value={value ?? ''} onChange={e => onChange && onChange(e.target.value)} placeholder={placeholder}
      rows={rows}
      onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
      style={{
        width:'100%', padding:'12px 14px', borderRadius: 10,
        border: `1.5px solid ${focus ? C.cyan : C.border}`,
        background:'#fff', fontSize: 14, lineHeight: 1.55, color: C.text,
        outline:'none', resize:'vertical', fontFamily:'Inter',
        transition:'border-color 0.15s, box-shadow 0.15s',
        boxShadow: focus ? '0 0 0 4px rgba(6,182,212,0.10)' : 'none',
      }}
    />
  );
}

function Chip({ children, onRemove, color, sm, style = {} }) {
  const tone = color === 'compat' ? { bg:'#ecfdf5', fg:'#047857', border:'#a7f3d0' }
             : color === 'cat' ? { bg: C.cyanLite, fg: '#0e7490', border: '#a5f3fc' }
             : { bg:'#f1f5f9', fg: C.text, border: C.border };
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap: 6,
      padding: sm ? '3px 8px' : '5px 10px',
      borderRadius: 8, fontSize: sm ? 11.5 : 12.5, fontWeight: 600,
      background: tone.bg, color: tone.fg, border: `1px solid ${tone.border}`,
      lineHeight: 1.3, whiteSpace:'nowrap', ...style,
    }}>
      {children}
      {onRemove && (
        <button onClick={onRemove} style={{
          width: 14, height: 14, display:'inline-flex', alignItems:'center', justifyContent:'center',
          border:'none', background:'transparent', cursor:'pointer', color: tone.fg, opacity: 0.65, padding: 0,
          fontSize: 14, lineHeight: 1,
        }}>×</button>
      )}
    </span>
  );
}

// Icons
const I = {
  edit:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  dup:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  eye:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  eyeOff:  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  trash:   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  plus:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  close:   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  search:  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  warn:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  upload:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  drag:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/></svg>,
  caret:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  check:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
};

// Checkbox
function Check({ checked, onChange, indeterminate, sm }) {
  const ref = useRef();
  useEffect(() => { if (ref.current) ref.current.indeterminate = !!indeterminate; }, [indeterminate]);
  const size = sm ? 16 : 18;
  return (
    <span style={{ position:'relative', width: size, height: size, display:'inline-flex', flexShrink: 0 }}>
      <input ref={ref} type="checkbox" checked={!!checked} onChange={e => onChange && onChange(e.target.checked)}
        style={{
          appearance:'none', WebkitAppearance:'none', width: size, height: size, margin: 0,
          border: `1.5px solid ${checked || indeterminate ? C.cyan : '#cbd5e1'}`,
          borderRadius: 5,
          background: checked || indeterminate ? C.grad : '#fff',
          cursor:'pointer', transition:'all 0.15s',
        }}/>
      {(checked || indeterminate) && (
        <span style={{ position:'absolute', inset: 0, display:'inline-flex', alignItems:'center', justifyContent:'center', color:'#fff', pointerEvents:'none' }}>
          {indeterminate ? <span style={{ width: 8, height: 2, background:'#fff', borderRadius: 1 }}/> : I.check}
        </span>
      )}
    </span>
  );
}

// Multiselect with typeahead + create new
function MultiSelect({ values, options, onChange, placeholder, color, allowCreate, suggestions }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef();
  const wrapRef = useRef();

  useEffect(() => {
    function onDoc(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = [...new Set([...options, ...values])];
    return all.filter(o => !values.includes(o) && (q === '' || o.toLowerCase().includes(q)));
  }, [options, values, query]);

  const canCreate = allowCreate && query.trim() && !options.includes(query.trim()) && !values.includes(query.trim());

  function add(v) {
    if (!values.includes(v)) onChange([...values, v]);
    setQuery('');
    inputRef.current && inputRef.current.focus();
  }
  function remove(v) { onChange(values.filter(x => x !== v)); }

  return (
    <div ref={wrapRef} style={{ position:'relative' }}>
      <div onClick={() => { setOpen(true); inputRef.current && inputRef.current.focus(); }}
        style={{
          display:'flex', flexWrap:'wrap', gap: 6, alignItems:'center',
          minHeight: 44, padding: '6px 10px',
          borderRadius: 10, border: `1.5px solid ${open ? C.cyan : C.border}`,
          background:'#fff', cursor:'text',
          transition:'border-color 0.15s, box-shadow 0.15s',
          boxShadow: open ? '0 0 0 4px rgba(6,182,212,0.10)' : 'none',
        }}>
        {values.map(v => (
          <Chip key={v} color={color} onRemove={() => remove(v)} sm>{v}</Chip>
        ))}
        <input
          ref={inputRef} value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onKeyDown={e => {
            if (e.key === 'Enter' && canCreate) { e.preventDefault(); add(query.trim()); }
            else if (e.key === 'Enter' && filtered.length) { e.preventDefault(); add(filtered[0]); }
            else if (e.key === 'Backspace' && !query && values.length) { remove(values[values.length-1]); }
          }}
          placeholder={values.length === 0 ? placeholder : ''}
          style={{
            flex:1, minWidth: 100, padding:'4px 4px',
            border:'none', outline:'none', background:'transparent',
            fontSize: 14, fontFamily:'Inter', color: C.text,
          }}
        />
      </div>
      {open && (filtered.length > 0 || canCreate) && (
        <div style={{
          position:'absolute', top:'calc(100% + 4px)', left: 0, right: 0,
          background:'#fff', border: `1px solid ${C.border}`, borderRadius: 10,
          boxShadow:'0 12px 32px rgba(15,23,42,0.10)', zIndex: 20,
          maxHeight: 240, overflow:'auto', padding: 4,
        }}>
          {filtered.map(o => (
            <button key={o} onClick={() => add(o)} style={{
              display:'flex', alignItems:'center', width:'100%', padding:'8px 10px',
              border:'none', background:'transparent', cursor:'pointer',
              borderRadius: 7, textAlign:'left', fontSize: 13.5, color: C.text, fontFamily:'Inter',
            }} onMouseEnter={e => e.currentTarget.style.background = C.cyanLite}
               onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              {o}
            </button>
          ))}
          {canCreate && (
            <button onClick={() => add(query.trim())} style={{
              display:'flex', alignItems:'center', gap: 8, width:'100%', padding:'8px 10px',
              border:'none', background:'transparent', cursor:'pointer',
              borderRadius: 7, textAlign:'left', fontSize: 13.5, color: C.cyan, fontFamily:'Inter', fontWeight: 600,
            }} onMouseEnter={e => e.currentTarget.style.background = C.cyanLite}
               onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              {I.plus} Vytvoriť „{query.trim()}"
            </button>
          )}
        </div>
      )}
      {suggestions && suggestions.length > 0 && !open && values.length === 0 && (
        <div style={{ marginTop: 6, fontSize: 11.5, color: C.muted, display:'flex', gap: 6, flexWrap:'wrap', alignItems:'center' }}>
          <span style={{ fontWeight: 500 }}>Návrhy:</span>
          {suggestions.slice(0, 5).map(s => (
            <button key={s} onClick={() => add(s)} style={{
              fontSize: 11.5, padding:'2px 7px', borderRadius: 6,
              border:`1px dashed ${C.border}`, background:'transparent',
              color: C.sub, cursor:'pointer', fontFamily:'Inter',
            }}>+ {s}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// Stripe placeholder
function ImgPlaceholder({ label, w, h, style = {} }) {
  return (
    <div style={{
      width: w || '100%', height: h || '100%',
      borderRadius: 10, overflow:'hidden', position:'relative',
      background: 'repeating-linear-gradient(135deg, #e2e8f0 0 8px, #eef2f6 8px 16px)',
      display:'flex', alignItems:'center', justifyContent:'center',
      ...style,
    }}>
      {label && (
        <span style={{
          fontFamily:'"JetBrains Mono", ui-monospace, monospace',
          fontSize: 10.5, color: '#64748b', letterSpacing:'0.05em',
          background:'rgba(255,255,255,0.85)', padding:'3px 7px', borderRadius: 5,
        }}>{label}</span>
      )}
    </div>
  );
}

Object.assign(window, {
  C, I, GBtn, IconBtn, Label, TextInput, TextArea, Chip, Check, MultiSelect, ImgPlaceholder,
  CATEGORIES_SEED, COMPAT_SEED, DETAIL_SUGGESTIONS, PRODUCTS_SEED,
});
