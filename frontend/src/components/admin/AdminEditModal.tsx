import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import type { Product } from '../../api/products';
import MultiSelectInput from './MultiSelectInput';
import DetailsTable from './DetailsTable';
import { type DetailRow, nextDetailId } from './detailTypes';
import ConfirmModal from '../ConfirmModal';

const CYAN = '#2196f3';
const CYAN_LITE = '#eaf4fe';
const BORDER = '#e2e8f0';
const TEXT = '#0f172a';
const MUTED = '#94a3b8';
const SUB = '#64748b';
const GRAD = 'linear-gradient(135deg, #2196f3, #3b82f6)';

interface Draft {
    ref: string;
    origRef: string;
    name: string;
    variant: string;
    price: string;
    vatRate: string;
    cats: string[];
    compat: string[];
    details: DetailRow[];
    description: string;
    visible: boolean;
}

function normalize(p: Product | null): Draft {
    const cats = (p?.all_categories || p?.parameters?.all_categories || p?.category || '')
        .split(';').map((s: string) => s.trim()).filter(Boolean);
    const compat: string[] = (p?.parameters as Record<string, unknown> & { compat_systems?: string[] } | undefined)?.compat_systems ?? [];
    const detailsObj = p?.parameters?.details as Record<string, string> | undefined;
    const details: DetailRow[] = detailsObj
        ? Object.entries(detailsObj).map(([k, v]) => ({ id: nextDetailId(), k, v: String(v) }))
        : [];
    const variant = (p?.parameters as Record<string, unknown> | undefined)?.variant as string ?? '';
    return {
        ref: p?.reference ?? '',
        origRef: p?.reference ?? '',
        name: p?.name ?? '',
        variant,
        price: p?.price ?? '',
        vatRate: p?.vat_rate ?? '5.00',
        cats,
        compat,
        details,
        description: (p?.description ?? '').split(' | ').filter(part => !part.trim().startsWith('Referenčný kód:')).join(' | '),
        visible: p?.is_visible ?? true,
    };
}

function Label({ children, required, hint }: { children: React.ReactNode; required?: boolean; hint?: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{
                fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase',
                letterSpacing: '0.07em',
            }}>
                {children}
                {required && <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>}
            </label>
            {hint && <span style={{ fontSize: 11, color: MUTED }}>{hint}</span>}
        </div>
    );
}

function Card({ title, subtitle, children }: { title?: string; subtitle?: string; children: React.ReactNode }) {
    return (
        <section style={{
            background: '#fff', borderRadius: 14, border: `1px solid ${BORDER}`,
            padding: '20px 22px', boxShadow: '0 1px 2px rgba(15,23,42,0.03)',
        }}>
            {title && (
                <header style={{ marginBottom: 16 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: TEXT, letterSpacing: '-0.005em', margin: 0 }}>{title}</h3>
                    {subtitle && <div style={{ fontSize: 12.5, color: SUB, marginTop: 3, lineHeight: 1.5 }}>{subtitle}</div>}
                </header>
            )}
            {children}
        </section>
    );
}

function StyledInput({ suffix, mono, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { suffix?: string; mono?: boolean }) {
    const [focus, setFocus] = useState(false);
    return (
        <div style={{ position: 'relative' }}>
            <input
                {...props}
                onFocus={e => { setFocus(true); props.onFocus?.(e); }}
                onBlur={e => { setFocus(false); props.onBlur?.(e); }}
                style={{
                    width: '100%', padding: suffix ? '10px 36px 10px 12px' : '10px 12px',
                    borderRadius: 10, border: `1.5px solid ${focus ? CYAN : BORDER}`,
                    background: '#fff', fontSize: 13.5,
                    fontFamily: mono ? '"JetBrains Mono", ui-monospace, monospace' : 'Inter',
                    color: TEXT, outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                    boxShadow: focus ? '0 0 0 4px rgba(33,150,243,0.10)' : 'none',
                    ...props.style,
                }}
            />
            {suffix && (
                <span style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 13, color: MUTED, fontWeight: 600, pointerEvents: 'none',
                }}>{suffix}</span>
            )}
        </div>
    );
}

