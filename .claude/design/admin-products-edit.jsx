// Edit Modal - full-screen, "bigger and smarter"
const { useState: useStateE, useEffect: useEffectE, useRef: useRefE, useMemo: useMemoE } = React;

function EditModal({ product, onClose, onSave, allCategories, allCompat, allRefs }) {
  const isNew = !product || product.__new;
  const [draft, setDraft] = useStateE(() => normalize(product));
  const [showRefWarn, setShowRefWarn] = useStateE(false);

  function normalize(p) {
    return {
      id: p?.id ?? Date.now(),
      ref: p?.ref ?? '',
      origRef: p?.ref ?? '',
      name: p?.name ?? '',
      variant: p?.variant ?? '',
      price: p?.price ?? null,
      cats: p?.cats ? [...p.cats] : [],
      compat: p?.compat ? [...p.compat] : [],
      details: p?.details ? Object.entries(p.details).map(([k, v]) => ({ id: Math.random(), k, v })) : [],
      description: p?.description ?? '',
      visible: p?.visible ?? true,
      photos: p?.photos ?? [],
    };
  }

  const dirty = useMemoE(() => {
    if (isNew) return true;
    return JSON.stringify(normalize(product)) !== JSON.stringify(draft);
  }, [draft, product, isNew]);

  const refConflict = useMemoE(() => {
    const r = draft.ref.trim();
    if (!r) return null;
    if (r === draft.origRef) return null;
    if (allRefs.includes(r)) return 'duplicate';
    if (!/^[A-Z0-9\-]+$/.test(r)) return 'format';
    return null;
  }, [draft.ref, draft.origRef, allRefs]);

  const refChanged = !isNew && draft.ref !== draft.origRef && draft.ref.trim() !== '';

  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));

  // Lock body scroll
  useEffectE(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Esc to close
  useEffectE(() => {
    function onKey(e) {
      if (e.key === 'Escape') tryClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function tryClose() {
    if (dirty && !confirm('Máš neuložené zmeny. Naozaj zatvoriť bez uloženia?')) return;
    onClose();
  }

  function trySave() {
    if (!draft.name.trim()) { alert('Doplň názov produktu.'); return; }
    if (!draft.ref.trim()) { alert('Doplň referenčné číslo.'); return; }
    if (refConflict === 'duplicate') { alert('Toto referenčné číslo už existuje.'); return; }
    if (refChanged && !showRefWarn) { setShowRefWarn(true); return; }
    const out = {
      id: draft.id,
      ref: draft.ref.trim(),
      name: draft.name.trim(),
      variant: draft.variant.trim() || null,
      price: draft.price === '' || draft.price == null ? null : Number(draft.price),
      cats: draft.cats,
      compat: draft.compat,
      details: draft.details.filter(d => d.k.trim()).reduce((a, d) => ({ ...a, [d.k.trim()]: d.v }), {}),
      description: draft.description,
      visible: draft.visible,
      photos: draft.photos,
    };
    onSave(out);
  }

  return (
    <div style={{
      position:'fixed', inset: 0, zIndex: 200,
      background:'rgba(15,23,42,0.55)', backdropFilter:'blur(4px)',
      display:'flex', alignItems:'stretch', justifyContent:'stretch',
      animation:'modalIn 0.18s ease-out',
    }} onClick={e => { if (e.target === e.currentTarget) tryClose(); }}>
      <div style={{
        flex: 1, margin: 16, maxWidth: 1440, marginLeft:'auto', marginRight:'auto',
        background: C.bg, borderRadius: 16, overflow:'hidden',
        display:'flex', flexDirection:'column',
        boxShadow:'0 24px 80px rgba(2,6,23,0.40)',
        animation:'modalSlide 0.22s cubic-bezier(0.2,0.9,0.3,1)',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 28px', background:'#fff', borderBottom:`1px solid ${C.border}`,
          display:'flex', alignItems:'center', gap: 16,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: C.cyan, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom: 3 }}>
              {isNew ? 'Nový produkt' : 'Upraviť produkt'}
            </div>
            <div style={{ fontSize: 19, fontWeight: 700, color: C.text, letterSpacing:'-0.01em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {draft.name || <span style={{ color: C.muted, fontWeight: 500 }}>Bez názvu</span>}
              {draft.variant && <span style={{ color: C.sub, fontWeight: 500, marginLeft: 8 }}>· {draft.variant}</span>}
            </div>
          </div>
          {dirty && (
            <span style={{
              display:'inline-flex', alignItems:'center', gap: 6,
              padding:'5px 10px', borderRadius: 7, background: C.warnLite, color:'#92400e',
              fontSize: 12, fontWeight: 600,
            }}>
              <span style={{ width: 6, height: 6, borderRadius:'50%', background: C.warn }}/>
              Neuložené zmeny
            </span>
          )}
          <IconBtn icon={I.close} label="Zatvoriť" onClick={tryClose}
            style={{ width: 36, height: 36 }}/>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow:'auto', padding: 28 }}>
          <div style={{ maxWidth: 1240, margin:'0 auto', display:'grid', gridTemplateColumns:'minmax(0, 1fr) 340px', gap: 24, alignItems:'start' }}>

            {/* ─── MAIN COLUMN ─── */}
            <div style={{ display:'flex', flexDirection:'column', gap: 20 }}>

              {/* Identity card */}
              <Card title="Identifikácia" subtitle="Názov a referenčné číslo produktu">
                <div style={{ display:'flex', flexDirection:'column', gap: 18 }}>
                  <div>
                    <Label required>Názov</Label>
                    <TextInput lg value={draft.name} onChange={v => set('name', v)} placeholder="napr. TiBase"/>
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 16 }}>
                    <div>
                      <Label hint={'napr. „Ø 4.0 – Straumann BL"'}>Variant / podtitul</Label>
                      <TextInput value={draft.variant} onChange={v => set('variant', v)} placeholder="voliteľné"/>
                    </div>
                    <div>
                      <Label required hint="EUR">Cena</Label>
                      <TextInput
                        value={draft.price ?? ''}
                        onChange={v => set('price', v.replace(',', '.').replace(/[^0-9.]/g, ''))}
                        placeholder="0.00" suffix="€" mono/>
                    </div>
                  </div>

                  {/* Ref number — editable with big warning */}
                  <div>
                    <Label required hint="Primárny kľúč · používaný v objednávkach a faktúrach">Ref. číslo</Label>
                    <TextInput
                      mono value={draft.ref}
                      onChange={v => set('ref', v.toUpperCase())}
                      placeholder="DAS-XXX-000-XX"
                      prefix={<span style={{ fontFamily:'"JetBrains Mono", monospace', color: C.muted, fontWeight: 600 }}>#</span>}
                    />
                    {refConflict === 'duplicate' && (
                      <Inline tone="danger">Toto referenčné číslo už používa iný produkt.</Inline>
                    )}
                    {refConflict === 'format' && (
                      <Inline tone="warn">Použi len veľké písmená, číslice a pomlčky.</Inline>
                    )}
                    {refChanged && !refConflict && (
                      <div style={{
                        marginTop: 10, padding: 12, borderRadius: 10,
                        background: '#fff7ed', border: '1px solid #fed7aa',
                        display:'flex', gap: 10, alignItems:'flex-start',
                      }}>
                        <span style={{ color:'#c2410c', marginTop: 1, flexShrink: 0 }}>{I.warn}</span>
                        <div style={{ fontSize: 12.5, color:'#9a3412', lineHeight: 1.5 }}>
                          <strong style={{ display:'block', marginBottom: 2 }}>Meníš referenčné číslo (primárny kľúč).</strong>
                          <code style={{ fontFamily:'"JetBrains Mono", monospace', background:'#ffedd5', padding:'1px 5px', borderRadius: 4 }}>{draft.origRef}</code>
                          {' → '}
                          <code style={{ fontFamily:'"JetBrains Mono", monospace', background:'#ffedd5', padding:'1px 5px', borderRadius: 4 }}>{draft.ref}</code>
                          <div style={{ marginTop: 4 }}>Ovplyvní históriu objednávok, faktúry, integrácie a externé odkazy. Zmenu potvrď ešte raz pri ukladaní.</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* Classification */}
              <Card title="Klasifikácia" subtitle="Kategórie a kompatibilita so systémami">
                <div style={{ display:'flex', flexDirection:'column', gap: 18 }}>
                  <div>
                    <Label hint="Vyber jednu alebo viac · môžeš vytvoriť novú">Kategórie</Label>
                    <MultiSelect
                      values={draft.cats} options={allCategories}
                      onChange={v => set('cats', v)}
                      placeholder="Začni písať alebo vyber zo zoznamu…"
                      color="cat" allowCreate
                    />
                  </div>
                  <div>
                    <Label hint="Implantátne systémy · alebo voľný technický kód">Kompatibilita</Label>
                    <MultiSelect
                      values={draft.compat} options={allCompat}
                      onChange={v => set('compat', v)}
                      placeholder="Straumann BL, Nobel Active…"
                      color="compat" allowCreate
                      suggestions={allCompat}
                    />
                  </div>
                </div>
              </Card>

              {/* Details key-value */}
              <Card title="Detaily produktu"
                subtitle="Štruktúrované parametre, ktoré sa zobrazujú na detaile produktu (kľúč → hodnota)">
                <DetailsTable
                  rows={draft.details} onChange={rows => set('details', rows)}
                  suggestions={DETAIL_SUGGESTIONS}
                />
              </Card>

              {/* Free description */}
              <Card title="Voľný popis"
                subtitle="Marketingový popis pod parametrami. Ref. číslo sem nepatrí – má svoje pole vyššie.">
                <TextArea
                  rows={6}
                  value={draft.description} onChange={v => set('description', v)}
                  placeholder="Klinické použitie, odporúčania, klinické tipy…"
                />
                <div style={{ fontSize: 11.5, color: C.muted, marginTop: 6, textAlign:'right' }}>
                  {draft.description.length} znakov
                </div>
              </Card>
            </div>

            {/* ─── SIDE COLUMN ─── */}
            <div style={{ display:'flex', flexDirection:'column', gap: 20, position:'sticky', top: 0 }}>
              <Card title="Fotografia" subtitle="Hlavná fotka produktu">
                <PhotoSlots photos={draft.photos} onChange={v => set('photos', v)}/>
              </Card>

              <Card title="Viditeľnosť" subtitle="Či sa produkt zobrazuje zákazníkom">
                <label style={{
                  display:'flex', alignItems:'center', gap: 12, padding:'12px 14px',
                  borderRadius: 10, border: `1.5px solid ${draft.visible ? '#a7f3d0' : C.border}`,
                  background: draft.visible ? '#ecfdf5' : '#fff', cursor:'pointer',
                  transition:'all 0.15s',
                }}>
                  <Check checked={draft.visible} onChange={v => set('visible', v)}/>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: draft.visible ? '#047857' : C.text }}>
                      {draft.visible ? 'Produkt je zobrazený' : 'Produkt je skrytý'}
                    </div>
                    <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>
                      {draft.visible ? 'Zákazníci ho vidia v e-shope.' : 'Neviditeľný pre zákazníkov, zostáva v adminе.'}
                    </div>
                  </div>
                </label>
              </Card>

              <Card title="Meta">
                <div style={{ display:'flex', flexDirection:'column', gap: 10, fontSize: 12.5 }}>
                  <MetaRow label="ID">{draft.id}</MetaRow>
                  <MetaRow label="Pôvodný ref.">{draft.origRef || '—'}</MetaRow>
                  <MetaRow label="Kategórií">{draft.cats.length}</MetaRow>
                  <MetaRow label="Kompatibilít">{draft.compat.length}</MetaRow>
                  <MetaRow label="Parametrov">{draft.details.filter(d => d.k.trim()).length}</MetaRow>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Footer save bar */}
        <div style={{
          padding:'16px 28px', background:'#fff', borderTop:`1px solid ${C.border}`,
          display:'flex', alignItems:'center', gap: 12,
          boxShadow: dirty ? '0 -8px 24px rgba(245,158,11,0.08)' : 'none',
          transition:'box-shadow 0.15s',
        }}>
          {dirty ? (
            <div style={{ display:'flex', alignItems:'center', gap: 8, fontSize: 13, color:'#92400e', fontWeight: 600 }}>
              <span style={{ width: 8, height: 8, borderRadius:'50%', background: C.warn }}/>
              Máš neuložené zmeny
            </div>
          ) : (
            <div style={{ display:'flex', alignItems:'center', gap: 8, fontSize: 13, color: C.muted, fontWeight: 500 }}>
              <span style={{ width: 8, height: 8, borderRadius:'50%', background: C.emerald }}/>
              Všetko uložené
            </div>
          )}
          <div style={{ flex: 1 }}/>
          <GBtn ghost onClick={tryClose}>Zrušiť</GBtn>
          <GBtn lg onClick={trySave} disabled={!draft.name.trim() || !draft.ref.trim() || refConflict === 'duplicate'}>
            {refChanged && showRefWarn ? 'Potvrdiť zmenu ref. čísla a uložiť' : isNew ? 'Vytvoriť produkt' : 'Uložiť zmeny'}
          </GBtn>
        </div>
      </div>
    </div>
  );
}

