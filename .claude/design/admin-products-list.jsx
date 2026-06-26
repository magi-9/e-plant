// Products List - dense table with bulk actions
const { useState: useStateL, useMemo: useMemoL, useEffect: useEffectL, useRef: useRefL } = React;

function ProductsList({ products, onEdit, onDuplicate, onToggleVisible, onDelete, onBulk, onNew }) {
  const [query, setQuery] = useStateL('');
  const [catFilter, setCatFilter] = useStateL('all');
  const [visFilter, setVisFilter] = useStateL('all'); // all | visible | hidden
  const [sort, setSort] = useStateL({ key: 'ref', dir: 'asc' });
  const [selected, setSelected] = useStateL(new Set());
  const [bulkOpen, setBulkOpen] = useStateL(false);
  const [bulkCatOpen, setBulkCatOpen] = useStateL(false);
  const [bulkCats, setBulkCats] = useStateL([]);

  const allCats = useMemoL(() => {
    const s = new Set();
    products.forEach(p => p.cats.forEach(c => s.add(c)));
    return [...s].sort();
  }, [products]);

  const filtered = useMemoL(() => {
    const q = query.trim().toLowerCase();
    return products.filter(p => {
      if (catFilter !== 'all' && !p.cats.includes(catFilter)) return false;
      if (visFilter === 'visible' && !p.visible) return false;
      if (visFilter === 'hidden' && p.visible) return false;
      if (!q) return true;
      return p.ref.toLowerCase().includes(q) ||
             p.name.toLowerCase().includes(q) ||
             (p.variant || '').toLowerCase().includes(q);
    });
  }, [products, query, catFilter, visFilter]);

  const sorted = useMemoL(() => {
    const arr = [...filtered];
    const dir = sort.dir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      let av = a[sort.key], bv = b[sort.key];
      if (sort.key === 'cats') { av = a.cats[0] || ''; bv = b.cats[0] || ''; }
      if (typeof av === 'string') return av.localeCompare(bv) * dir;
      return ((av ?? 0) - (bv ?? 0)) * dir;
    });
    return arr;
  }, [filtered, sort]);

  function toggleSort(key) {
    setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
  }

  const allChecked = sorted.length > 0 && sorted.every(p => selected.has(p.id));
  const someChecked = sorted.some(p => selected.has(p.id));

  function toggleAll() {
    const next = new Set(selected);
    if (allChecked) sorted.forEach(p => next.delete(p.id));
    else sorted.forEach(p => next.add(p.id));
    setSelected(next);
  }
  function toggleOne(id) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  }

  const SortHeader = ({ k, children, align, w }) => (
    <th onClick={() => toggleSort(k)} style={{
      padding: '10px 12px', textAlign: align || 'left',
      fontSize: 11, fontWeight: 700, color: C.sub,
      textTransform: 'uppercase', letterSpacing: '0.06em',
      borderBottom: `1px solid ${C.border}`, cursor:'pointer',
      userSelect:'none', whiteSpace:'nowrap',
      width: w, background:'#fafbfd',
    }}>
      <span style={{ display:'inline-flex', alignItems:'center', gap: 4 }}>
        {children}
        {sort.key === k && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            {sort.dir === 'asc' ? <polyline points="6 15 12 9 18 15"/> : <polyline points="6 9 12 15 18 9"/>}
          </svg>
        )}
      </span>
    </th>
  );

  return (
    <div style={{ maxWidth: 1440, margin: '0 auto', padding: '32px 32px 96px' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom: 22, flexWrap:'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.cyan, textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 6 }}>Admin · Katalóg</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: C.text, letterSpacing: '-0.02em' }}>Produkty</h1>
          <div style={{ fontSize: 13.5, color: C.sub, marginTop: 6 }}>
            {products.length} produktov · {products.filter(p => p.visible).length} zobrazených · {products.filter(p => !p.visible).length} skrytých
          </div>
        </div>
        <GBtn lg onClick={onNew} icon={I.plus}>Nový produkt</GBtn>
      </div>

      {/* Toolbar */}
      <div style={{
        background: C.card, borderRadius: 14, border: `1px solid ${C.border}`,
        padding: '14px 16px', display:'flex', alignItems:'center', gap: 12, flexWrap:'wrap',
        marginBottom: 16, boxShadow: '0 1px 2px rgba(15,23,42,0.03)',
      }}>
        <div style={{ flex:'1 1 280px', minWidth: 220, position:'relative' }}>
          <div style={{ position:'absolute', left: 12, top:'50%', transform:'translateY(-50%)', color: C.muted, pointerEvents:'none' }}>{I.search}</div>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Hľadať podľa ref. čísla alebo názvu…"
            style={{
              width:'100%', padding:'10px 12px 10px 36px', borderRadius: 10,
              border:`1.5px solid ${C.border}`, background:'#fff',
              fontSize: 13.5, fontFamily:'Inter', outline:'none', color: C.text,
            }}/>
        </div>
        <SelectPill value={catFilter} onChange={setCatFilter}
          options={[{ value:'all', label:`Všetky kategórie (${products.length})` },
                    ...allCats.map(c => ({ value: c, label: c }))]}/>
        <div style={{ display:'flex', background:'#f1f5f9', borderRadius: 9, padding: 3 }}>
          {['all', 'visible', 'hidden'].map(v => (
            <button key={v} onClick={() => setVisFilter(v)} style={{
              padding:'6px 12px', borderRadius: 7, border:'none', cursor:'pointer',
              background: visFilter === v ? '#fff' : 'transparent',
              fontSize: 12.5, fontWeight: 600, fontFamily:'Inter',
              color: visFilter === v ? C.text : C.sub,
              boxShadow: visFilter === v ? '0 1px 3px rgba(15,23,42,0.06)' : 'none',
            }}>{v === 'all' ? 'Všetko' : v === 'visible' ? 'Zobrazené' : 'Skryté'}</button>
          ))}
        </div>
        <div style={{ marginLeft:'auto', fontSize: 12.5, color: C.muted }}>
          {sorted.length} výsledkov
        </div>
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div style={{
          background: C.text, color: '#fff', borderRadius: 12,
          padding: '10px 16px', display:'flex', alignItems:'center', gap: 12, marginBottom: 12,
          boxShadow: '0 6px 24px rgba(15,23,42,0.18)',
        }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{selected.size} {selected.size === 1 ? 'vybraný' : 'vybrané'}</span>
          <span style={{ height: 16, width: 1, background:'rgba(255,255,255,0.18)' }}/>
          <BulkBtn onClick={() => { onBulk('show', [...selected]); setSelected(new Set()); }} icon={I.eye}>Zobraziť</BulkBtn>
          <BulkBtn onClick={() => { onBulk('hide', [...selected]); setSelected(new Set()); }} icon={I.eyeOff}>Skryť</BulkBtn>
          <div style={{ position:'relative' }}>
            <BulkBtn onClick={() => setBulkCatOpen(!bulkCatOpen)} icon={I.caret}>Kategória</BulkBtn>
            {bulkCatOpen && (
              <div style={{
                position:'absolute', top:'calc(100% + 6px)', left: 0, minWidth: 260,
                background:'#fff', color: C.text, borderRadius: 10, padding: 12,
                boxShadow:'0 12px 32px rgba(15,23,42,0.20)', zIndex: 30,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom: 8 }}>Nastav kategórie pre {selected.size}</div>
                <MultiSelect values={bulkCats} options={allCats} onChange={setBulkCats}
                  placeholder="Vyber kategórie…" color="cat" allowCreate/>
                <div style={{ display:'flex', gap: 8, marginTop: 10, justifyContent:'flex-end' }}>
                  <GBtn sm ghost onClick={() => { setBulkCatOpen(false); setBulkCats([]); }}>Zrušiť</GBtn>
                  <GBtn sm onClick={() => { onBulk('cats', [...selected], bulkCats); setSelected(new Set()); setBulkCatOpen(false); setBulkCats([]); }}>Nastaviť</GBtn>
                </div>
              </div>
            )}
          </div>
          <BulkBtn onClick={() => { if (confirm(`Vymazať ${selected.size} produktov?`)) { onBulk('delete', [...selected]); setSelected(new Set()); } }} icon={I.trash} danger>Vymazať</BulkBtn>
          <button onClick={() => setSelected(new Set())} style={{
            marginLeft:'auto', background:'transparent', border:'none', color:'rgba(255,255,255,0.75)',
            cursor:'pointer', fontSize: 12.5, fontFamily:'Inter', fontWeight: 500,
          }}>Zrušiť výber</button>
        </div>
      )}

      {/* Table */}
      <div style={{
        background: C.card, borderRadius: 14, border: `1px solid ${C.border}`,
        overflow: 'hidden', boxShadow: '0 1px 2px rgba(15,23,42,0.03)',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Inter' }}>
          <thead>
            <tr>
              <th style={{ padding:'10px 12px 10px 16px', width: 36, background:'#fafbfd', borderBottom:`1px solid ${C.border}` }}>
                <Check checked={allChecked} indeterminate={someChecked && !allChecked} onChange={toggleAll}/>
              </th>
              <th style={{ width: 52, background:'#fafbfd', borderBottom:`1px solid ${C.border}` }}/>
              <SortHeader k="ref">Ref. číslo</SortHeader>
              <SortHeader k="name">Názov</SortHeader>
              <SortHeader k="cats">Kategória</SortHeader>
              <SortHeader k="price" align="right">Cena</SortHeader>
              <th style={{ padding:'10px 12px', background:'#fafbfd', borderBottom:`1px solid ${C.border}`, fontSize: 11, fontWeight: 700, color: C.sub, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign:'center', width: 90 }}>Stav</th>
              <th style={{ width: 160, background:'#fafbfd', borderBottom:`1px solid ${C.border}` }}/>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, i) => (
              <Row key={p.id} p={p} odd={i % 2 === 1}
                checked={selected.has(p.id)} onCheck={() => toggleOne(p.id)}
                onEdit={() => onEdit(p.id)} onDup={() => onDuplicate(p.id)}
                onToggle={() => onToggleVisible(p.id)} onDelete={() => onDelete(p.id)}/>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 48, textAlign:'center', color: C.muted, fontSize: 14 }}>
                Žiadne produkty nezodpovedajú filtru.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ p, odd, checked, onCheck, onEdit, onDup, onToggle, onDelete }) {
  const [hov, setHov] = useStateL(false);
  return (
    <tr onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? C.cyanLite : checked ? '#f0fdfa' : odd ? '#fafbfd' : '#fff',
        opacity: p.visible ? 1 : 0.62, transition:'background 0.1s',
      }}>
      <td style={{ padding:'10px 12px 10px 16px', borderBottom: `1px solid ${C.borderSoft}` }} onClick={onCheck}>
        <Check checked={checked} onChange={onCheck}/>
      </td>
      <td style={{ padding:'8px 0', borderBottom: `1px solid ${C.borderSoft}` }}>
        <ImgPlaceholder label="img" w={36} h={36} style={{ borderRadius: 7 }}/>
      </td>
      <td style={{ padding:'10px 12px', borderBottom: `1px solid ${C.borderSoft}` }}>
        <code style={{
          fontFamily:'"JetBrains Mono", ui-monospace, monospace',
          fontSize: 12, color: C.text, fontWeight: 600, letterSpacing:'0.02em',
        }}>{p.ref}</code>
      </td>
      <td style={{ padding:'10px 12px', borderBottom: `1px solid ${C.borderSoft}` }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: C.text, lineHeight: 1.3 }}>{p.name}</div>
        {p.variant && <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>{p.variant}</div>}
      </td>
      <td style={{ padding:'10px 12px', borderBottom: `1px solid ${C.borderSoft}` }}>
        <div style={{ display:'flex', gap: 4, flexWrap:'wrap' }}>
          {p.cats.slice(0, 2).map(c => <Chip key={c} color="cat" sm>{c}</Chip>)}
          {p.cats.length > 2 && <Chip sm>+{p.cats.length - 2}</Chip>}
        </div>
      </td>
      <td style={{ padding:'10px 12px', borderBottom: `1px solid ${C.borderSoft}`, textAlign:'right' }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: C.text, fontVariantNumeric:'tabular-nums' }}>
          {p.price != null ? p.price.toFixed(2) : '—'}
        </span>
        <span style={{ fontSize: 11.5, color: C.muted, marginLeft: 3 }}>€</span>
      </td>
      <td style={{ padding:'10px 12px', borderBottom: `1px solid ${C.borderSoft}`, textAlign:'center' }}>
        {p.visible ? (
          <span style={{ display:'inline-flex', alignItems:'center', gap: 5, padding:'3px 8px', borderRadius: 6, background:'#ecfdf5', color:'#047857', fontSize: 11.5, fontWeight: 600 }}>
            <span style={{ width: 6, height: 6, borderRadius:'50%', background: C.emerald }}/>
            Zobrazené
          </span>
        ) : (
          <span style={{ display:'inline-flex', alignItems:'center', gap: 5, padding:'3px 8px', borderRadius: 6, background:'#f1f5f9', color: C.sub, fontSize: 11.5, fontWeight: 600 }}>
            <span style={{ width: 6, height: 6, borderRadius:'50%', background: C.muted }}/>
            Skryté
          </span>
        )}
      </td>
      <td style={{ padding:'8px 12px', borderBottom: `1px solid ${C.borderSoft}` }}>
        <div style={{ display:'flex', gap: 4, justifyContent:'flex-end', opacity: hov ? 1 : 0.55, transition:'opacity 0.12s' }}>
          <IconBtn icon={I.edit} label="Upraviť" onClick={onEdit}/>
          <IconBtn icon={I.dup} label="Duplikovať" onClick={onDup}/>
          <IconBtn icon={p.visible ? I.eyeOff : I.eye} label={p.visible ? 'Skryť' : 'Zobraziť'} onClick={onToggle}/>
          <IconBtn icon={I.trash} label="Vymazať" danger onClick={() => { if (confirm(`Vymazať „${p.name}"?`)) onDelete(); }}/>
        </div>
      </td>
    </tr>
  );
}