function PhotoSlot({
    imageUrl, imageFile, onChange, onRemove,
}: {
    imageUrl?: string | null;
    imageFile: File | null;
    onChange: (f: File) => void;
    onRemove: () => void;
}) {
    const [hover, setHover] = useState(false);
    const objectUrl = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : null), [imageFile]);

    useEffect(() => {
        return () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [objectUrl]);

    const preview = objectUrl ?? imageUrl;
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <div
            onDragOver={e => { e.preventDefault(); setHover(true); }}
            onDragLeave={() => setHover(false)}
            onDrop={e => {
                e.preventDefault(); setHover(false);
                const f = e.dataTransfer.files[0];
                if (f?.type.startsWith('image/')) onChange(f);
            }}
            onClick={() => !preview && inputRef.current?.click()}
            style={{
                height: 200, borderRadius: 10, position: 'relative', overflow: 'hidden',
                border: `${preview ? 1 : 1.5}px ${preview ? 'solid' : 'dashed'} ${hover ? CYAN : preview ? BORDER : '#cbd5e1'}`,
                background: preview ? '#000' : hover ? CYAN_LITE : '#fafbfd',
                cursor: preview ? 'default' : 'pointer',
                transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
        >
            <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) onChange(f); }} />
            {preview ? (
                <>
                    <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <span style={{
                        position: 'absolute', top: 8, left: 8, padding: '3px 7px', borderRadius: 6,
                        background: 'rgba(33,150,243,0.92)', color: '#fff', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em',
                    }}>HLAVNÁ</span>
                    <button onClick={e => { e.stopPropagation(); onRemove(); }} title="Odstrániť" style={{
                        position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 7,
                        border: 'none', background: 'rgba(15,23,42,0.75)', color: '#fff', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                    }}>×</button>
                </>
            ) : (
                <div style={{ textAlign: 'center', color: SUB, padding: 12 }}>
                    <div style={{ color: CYAN, marginBottom: 6, fontSize: 24 }}>↑</div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: TEXT }}>Pretiahni fotku sem</div>
                    <div style={{ fontSize: 11.5, color: MUTED, marginTop: 2 }}>alebo klikni pre výber</div>
                </div>
            )}
        </div>
    );
}

export interface EditSavePayload {
    ref: string;
    name: string;
    variant: string;
    price: string;
    vatRate: string;
    cats: string[];
    compat: string[];
    details: Record<string, string>;
    description: string;
    visible: boolean;
    imageFile: File | null;
    removeImage: boolean;
}

interface Props {
    product: Product | null;
    onClose: () => void;
    onSave: (payload: EditSavePayload) => void;
    allCategories: string[];
    allCompat: string[];
    allRefs: string[];
    isPending?: boolean;
}