function Card({ title, subtitle, children }) {
  return (
    <section style={{
      background: '#fff', borderRadius: 14, border: `1px solid ${C.border}`,
      padding: '20px 22px', boxShadow:'0 1px 2px rgba(15,23,42,0.03)',
    }}>
      {title && (
        <header style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, letterSpacing:'-0.005em' }}>{title}</h3>
          {subtitle && <div style={{ fontSize: 12.5, color: C.sub, marginTop: 3, lineHeight: 1.5 }}>{subtitle}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

function Inline({ tone, children }) {
  const tones = {
    danger: { bg: C.dangerLite, color: '#991b1b' },
    warn:   { bg: '#fef3c7', color: '#92400e' },
  };
  const t = tones[tone] || tones.warn;
  return (
    <div style={{
      marginTop: 8, padding:'6px 10px', borderRadius: 7,
      background: t.bg, color: t.color, fontSize: 12, fontWeight: 600,
      display:'inline-flex', alignItems:'center', gap: 6,
    }}>
      <span style={{ width: 6, height: 6, borderRadius:'50%', background:'currentColor' }}/>
      {children}
    </div>
  );
}

function MetaRow({ label, children }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', gap: 12, padding:'4px 0' }}>
      <span style={{ color: C.sub, fontWeight: 500 }}>{label}</span>
      <span style={{ color: C.text, fontWeight: 600, fontFamily:'"JetBrains Mono", monospace', fontSize: 11.5 }}>{children}</span>
    </div>
  );
}

// Photo slots — single now, designed to host multiple
function PhotoSlots({ photos, onChange }) {
  const main = photos[0];
  const additional = photos.slice(1);
  return (
    <div style={{ display:'flex', flexDirection:'column', gap: 10 }}>
      <PhotoSlot
        photo={main}
        onDrop={p => onChange([p, ...additional])}
        onRemove={() => onChange(additional)}
        primary
      />
      {/* Additional slots — single allowed in UI for now, but slot grid is ready */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 8 }}>
        {[0,1,2].map(i => (
          <PhotoSlot
            key={i} small
            photo={additional[i]}
            onDrop={p => {
              const next = [...additional];
              next[i] = p;
              onChange([main, ...next]);
            }}
            onRemove={() => {
              const next = additional.filter((_, j) => j !== i);
              onChange(main ? [main, ...next] : next);
            }}
          />
        ))}
      </div>
      <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5 }}>
        Prvá fotka je hlavná. Ďalšie sa zobrazia v galérii produktu.
      </div>
    </div>
  );
}