function SelectPill({ value, onChange, options }) {
  const [open, setOpen] = useStateL(false);
  const wrap = useRefL();
  useEffectL(() => {
    function onDoc(e) { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  const current = options.find(o => o.value === value);
  return (
    <div ref={wrap} style={{ position:'relative' }}>
      <button onClick={() => setOpen(!open)} style={{
        display:'inline-flex', alignItems:'center', gap: 8, padding:'9px 12px',
        borderRadius: 10, border:`1.5px solid ${open ? C.cyan : C.border}`,
        background:'#fff', fontSize: 13, color: C.text, fontFamily:'Inter', fontWeight: 600,
        cursor:'pointer', minWidth: 180, justifyContent:'space-between',
      }}>
        {current?.label} {I.caret}
      </button>
      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 4px)', left: 0, minWidth: '100%',
          background:'#fff', border:`1px solid ${C.border}`, borderRadius: 10,
          boxShadow:'0 12px 28px rgba(15,23,42,0.10)', zIndex: 20,
          maxHeight: 320, overflow:'auto', padding: 4, whiteSpace:'nowrap',
        }}>
          {options.map(o => (
            <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
              style={{
                display:'block', width:'100%', padding:'8px 12px', borderRadius: 7,
                border:'none', background: o.value === value ? C.cyanLite : 'transparent',
                color: o.value === value ? C.cyan : C.text, fontWeight: o.value === value ? 700 : 500,
                fontSize: 13, fontFamily:'Inter', cursor:'pointer', textAlign:'left',
              }} onMouseEnter={e => { if (o.value !== value) e.currentTarget.style.background = '#f1f5f9'; }}
                 onMouseLeave={e => { if (o.value !== value) e.currentTarget.style.background = 'transparent'; }}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BulkBtn({ children, onClick, icon, danger }) {
  const [hov, setHov] = useStateL(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display:'inline-flex', alignItems:'center', gap: 6, padding:'6px 10px', borderRadius: 7,
        border:'none', background: hov ? (danger ? 'rgba(220,38,38,0.25)' : 'rgba(255,255,255,0.10)') : 'transparent',
        color: danger ? '#fca5a5' : '#fff', fontSize: 12.5, fontWeight: 600, fontFamily:'Inter',
        cursor:'pointer', transition:'background 0.12s',
      }}>{icon}{children}</button>
  );
}

window.ProductsList = ProductsList;