export default function AdminEditModal({ product, onClose, onSave, allCategories, allCompat, allRefs, isPending }: Props) {
    const isNew = !product;
    const [draft, setDraft] = useState<Draft>(() => normalize(product));
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [removeImage, setRemoveImage] = useState(false);
    const [showRefWarn, setShowRefWarn] = useState(false);
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

    const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
        setDraft(d => ({ ...d, [k]: v }));

    const origDraft = useMemo(() => normalize(product), [product]);

    const dirty = useMemo(() => {
        if (isNew) return true;
        // Strip detail IDs before comparing — IDs are UI-only and generated independently
        // in draft (useState init) and origDraft (useMemo), so they always differ.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const stripIds = (d: Draft) => ({ ...d, details: d.details.map(({ id, ...rest }) => rest) });
        return JSON.stringify(stripIds(origDraft)) !== JSON.stringify(stripIds(draft)) || imageFile !== null || removeImage;
    }, [draft, origDraft, isNew, imageFile, removeImage]);

    const refConflict = useMemo(() => {
        const r = draft.ref.trim();
        if (!r) return null;
        if (r === draft.origRef) return null;
        if (allRefs.includes(r)) return 'duplicate';
        if (!/^[A-Z0-9-]+$/.test(r)) return 'format';
        return null;
    }, [draft.ref, draft.origRef, allRefs]);

    const refChanged = !isNew && draft.ref.trim() !== '' && draft.ref !== draft.origRef;

    const tryClose = useCallback(() => {
        if (dirty) {
            setShowDiscardConfirm(true);
            return;
        }
        onClose();
    }, [dirty, onClose]);

    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, []);

    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') tryClose();
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [tryClose]);

    function trySave() {
        if (!draft.name.trim()) { toast.error('Doplň názov produktu.'); return; }
        if (!draft.ref.trim()) { toast.error('Doplň referenčné číslo.'); return; }
        const priceValue = draft.price.trim();
        if (!priceValue) { toast.error('Doplň cenu produktu.'); return; }
        if (Number.isNaN(Number(priceValue))) { toast.error('Cena musí byť číslo.'); return; }
        const vatRateValue = draft.vatRate.trim();
        if (!vatRateValue) { toast.error('Doplň DPH produktu.'); return; }
        if (Number.isNaN(Number(vatRateValue))) { toast.error('DPH musí byť číslo.'); return; }
        if (!draft.cats[0]) { toast.error('Vyber kategóriu produktu.'); return; }
        if (refConflict === 'duplicate') { toast.error('Toto referenčné číslo už existuje.'); return; }
        if (refChanged && !refConflict && !showRefWarn) { setShowRefWarn(true); return; }
        onSave({
            ref: draft.ref.trim(),
            name: draft.name.trim(),
            variant: draft.variant.trim(),
            price: draft.price,
            vatRate: draft.vatRate,
            cats: draft.cats,
            compat: draft.compat,
            details: draft.details
                .filter(d => d.k.trim())
                .reduce((acc, d) => ({ ...acc, [d.k.trim()]: d.v }), {} as Record<string, string>),
            description: draft.description,
            visible: draft.visible,
            imageFile,
            removeImage,
        });
    }

    const saveLabel = refChanged && showRefWarn
        ? 'Potvrdiť zmenu ref. čísla a uložiť'
        : isNew ? 'Vytvoriť produkt' : 'Uložiť zmeny';

    const priceValue = draft.price.trim();
    const hasValidPrice = !!priceValue && !Number.isNaN(Number(priceValue));
    const hasCategory = !!draft.cats[0];
    const canSave = !!(
        draft.name.trim()
        && draft.ref.trim()
        && refConflict !== 'duplicate'
        && hasValidPrice
        && hasCategory
    );

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'stretch', justifyContent: 'stretch',
            animation: 'modalIn 0.18s ease-out',
        }} onClick={e => { if (e.target === e.currentTarget) tryClose(); }}>
            <div style={{
                flex: 1, margin: 16, maxWidth: 1440, marginLeft: 'auto', marginRight: 'auto',
                background: '#f6f8fb', borderRadius: 16, overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
                boxShadow: '0 24px 80px rgba(2,6,23,0.40)',
                animation: 'modalSlide 0.22s cubic-bezier(0.2,0.9,0.3,1)',
            }}>
                {/* Header */}
                <div style={{
                    padding: '18px 28px', background: '#fff', borderBottom: `1px solid ${BORDER}`,
                    display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0,
                }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                            fontSize: 11.5, fontWeight: 700, color: CYAN,
                            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3,
                        }}>
                            {isNew ? 'Nový produkt' : 'Upraviť produkt'}
                        </div>
                        <div style={{
                            fontSize: 19, fontWeight: 700, color: TEXT, letterSpacing: '-0.01em',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                            {draft.name || <span style={{ color: MUTED, fontWeight: 500 }}>Bez názvu</span>}
                            {draft.variant && <span style={{ color: SUB, fontWeight: 500, marginLeft: 8 }}>· {draft.variant}</span>}
                        </div>
                    </div>
                    {dirty && (
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '5px 10px', borderRadius: 7, background: '#fef3c7', color: '#92400e',
                            fontSize: 12, fontWeight: 600, flexShrink: 0,
                        }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} />
                            Neuložené zmeny
                        </span>
                    )}
                    <button onClick={tryClose} title="Zatvoriť" style={{
                        width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 8,
                        fontSize: 20, color: MUTED, flexShrink: 0,
                    }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f1f5f9'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >×</button>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflow: 'auto', padding: 28 }}>
                    <div style={{
                        maxWidth: 1240, margin: '0 auto',
                        display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px',
                        gap: 24, alignItems: 'start',
                    }}>
                        {/* ── MAIN COLUMN ── */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                            {/* Identification */}
                            <Card title="Identifikácia" subtitle="Názov a referenčné číslo produktu">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                    <div>
                                        <Label required>Názov</Label>
                                        <StyledInput
                                            value={draft.name}
                                            onChange={e => set('name', e.target.value)}
                                            placeholder="napr. TiBase"
                                        />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                        <div>
                                            <Label hint='napr. „Ø 4.0 – Straumann BL"'>Variant / podtitul</Label>
                                            <StyledInput
                                                value={draft.variant}
                                                onChange={e => set('variant', e.target.value)}
                                                placeholder="voliteľné"
                                            />
                                        </div>
                                        <div>
                                            <Label required hint="EUR bez DPH">Cena bez DPH</Label>
                                            <StyledInput
                                                value={draft.price}
                                                onChange={e => set('price', e.target.value.replace(',', '.').replace(/[^0-9.]/g, ''))}
                                                placeholder="0.00"
                                                suffix="€"
                                            />
                                        </div>
                                        <div>
                                            <Label required hint="%">DPH</Label>
                                            <StyledInput
                                                value={draft.vatRate}
                                                onChange={e => set('vatRate', e.target.value.replace(',', '.').replace(/[^0-9.]/g, ''))}
                                                placeholder="5.00"
                                                suffix="%"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label required hint="Primárny kľúč · používaný v objednávkach a faktúrach">Ref. číslo</Label>
                                        <StyledInput
                                            mono
                                            value={draft.ref}
                                            onChange={e => set('ref', e.target.value.toUpperCase())}
                                            placeholder="DAS-XXX-000-XX"
                                        />
                                        {refConflict === 'duplicate' && (
                                            <div style={{
                                                marginTop: 8, padding: '6px 10px', borderRadius: 7,
                                                background: '#fee2e2', color: '#991b1b', fontSize: 12, fontWeight: 600,
                                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                            }}>
                                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                                                Toto referenčné číslo už používa iný produkt.
                                            </div>
                                        )}
                                        {refConflict === 'format' && (
                                            <div style={{
                                                marginTop: 8, padding: '6px 10px', borderRadius: 7,
                                                background: '#fef3c7', color: '#92400e', fontSize: 12, fontWeight: 600,
                                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                            }}>
                                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                                                Použi len veľké písmená, číslice a pomlčky.
                                            </div>
                                        )}
                                        {refChanged && !refConflict && (
                                            <div style={{
                                                marginTop: 10, padding: 12, borderRadius: 10,
                                                background: '#fff7ed', border: '1px solid #fed7aa',
                                                display: 'flex', gap: 10, alignItems: 'flex-start',
                                            }}>
                                                <span style={{ color: '#c2410c', flexShrink: 0, marginTop: 1 }}>⚠</span>
                                                <div style={{ fontSize: 12.5, color: '#9a3412', lineHeight: 1.5 }}>
                                                    <strong style={{ display: 'block', marginBottom: 2 }}>Meníš referenčné číslo (primárny kľúč).</strong>
                                                    <code style={{ fontFamily: '"JetBrains Mono", monospace', background: '#ffedd5', padding: '1px 5px', borderRadius: 4 }}>{draft.origRef}</code>
                                                    {' → '}
                                                    <code style={{ fontFamily: '"JetBrains Mono", monospace', background: '#ffedd5', padding: '1px 5px', borderRadius: 4 }}>{draft.ref}</code>
                                                    <div style={{ marginTop: 4 }}>Ovplyvní históriu objednávok, faktúry, integrácie a externé odkazy. Zmenu potvrď ešte raz pri ukladaní.</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>

                            {/* Classification */}
                            <Card title="Klasifikácia" subtitle="Kategórie a kompatibilita so systémami">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                    <div>
                                        <Label hint="Vyber jednu alebo viac · môžeš vytvoriť novú">Kategórie</Label>
                                        <MultiSelectInput
                                            values={draft.cats}
                                            options={allCategories}
                                            onChange={v => set('cats', v)}
                                            placeholder="Začni písať alebo vyber zo zoznamu…"
                                            color="cat"
                                            allowCreate
                                        />
                                    </div>
                                    <div>
                                        <Label hint="Implantátne systémy · alebo voľný technický kód">Kompatibilita</Label>
                                        <MultiSelectInput
                                            values={draft.compat}
                                            options={allCompat}
                                            onChange={v => set('compat', v)}
                                            placeholder="Straumann BL, Nobel Active…"
                                            color="compat"
                                            allowCreate
                                        />
                                    </div>
                                </div>
                            </Card>

                            {/* Details */}
                            <Card title="Detaily produktu"
                                subtitle="Štruktúrované parametre, ktoré sa zobrazujú na detaile produktu (kľúč → hodnota)">
                                <DetailsTable
                                    rows={draft.details}
                                    onChange={rows => set('details', rows)}
                                />
                            </Card>

                            {/* Description */}
                            <Card title="Voľný popis"
                                subtitle="Marketingový popis pod parametrami. Ref. číslo sem nepatrí – má svoje pole vyššie.">
                                <textarea
                                    rows={6}
                                    value={draft.description}
                                    onChange={e => set('description', e.target.value)}
                                    placeholder="Klinické použitie, odporúčania, klinické tipy…"
                                    style={{
                                        width: '100%', padding: '10px 12px', borderRadius: 10,
                                        border: `1.5px solid ${BORDER}`, background: '#fff',
                                        fontSize: 13.5, fontFamily: 'Inter', color: TEXT,
                                        outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                                        transition: 'border-color 0.15s, box-shadow 0.15s',
                                    }}
                                    onFocus={e => {
                                        e.currentTarget.style.borderColor = CYAN;
                                        e.currentTarget.style.boxShadow = '0 0 0 4px rgba(33,150,243,0.10)';
                                    }}
                                    onBlur={e => {
                                        e.currentTarget.style.borderColor = BORDER;
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                />
                                <div style={{ fontSize: 11.5, color: MUTED, marginTop: 6, textAlign: 'right' }}>
                                    {draft.description.length} znakov
                                </div>
                            </Card>
                        </div>

                        {/* ── SIDE COLUMN ── */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'sticky', top: 0 }}>
                            <Card title="Fotografia" subtitle="Hlavná fotka produktu">
                                <PhotoSlot
                                    imageUrl={removeImage ? null : product?.image}
                                    imageFile={imageFile}
                                    onChange={f => { setImageFile(f); setRemoveImage(false); }}
                                    onRemove={() => { setImageFile(null); setRemoveImage(true); }}
                                />
                                <div style={{ fontSize: 11.5, color: MUTED, lineHeight: 1.5, marginTop: 8 }}>
                                    Odporúčaný formát: JPG alebo PNG, min. 600×600 px.
                                </div>
                            </Card>

                            <Card title="Viditeľnosť" subtitle="Či sa produkt zobrazuje zákazníkom">
                                <label style={{
                                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                                    borderRadius: 10, border: `1.5px solid ${draft.visible ? '#a7f3d0' : BORDER}`,
                                    background: draft.visible ? '#ecfdf5' : '#fff', cursor: 'pointer',
                                    transition: 'all 0.15s',
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={draft.visible}
                                        onChange={e => set('visible', e.target.checked)}
                                        style={{ width: 16, height: 16, flexShrink: 0, cursor: 'pointer', accentColor: '#10b981' }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 14, fontWeight: 600, color: draft.visible ? '#047857' : TEXT }}>
                                            {draft.visible ? 'Produkt je zobrazený' : 'Produkt je skrytý'}
                                        </div>
                                        <div style={{ fontSize: 12, color: SUB, marginTop: 2 }}>
                                            {draft.visible
                                                ? 'Zákazníci ho vidia v e-shope.'
                                                : 'Neviditeľný pre zákazníkov, zostáva v admine.'}
                                        </div>
                                    </div>
                                </label>
                            </Card>

                            <Card title="Meta">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12.5 }}>
                                    {[
                                        { label: 'ID', value: product?.id ?? '—' },
                                        { label: 'Pôvodný ref.', value: draft.origRef || '—' },
                                        { label: 'Kategórií', value: draft.cats.length },
                                        { label: 'Kompatibilít', value: draft.compat.length },
                                        { label: 'Parametrov', value: draft.details.filter(d => d.k.trim()).length },
                                    ].map(({ label, value }) => (
                                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '4px 0' }}>
                                            <span style={{ color: SUB, fontWeight: 500 }}>{label}</span>
                                            <span style={{ color: TEXT, fontWeight: 600, fontFamily: '"JetBrains Mono", monospace', fontSize: 11.5 }}>
                                                {value}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px 28px', background: '#fff', borderTop: `1px solid ${BORDER}`,
                    display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
                    boxShadow: dirty ? '0 -8px 24px rgba(245,158,11,0.08)' : 'none',
                    transition: 'box-shadow 0.15s',
                }}>
                    {dirty ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#92400e', fontWeight: 600 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
                            Máš neuložené zmeny
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: MUTED, fontWeight: 500 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                            Všetko uložené
                        </div>
                    )}
                    <div style={{ flex: 1 }} />
                    <button
                        type="button"
                        onClick={tryClose}
                        style={{
                            padding: '10px 18px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                            border: 'none', background: 'transparent', color: SUB, cursor: 'pointer',
                        }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#eef2f6'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                        Zrušiť
                    </button>
                    <button
                        type="button"
                        onClick={trySave}
                        disabled={!canSave || isPending}
                        style={{
                            padding: '10px 22px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                            border: 'none', background: !canSave || isPending ? '#e2e8f0' : GRAD,
                            color: !canSave || isPending ? MUTED : '#fff',
                            cursor: !canSave || isPending ? 'not-allowed' : 'pointer',
                            boxShadow: canSave && !isPending ? '0 3px 12px rgba(33,150,243,0.18)' : 'none',
                            transition: 'all 0.15s',
                        }}
                    >
                        {isPending ? 'Ukladám...' : saveLabel}
                    </button>
                </div>
            </div>
            <ConfirmModal
                open={showDiscardConfirm}
                title="Zrušiť zmeny?"
                message="Máte neuložené zmeny. Naozaj ich chcete zahodiť?"
                confirmLabel="Zahodiť zmeny"
                onConfirm={() => {
                    setShowDiscardConfirm(false);
                    onClose();
                }}
                onCancel={() => setShowDiscardConfirm(false)}
            />
        </div>
    );
}