function PhotoSlot({ photo, onDrop, onRemove, primary, small }) {
  const [hover, setHover] = useStateE(false);
  const h = primary ? 200 : small ? 72 : 120;
  function pickFile() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = e => {
      const f = e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => onDrop({ url: reader.result, name: f.name });
      reader.readAsDataURL(f);
    };
    inp.click();
  }
  return (
    <div
      onDragOver={e => { e.preventDefault(); setHover(true); }}
      onDragLeave={() => setHover(false)}
      onDrop={e => {
        e.preventDefault(); setHover(false);
        const f = e.dataTransfer.files[0];
        if (!f || !f.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = () => onDrop({ url: reader.result, name: f.name });
        reader.readAsDataURL(f);
      }}
      onClick={!photo ? pickFile : undefined}
      style={{
        height: h, borderRadius: 10, position:'relative', overflow:'hidden',
        border: `${photo ? 1 : 1.5}px ${photo ? 'solid' : 'dashed'} ${hover ? C.cyan : photo ? C.border : '#cbd5e1'}`,
        background: photo ? '#000' : hover ? C.cyanLite : '#fafbfd',
        cursor: photo ? 'default' : 'pointer',
        transition:'all 0.15s', display:'flex', alignItems:'center', justifyContent:'center',
      }}>
      {photo ? (
        <>
          <img src={photo.url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
          {primary && <span style={{
            position:'absolute', top: 8, left: 8, padding:'3px 7px', borderRadius: 6,
            background:'rgba(8,145,178,0.92)', color:'#fff', fontSize: 10.5, fontWeight: 700, letterSpacing:'0.04em',
          }}>HLAVNÁ</span>}
          <button onClick={onRemove} title="Odstrániť" style={{
            position:'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 7,
            border:'none', background:'rgba(15,23,42,0.75)', color:'#fff', cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>{I.close}</button>
        </>
      ) : small ? (
        <span style={{ color: C.muted, fontSize: 18, fontWeight: 300 }}>+</span>
      ) : (
        <div style={{ textAlign:'center', color: C.sub, padding: 12 }}>
          <div style={{ color: C.cyan, marginBottom: 6, display:'flex', justifyContent:'center' }}>{I.upload}</div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: C.text }}>Pretiahni fotku sem</div>
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>alebo klikni pre výber</div>
        </div>
      )}
    </div>
  );
}

// Key-value details table
function DetailsTable({ rows, onChange, suggestions }) {
  const [dragId, setDragId] = useStateE(null);

  function update(id, field, val) {
    onChange(rows.map(r => r.id === id ? { ...r, [field]: val } : r));
  }
  function add(seed) {
    onChange([...rows, { id: Math.random(), k: seed || '', v: '' }]);
  }
  function remove(id) {
    onChange(rows.filter(r => r.id !== id));
  }
  function reorder(fromId, toId) {
    if (fromId === toId) return;
    const fromIdx = rows.findIndex(r => r.id === fromId);
    const toIdx = rows.findIndex(r => r.id === toId);
    const next = [...rows];
    const [m] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, m);
    onChange(next);
  }

  const usedKeys = new Set(rows.map(r => r.k));
  const unusedSuggestions = suggestions.filter(s => !usedKeys.has(s));

  return (
    <div>
      {rows.length > 0 && (
        <div style={{
          display:'grid', gridTemplateColumns:'24px 1fr 1.4fr 36px', gap: 0,
          fontSize: 10.5, fontWeight: 700, color: C.muted, textTransform:'uppercase',
          letterSpacing:'0.08em', padding:'0 0 8px 0',
        }}>
          <span/>
          <span style={{ paddingLeft: 4 }}>Parameter</span>
          <span style={{ paddingLeft: 14 }}>Hodnota</span>
          <span/>
        </div>
      )}
      <div style={{ display:'flex', flexDirection:'column', gap: 4 }}>
        {rows.map(r => (
          <div key={r.id} draggable
            onDragStart={() => setDragId(r.id)}
            onDragOver={e => { e.preventDefault(); }}
            onDrop={e => { e.preventDefault(); reorder(dragId, r.id); setDragId(null); }}
            style={{
              display:'grid', gridTemplateColumns:'24px 1fr 1.4fr 36px',
              alignItems:'center', gap: 0,
              borderRadius: 8, padding: '2px 0',
              opacity: dragId === r.id ? 0.4 : 1,
              transition:'opacity 0.15s',
            }}>
            <span style={{
              color: C.muted, cursor:'grab', display:'flex', alignItems:'center', justifyContent:'center',
            }}>{I.drag}</span>
            <KeyInput value={r.k} onChange={v => update(r.id, 'k', v)} suggestions={unusedSuggestions}/>
            <div style={{ paddingLeft: 10 }}>
              <TextInput value={r.v} onChange={v => update(r.id, 'v', v)} placeholder="hodnota"/>
            </div>
            <IconBtn icon={I.trash} label="Odstrániť" onClick={() => remove(r.id)}/>
          </div>
        ))}
      </div>

      {/* Add row + suggestions */}
      <div style={{ marginTop: 14, paddingTop: 14, borderTop: rows.length > 0 ? `1px dashed ${C.border}` : 'none' }}>
        {unusedSuggestions.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: C.muted, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom: 6 }}>
              Rýchle pridanie
            </div>
            <div style={{ display:'flex', gap: 6, flexWrap:'wrap' }}>
              {unusedSuggestions.map(s => (
                <button key={s} onClick={() => add(s)} style={{
                  padding:'5px 10px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                  border:`1px dashed ${C.border}`, background:'#fff',
                  color: C.sub, cursor:'pointer', fontFamily:'Inter',
                  transition:'all 0.12s',
                }} onMouseEnter={e => { e.currentTarget.style.borderColor = C.cyan; e.currentTarget.style.background = C.cyanLite; e.currentTarget.style.color = C.cyan; }}
                   onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = C.sub; }}>
                  + {s}
                </button>
              ))}
            </div>
          </div>
        )}
        <GBtn outline sm onClick={() => add()} icon={I.plus}>Pridať vlastný parameter</GBtn>
      </div>
    </div>
  );
}

function KeyInput({ value, onChange, suggestions }) {
  const [focus, setFocus] = useStateE(false);
  const [openSugg, setOpenSugg] = useStateE(false);
  const filtered = suggestions.filter(s => s.toLowerCase().includes((value||'').toLowerCase())).slice(0, 5);
  return (
    <div style={{ position:'relative' }}>
      <input
        value={value} onChange={e => { onChange(e.target.value); setOpenSugg(true); }}
        onFocus={() => { setFocus(true); setOpenSugg(true); }}
        onBlur={() => { setFocus(false); setTimeout(() => setOpenSugg(false), 150); }}
        placeholder="napr. GH (mm)"
        style={{
          width:'100%', padding:'10px 12px', borderRadius: 10,
          border:`1.5px solid ${focus ? C.cyan : C.border}`,
          background:'#fff', fontSize: 13.5, fontFamily:'Inter',
          fontWeight: 600, color: C.text, outline:'none',
          transition:'border-color 0.15s, box-shadow 0.15s',
          boxShadow: focus ? '0 0 0 4px rgba(6,182,212,0.10)' : 'none',
        }}/>
      {focus && openSugg && filtered.length > 0 && value !== filtered[0] && (
        <div style={{
          position:'absolute', top:'calc(100% + 4px)', left: 0, right: 0,
          background:'#fff', border:`1px solid ${C.border}`, borderRadius: 10,
          boxShadow:'0 8px 24px rgba(15,23,42,0.10)', zIndex: 5, padding: 4,
        }}>
          {filtered.map(s => (
            <button key={s} onMouseDown={e => { e.preventDefault(); onChange(s); setOpenSugg(false); }}
              style={{
                display:'block', width:'100%', padding:'7px 10px', borderRadius: 6,
                border:'none', background:'transparent', textAlign:'left',
                fontSize: 13, color: C.text, fontFamily:'Inter', fontWeight: 600, cursor:'pointer',
              }} onMouseEnter={e => e.currentTarget.style.background = C.cyanLite}
                 onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

window.EditModal = EditModal;
