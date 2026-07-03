import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    PRODUCT_STATS_CACHE_INVALIDATED_EVENT,
    getCategoryCounts,
    getCompatibilityCounts,
    getCompatibilityOptions,
    getCompatibleScrews,
    getProductCategories,
    getProductTypeCounts,
    getProducts,
    type CompatibilityOption,
    type Product,
    type ProductListParams,
} from '../api/products';
import { useCartStore } from '../store/cartStore';
import RequestProductModal from '../components/RequestProductModal';
import { isAdmin } from '../api/auth';
import { authService } from '../api/authService';
import { getWildcardBadgeReference } from '../utils/variantReference';
import { getCategoryList } from '../utils/productCategories';
import { getProductPreviewImage } from '../utils/productImages';
import { clearProductsBrowseState, readProductsBrowseState, writeProductsBrowseState } from '../utils/productBrowseState';
import toast from 'react-hot-toast';

/* ── Design tokens ─────────────────────────────────────────── */
const T = {
    bg: '#f0f1f3', card: '#fff', ink: '#1a1c1e', ink2: '#45474c',
    muted: '#94a3b8', line: '#eef0f2', line2: '#e2e8f0',
    blue: '#2196f3', blueD: '#1565c0', ok: '#1f9d55',
};

const PAGE_SIZE = 12;
const SEO_SITE_URL = import.meta.env.VITE_SITE_URL || window.location.origin;
type ProductOption = NonNullable<NonNullable<Product['parameters']>['options']>[number];

const isTiBaseProduct = (product: Product): boolean => {
    const haystack = [
        product.reference, product.category, product.name,
        product.wildcard_group_name, product.parameters?.wildcard_reference,
        product.parameters?.catalog_section,
    ].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes('tibase') || haystack.includes('titanium base') || (product.reference || '').startsWith('31.');
};

const getFirstCompatibilityCode = (
    product: Product,
    variant?: ProductOption
): string => (
    variant?.compatibility_codes?.[0] ||
    product.compatibility_codes?.[0] ||
    product.compatibility_code ||
    ''
);

const getVariantLabel = (
    variant: ProductOption
): string => {
    const tokens = (variant.option_tokens || '').split('|').map(token => token.trim()).filter(Boolean);
    const ghToken = tokens.find(token => /^GH\s*\(/i.test(token) || /^GH\s*:/i.test(token));
    const parts: string[] = [];
    if (ghToken) {
        const sep = ghToken.indexOf(':');
        const value = sep >= 0 ? ghToken.slice(sep + 1).trim() : ghToken.trim();
        parts.push(`GH ${value}${/mm/i.test(value) ? '' : ' mm'}`);
    }
    if (variant.engaging === 1) parts.push('Engaging');
    if (variant.engaging === 0) parts.push('Non-engaging');
    if (parts.length > 0) return parts.join(' · ');
    return variant.label || variant.name || variant.reference;
};

const isSelectableVariant = (
    variant: ProductOption
): boolean => {
    const tokens = (variant.option_tokens || '').split('|').map(token => token.trim()).filter(Boolean);
    const typeToken = tokens.find(token => token.toUpperCase().startsWith('TYPE:'));
    const typeValue = typeToken?.slice(typeToken.indexOf(':') + 1).trim().toUpperCase();
    if (typeValue && ['ADAPTOR', 'SCREWDRIVER', 'SCREWDRIVER ADAPTOR', 'DYNAMIC SCREW'].includes(typeValue)) return false;

    const name = `${variant.name || ''} ${variant.category || ''}`.toUpperCase();
    return !/\b(SCREWDRIVER ADAPTOR|SCREWDRIVER|ADAPTOR|DYNAMIC SCREW)\b/.test(name);
};

const getPurchasableVariants = (product: Product): ProductOption[] =>
    (product.parameters?.options || []).filter((option) => isSelectableVariant(option));

const getAvailableVariantStock = (product: Product): number =>
    getPurchasableVariants(product).reduce(
        (sum, option) => sum + Math.max(option.stock_quantity ?? 0, 0),
        0,
    );

const getFirstAvailableVariant = (product: Product): ProductOption | undefined =>
    getPurchasableVariants(product).find((option) => (option.stock_quantity ?? 0) > 0);

const PRODUCT_TYPE_FILTERS = [
    { value: 'tibase',     label: 'TiBase',     prefixes: '31, 35' },
    { value: 'multi_unit', label: 'Multi-Unit',  prefixes: '42, 48, 61, 62' },
    { value: 'screws',     label: 'Skrutky',     prefixes: '40, 41' },
    { value: 'scanbody',   label: 'Scanbody',    prefixes: '30, 52, 53, 54' },
    { value: 'analogs',    label: 'Analógy',     prefixes: '22, 23, 34' },
    { value: 'abutments',  label: 'Abutmenty',   prefixes: '21' },
    { value: 'adapters',   label: 'Adaptéry',    prefixes: '50' },
    { value: 'tools',      label: 'Nástroje',    prefixes: '11, 33, 43' },
] as const;
type ProductTypeFilterValue = typeof PRODUCT_TYPE_FILTERS[number]['value'];

const variantWord = (n: number) => {
    const t = n % 100, d = n % 10;
    if (t >= 11 && t <= 14) return 'variantov';
    if (d === 1) return 'variant';
    if (d >= 2 && d <= 4) return 'varianty';
    return 'variantov';
};

const getCustomerPrice = (p: Product) => p.gross_price ?? p.price;
const getNetPrice = (p: Product) => p.price;

/* ── SVG icons ─────────────────────────────────────────────── */
const ISearch = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;
const IChev   = ({ open }: { open: boolean }) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}><path d="M6 9l6 6 6-6"/></svg>;
const ICheck  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>;
const IClose  = ({ size = 20 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>;
const IGrid   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/></svg>;
const IList   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h18v2.4H3V5zm0 6.8h18v2.4H3v-2.4zM3 18.6h18V21H3v-2.4z"/></svg>;
const IFilter = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5h18M6 12h12M10 19h4"/></svg>;
const IBadge  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 2.1 3.1-.5 1 3 2.8 1.5-1 3 1 3-2.8 1.5-1 3-3.1-.5L12 22l-2.4-2.1-3.1.5-1-3L2.7 16.4l1-3-1-3 2.8-1.5 1-3 3.1.5L12 2z"/><path d="M9 12l2 2 4-4"/></svg>;
const ICart   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1.4"/><circle cx="19" cy="21" r="1.4"/><path d="M2.5 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L23 7H6"/></svg>;
const IMinus  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M5 12h14"/></svg>;
const IPlus   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>;

/* ── Checkbox ───────────────────────────────────────────────── */
function Check({ on }: { on: boolean }) {
    return (
        <span style={{ width: 20, height: 20, borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? T.blue : '#fff', border: on ? `1px solid ${T.blue}` : '1.5px solid #cbd5e1', color: '#fff', transition: 'all .12s' }}>
            {on && <ICheck />}
        </span>
    );
}
function CheckRow({ label, count, on, onClick }: { label: string; count?: number; on: boolean; onClick: () => void }) {
    return (
        <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <Check on={on} />
            <span style={{ fontSize: 14, color: T.ink2, flex: 1 }}>{label}</span>
            {count != null && <span style={{ fontSize: 10, fontWeight: 700, color: T.muted }}>{count}</span>}
        </button>
    );
}
function FilterGroup({ title, children, open, onToggle }: { title: string; children: React.ReactNode; open: boolean; onToggle: () => void }) {
    return (
        <div>
            <button onClick={onToggle} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 0, background: 'none', border: 'none', cursor: 'pointer' }}>
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.6px', color: T.ink }}>{title}</span>
                <IChev open={open} />
            </button>
            {open && <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>}
        </div>
    );
}

/* ── FilterPanel ────────────────────────────────────────────── */
interface FilterState {
    types: string[]; categories: string[]; compatCode: string;
    min: string; max: string; q: string; inStockOnly: boolean;
    priceSortOrder: 'asc' | 'desc' | 'none';
}
function FilterPanel({
    F, setF, productTypeCounts, allCategories, categoryCounts,
    sortedCompatibilityOptions, compatibilityCounts, availableTypeFilters,
}: {
    F: FilterState; setF: React.Dispatch<React.SetStateAction<FilterState>>;
    productTypeCounts: Record<string, number>; allCategories: string[];
    categoryCounts: Record<string, number>; sortedCompatibilityOptions: CompatibilityOption[];
    compatibilityCounts: Record<string, number>;
    availableTypeFilters: typeof PRODUCT_TYPE_FILTERS[number][];
}) {
    const [open, setOpen] = useState<Record<string, boolean>>({ t: true, c: true, k: false });
    const tg = (k: string) => setOpen(o => ({ ...o, [k]: !o[k] }));
    const div = <div style={{ height: 1, background: T.line }} />;
    const togType = (v: string) => setF(f => ({ ...f, types: f.types.includes(v) ? f.types.filter(x => x !== v) : [...f.types, v] }));
    const togCat  = (v: string) => setF(f => ({ ...f, categories: f.categories.includes(v) ? f.categories.filter(x => x !== v) : [...f.categories, v] }));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '1px', color: T.muted }}>FILTER PRODUKTOV</span>
            {div}
            {availableTypeFilters.length > 0 && <>
                <FilterGroup title="Typ produktu" open={open.t} onToggle={() => tg('t')}>
                    {availableTypeFilters.map(opt => (
                        <CheckRow key={opt.value} label={opt.label} count={productTypeCounts[opt.value] || 0} on={F.types.includes(opt.value)} onClick={() => togType(opt.value)} />
                    ))}
                </FilterGroup>
                {div}
            </>}
            {allCategories.length > 0 && <>
                <FilterGroup title="Kategórie" open={open.c} onToggle={() => tg('c')}>
                    {allCategories.map(cat => (
                        <CheckRow key={cat} label={cat} count={categoryCounts[cat] || 0} on={F.categories.includes(cat)} onClick={() => togCat(cat)} />
                    ))}
                </FilterGroup>
                {div}
            </>}
            {sortedCompatibilityOptions.length > 0 && <>
                <FilterGroup title="Kompatibilita" open={open.k} onToggle={() => tg('k')}>
                    {sortedCompatibilityOptions.map(opt => (
                        <CheckRow key={opt.compatibility_code} label={opt.compatibility_code} count={compatibilityCounts[opt.compatibility_code]} on={F.compatCode === opt.compatibility_code} onClick={() => setF(f => ({ ...f, compatCode: f.compatCode === opt.compatibility_code ? '' : opt.compatibility_code }))} />
                    ))}
                </FilterGroup>
                {div}
            </>}
            <div>
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.6px', color: T.ink }}>Cena</span>
                <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
                    {([['MIN', 'min', '0'], ['MAX', 'max', '500']] as const).map(([lab, key, ph]) => (
                        <label key={key} style={{ flex: 1 }}>
                            <span style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '.6px', color: T.muted, marginBottom: 6 }}>{lab}</span>
                            <input type="number" placeholder={ph} value={F[key as 'min' | 'max']} onChange={e => setF(f => ({ ...f, [key]: e.target.value }))}
                                style={{ width: '100%', height: 42, border: `1px solid ${T.line2}`, borderRadius: 10, padding: '0 12px', fontSize: 14, outline: 'none', background: '#fff', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                        </label>
                    ))}
                </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: T.ink2 }}>Len skladom</span>
                <button type="button" onClick={() => setF(f => ({ ...f, inStockOnly: !f.inStockOnly }))}
                    style={{ width: 40, height: 22, borderRadius: 11, background: F.inStockOnly ? T.blue : '#e2e8f0', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background .15s', flexShrink: 0 }}>
                    <span style={{ position: 'absolute', top: 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left .15s', left: F.inStockOnly ? 21 : 3 }} />
                </button>
            </div>
            <button onClick={() => setF({ types: [], categories: [], compatCode: '', min: '', max: '', q: '', inStockOnly: false, priceSortOrder: 'none' })}
                style={{ height: 46, borderRadius: 12, background: '#f4f5f6', color: T.ink, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                Resetovať všetky filtre
            </button>
        </div>
    );
}

/* ── Toolbar ────────────────────────────────────────────────── */
const SORTS = [
    ['none', 'Predvolené'], ['asc', 'Cena: vzostupne'], ['desc', 'Cena: zostupne'],
] as const;

function Toolbar({ q, setQ, sort, setSort, view, setView }: {
    q: string; setQ: (v: string) => void;
    sort: string; setSort: (v: string) => void;
    view: 'grid' | 'list'; setView: (v: 'grid' | 'list') => void;
}) {
    const [sortOpen, setSortOpen] = useState(false);
    const sortRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const h = (e: MouseEvent) => { if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);
    const curLabel = SORTS.find(s => s[0] === sort)?.[1] || 'Predvolené';
    const vbtn = (on: boolean): React.CSSProperties => ({ width: 38, height: 38, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', color: on ? '#fff' : T.muted, background: on ? T.ink : 'transparent', border: 'none', cursor: 'pointer' });

    return (
        <div style={{ background: T.card, border: `1px solid ${T.line2}`, borderRadius: 16, padding: '10px 12px 10px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: T.muted, flex: 1, minWidth: 200 }}>
                    <ISearch />
                    <input value={q} onChange={e => setQ(e.target.value)} placeholder="Hľadať produkt . . ."
                        style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, color: T.ink, background: 'transparent', fontFamily: 'inherit' }} />
                    {q && <button onClick={() => setQ('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 18, lineHeight: 1 }}>×</button>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginLeft: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 13, color: T.muted, whiteSpace: 'nowrap' }}>Zoradiť podľa</span>
                        <div ref={sortRef} style={{ position: 'relative' }}>
                            <button onClick={() => setSortOpen(o => !o)}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 14px', border: `1px solid ${T.line2}`, borderRadius: 10, fontSize: 14, fontWeight: 600, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                                {curLabel} <IChev open={sortOpen} />
                            </button>
                            {sortOpen && (
                                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, width: 200, background: '#fff', border: `1px solid ${T.line2}`, borderRadius: 12, boxShadow: '0 18px 40px rgba(15,23,42,.14)', padding: '6px 0', zIndex: 30 }}>
                                    {SORTS.map(([v, l]) => (
                                        <button key={v} onClick={() => { setSort(v); setSortOpen(false); }}
                                            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 14, fontWeight: sort === v ? 700 : 500, color: sort === v ? T.blue : T.ink2, background: sort === v ? '#eaf4fe' : 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                                            {l}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, background: '#f4f5f6', borderRadius: 11, padding: 4 }}>
                        <button style={vbtn(view === 'grid')} onClick={() => setView('grid')} aria-label="Mriežka"><IGrid /></button>
                        <button style={vbtn(view === 'list')} onClick={() => setView('list')} aria-label="Zoznam"><IList /></button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── ProductCard ────────────────────────────────────────────── */
function ProductCard({ product, index, list, canUseCart, isLoggedIn, onCardClick, onAddToCart, addingId, cartItem, onUpdateQty, onRemoveItem, onRequestClick }: {
    product: Product; index: number; list: boolean;
    canUseCart: boolean; isLoggedIn: boolean;
    onCardClick: () => void; onAddToCart: (e: React.MouseEvent) => void;
    addingId: number | null;
    cartItem: { quantity: number } | undefined;
    onUpdateQty: (qty: number) => void; onRemoveItem: () => void;
    onRequestClick: () => void;
}) {
    const previewImage = getProductPreviewImage(product);
    const price = getCustomerPrice(product);
    const netPrice = getNetPrice(product);
    const isWildcard = product.parameters?.type === 'wildcard_group';
    const variantCount = isWildcard ? (product.parameters?.options?.length || 0) : 0;
    const maskedRef = isWildcard ? getWildcardBadgeReference(product.parameters?.masked_reference) : null;
    const catLabel = getCategoryList(product)[0] || product.category || '';

    const effectiveStock = isWildcard
        ? getAvailableVariantStock(product)
        : product.stock_quantity;

    return (
        <div
            className="pcard"
            style={{ position: 'relative', background: T.card, border: `1px solid ${T.line2}`, borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: list ? 'row' : 'column', cursor: 'pointer', transition: 'transform .25s ease,box-shadow .25s ease,border-color .25s ease', animation: `fadeUp .4s ease-out ${Math.min(index * 35, 300)}ms both` }}
            onClick={onCardClick}
            data-product-id={product.id}
        >
            {/* Image */}
            <div style={{ position: 'relative', flexShrink: 0, width: list ? 160 : '100%', height: list ? 160 : 200, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRight: list ? `1px solid ${T.line}` : undefined }}>
                {isLoggedIn && effectiveStock > 0 && (
                    <span style={{ position: 'absolute', top: 12, left: 12, zIndex: 2, fontSize: 11, fontWeight: 700, letterSpacing: '.4px', color: '#1f9d55', background: '#eafaf1', padding: '4px 9px', borderRadius: 7 }}>Skladom</span>
                )}
                {previewImage
                    ? <img className="pimg" src={previewImage} alt={product.name} loading="lazy" style={{ maxWidth: '72%', maxHeight: '82%', objectFit: 'contain', transition: 'transform .5s ease' }} />
                    : <svg width="64" height="64" fill="none" viewBox="0 0 24 24" stroke={T.muted} strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                }
            </div>

            {/* Info */}
            <div style={{ padding: 18, display: 'flex', flexDirection: 'column', flex: 1 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase', color: T.muted }}>{catLabel}</span>
                <h3 style={{ margin: '8px 0 0', fontSize: 18, fontWeight: 700, lineHeight: '24px', color: T.ink }}>{product.name}</h3>
                <p style={{ marginTop: 8, fontSize: 13, color: T.muted }}>
                    Kód: <span style={{ fontFamily: 'monospace', color: T.ink2 }}>{maskedRef || product.reference || '—'}</span>
                    {isWildcard && variantCount > 0 && <> | {variantCount} {variantWord(variantCount)}</>}
                </p>

                {/* CTA / price */}
                <div style={{ marginTop: 'auto', paddingTop: 14 }}>
                    {price ? (
                        <>
                            {netPrice && <p style={{ fontSize: 11, color: T.muted, marginBottom: 2 }}>bez DPH {netPrice} €</p>}
                            <p style={{ fontSize: 16, fontWeight: 700, color: T.blue }}>{price} € s DPH</p>
                            {canUseCart && (
                                <div style={{ marginTop: 10 }} onClick={e => e.stopPropagation()}>
                                    {cartItem ? (
                                        <div style={{ display: 'inline-flex', height: 38, overflow: 'hidden', borderRadius: 10, border: `1px solid ${T.blue}`, background: '#eaf4fe' }}>
                                            <button onClick={() => cartItem.quantity > 1 ? onUpdateQty(cartItem.quantity - 1) : onRemoveItem()} style={{ width: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.blueD, background: 'none', border: 'none', cursor: 'pointer' }}><IMinus /></button>
                                            <span style={{ minWidth: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: T.blueD, background: '#fff' }}>{cartItem.quantity}</span>
                                            <button onClick={() => onUpdateQty(cartItem.quantity + 1)} style={{ width: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.blueD, background: 'none', border: 'none', cursor: 'pointer' }}><IPlus /></button>
                                        </div>
                                    ) : effectiveStock <= 0 ? (
                                        <button onClick={e => { e.stopPropagation(); onRequestClick(); }} style={{ fontSize: 12, fontWeight: 600, color: T.muted, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Požiadať</button>
                                    ) : (
                                        <button onClick={onAddToCart} disabled={addingId === product.id} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 38, padding: '0 16px', borderRadius: 10, background: addingId === product.id ? T.ok : T.blue, color: '#fff', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'background .15s', fontFamily: 'inherit' }}>
                                            <ICart /> {addingId === product.id ? '✓' : 'Do košíka'}
                                        </button>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <div style={{ marginTop: 'auto', paddingTop: 14 }}>
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 46, borderRadius: 10, background: T.blue, color: '#fff', fontSize: 14, fontWeight: 700 }}>
                                <span className="product-price-login-full">Prihláste sa pre cenu</span>
                                <span className="product-price-login-short">Prihláste sa</span>
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ── Pager ──────────────────────────────────────────────────── */
function Pager({ page, pages, setPage }: { page: number; pages: number; setPage: (p: number) => void }) {
    if (pages <= 1) return null;
    const nums: number[] = [];
    for (let i = 1; i <= pages; i++) {
        if (i === 1 || i === pages || (i >= page - 2 && i <= page + 2)) nums.push(i);
    }
    const result: (number | '…')[] = [];
    let prev = 0;
    for (const n of nums) { if (n - prev > 1) result.push('…'); result.push(n); prev = n; }

    return (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 40, paddingBottom: 40, flexWrap: 'wrap' }}>
            {result.map((n, i) => n === '…' ? (
                <span key={`e${i}`} style={{ minWidth: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: T.muted }}>…</span>
            ) : (
                <button key={n} onClick={() => { setPage(n as number); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    style={{ minWidth: 44, height: 44, borderRadius: 12, fontSize: 15, fontWeight: 700, color: n === page ? '#fff' : T.ink, background: n === page ? T.ink : '#fff', border: n === page ? 'none' : `1px solid ${T.line2}`, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {n}
                </button>
            ))}
        </div>
    );
}

/* ── Main page ──────────────────────────────────────────────── */
export default function ProductsPage() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [browseStateToRestore] = useState(() => readProductsBrowseState());
    const skipFilterPageResetRef = useRef(Boolean(browseStateToRestore));
    const restoreAppliedRef = useRef(false);
    const isLoggedIn = authService.isAuthenticated();
    const userIsAdmin = isLoggedIn && isAdmin();
    const canUseCart = isLoggedIn && !userIsAdmin;
    const { addItem, items, updateQuantity, removeItem } = useCartStore();

    const [addingId, setAddingId] = useState<number | null>(null);
    const [productToRequest, setProductToRequest] = useState<Product | null>(null);
    const [openRequestModal, setOpenRequestModal] = useState(false);
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
    const [view, setView] = useState<'grid' | 'list'>(browseStateToRestore?.viewMode ?? 'grid');
    const [page, setPage] = useState(() => {
        if (!browseStateToRestore) return 1;
        return Math.max(1, Math.ceil(browseStateToRestore.loadedProductCount / PAGE_SIZE));
    });

    const typeFromUrl = searchParams.get('type') as ProductTypeFilterValue | null;
    const [F, setF] = useState<FilterState>({
        types: browseStateToRestore?.selectedProductType
            ? [browseStateToRestore.selectedProductType as ProductTypeFilterValue]
            : typeFromUrl ? [typeFromUrl] : [],
        categories: browseStateToRestore?.selectedCategories ?? [],
        compatCode: browseStateToRestore?.selectedCompatibility?.compatibility_code ?? '',
        min: '',
        max: browseStateToRestore && browseStateToRestore.maxPrice < 500 ? String(browseStateToRestore.maxPrice) : '',
        q: browseStateToRestore?.searchQuery ?? '',
        inStockOnly: browseStateToRestore?.inStockOnly ?? false,
        priceSortOrder: browseStateToRestore?.priceSortOrder ?? 'none',
    });
    const [debouncedQ, setDebouncedQ] = useState(F.q);
    useEffect(() => { const t = setTimeout(() => setDebouncedQ(F.q), 400); return () => clearTimeout(t); }, [F.q]);
    useEffect(() => {
        if (skipFilterPageResetRef.current) {
            skipFilterPageResetRef.current = false;
            return undefined;
        }
        const resetTimer = window.setTimeout(() => setPage(1), 0);
        return () => window.clearTimeout(resetTimer);
    }, [F.types, F.categories, F.compatCode, F.min, F.max, debouncedQ, F.inStockOnly, F.priceSortOrder]);

    const { data: compatData = [] } = useQuery({ queryKey: ['compatibility-options'], queryFn: getCompatibilityOptions, staleTime: 10 * 60 * 1000 });
    const sortedCompatibilityOptions = useMemo(() => {
        const m = new Map<string, CompatibilityOption>();
        for (const o of compatData) if (!m.has(o.compatibility_code)) m.set(o.compatibility_code, o);
        return [...m.values()].sort((a, b) => {
            const mk = (c: string) => { const m = c.match(/^(\d+)([A-Za-z]*)$/); return m ? [Number(m[1]), m[2].toUpperCase()] : [Infinity, c]; };
            const [an, as_] = mk(a.compatibility_code), [bn, bs] = mk(b.compatibility_code);
            return an !== bn ? (an as number) - (bn as number) : (as_ as string).localeCompare(bs as string);
        });
    }, [compatData]);

    const buildParams = useCallback((offset: number): ProductListParams => {
        const p: ProductListParams = { limit: PAGE_SIZE, offset };
        if (debouncedQ) p.search = debouncedQ;
        if (F.categories.length > 0) p.categories = F.categories;
        if (F.types.length === 1) p.product_type = F.types[0] as ProductTypeFilterValue;
        if (F.compatCode) {
            const opt = sortedCompatibilityOptions.find(o => o.compatibility_code === F.compatCode);
            if (opt) { p.compatibility_section = opt.section; p.compatibility_code = opt.compatibility_code; }
        }
        const maxNum = Number(F.max);
        if (F.max && maxNum < 500) p.max_price = maxNum;
        if (F.priceSortOrder === 'asc') p.ordering = 'price';
        else if (F.priceSortOrder === 'desc') p.ordering = '-price';
        return p;
    }, [debouncedQ, F.categories, F.types, F.compatCode, F.max, F.priceSortOrder, sortedCompatibilityOptions]);

    const { data, isFetching, isLoading, error } = useQuery({
        queryKey: ['products', debouncedQ, F.categories, F.types, F.compatCode, F.max, F.priceSortOrder, page],
        queryFn: () => getProducts(buildParams((page - 1) * PAGE_SIZE)),
        placeholderData: keepPreviousData,
    });

    const allProducts = useMemo(() => {
        let ps = data?.results || [];
        if (F.inStockOnly) {
            ps = ps.filter(p => {
                if (p.parameters?.type === 'wildcard_group') return getAvailableVariantStock(p) > 0;
                return p.stock_quantity > 0;
            });
        }
        return ps;
    }, [data?.results, F.inStockOnly]);

    const totalCount = data?.count ?? 0;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;
    const start = (page - 1) * PAGE_SIZE;

    useEffect(() => {
        if (!browseStateToRestore || restoreAppliedRef.current || isLoading || isFetching) return;
        restoreAppliedRef.current = true;
        window.setTimeout(() => {
            const card = document.querySelector<HTMLElement>(`[data-product-id="${browseStateToRestore.targetProductId}"]`);
            if (card) {
                card.scrollIntoView({ block: 'center', behavior: 'auto' });
            } else {
                window.scrollTo({ top: browseStateToRestore.scrollY, behavior: 'auto' });
            }
            clearProductsBrowseState();
        }, 0);
    }, [allProducts, browseStateToRestore, isFetching, isLoading]);

    const { data: allCategories = [] } = useQuery({ queryKey: ['products-categories'], queryFn: getProductCategories, staleTime: 5 * 60 * 1000 });
    const { data: compatibilityCounts = {} } = useQuery({ queryKey: ['compatibility-counts'], queryFn: getCompatibilityCounts, staleTime: Infinity });
    const { data: categoryCounts = {} } = useQuery({ queryKey: ['category-counts'], queryFn: getCategoryCounts, staleTime: Infinity });
    const { data: productTypeCounts = {}, isLoading: ptcLoading } = useQuery({ queryKey: ['product-type-counts'], queryFn: getProductTypeCounts, staleTime: Infinity });

    const availableTypeFilters = useMemo(() =>
        PRODUCT_TYPE_FILTERS.filter(opt => {
            if (ptcLoading || !Object.keys(productTypeCounts).length) return false;
            return (productTypeCounts[opt.value] || 0) > 0 || F.types.includes(opt.value);
        }),
    [productTypeCounts, ptcLoading, F.types]);

    useEffect(() => {
        const h = () => {
            void queryClient.invalidateQueries({ queryKey: ['category-counts'] });
            void queryClient.invalidateQueries({ queryKey: ['compatibility-counts'] });
            void queryClient.invalidateQueries({ queryKey: ['product-type-counts'] });
            void queryClient.invalidateQueries({ queryKey: ['products-categories'] });
        };
        window.addEventListener(PRODUCT_STATS_CACHE_INVALIDATED_EVENT, h);
        return () => window.removeEventListener(PRODUCT_STATS_CACHE_INVALIDATED_EVENT, h);
    }, [queryClient]);

    const handleProductClick = (product: Product) => {
        writeProductsBrowseState({
            searchQuery: F.q,
            selectedCategories: F.categories,
            selectedCompatibility: sortedCompatibilityOptions.find(o => o.compatibility_code === F.compatCode) ?? null,
            selectedProductType: (F.types[0] || '') as ProductTypeFilterValue | '',
            priceSortOrder: F.priceSortOrder, maxPrice: Number(F.max) || 500,
            inStockOnly: F.inStockOnly, viewMode: view, targetProductId: product.id,
            scrollY: window.scrollY, loadedProductCount: start + allProducts.length,
        });
        navigate(`/products/${product.id}`);
    };

    const getBundledScrewForProduct = async (
        product: Product,
        variant?: ProductOption
    ) => {
        if (!isTiBaseProduct(product)) return undefined;
        const compatibilityCode = getFirstCompatibilityCode(product, variant);
        const data = await queryClient.fetchQuery({
            queryKey: ['compatible-screws', product.id, compatibilityCode],
            queryFn: () => getCompatibleScrews(product.id, compatibilityCode),
            staleTime: 5 * 60 * 1000,
        });
        const screw = data.screws.find(s => s.stock_quantity > 0) || data.screws[0];
        if (!screw) return undefined;
        if (screw.stock_quantity <= 0) {
            toast.error('Kompatibilná skrutka nie je skladom.');
            return null;
        }
        return { productId: screw.id, name: screw.name, reference: screw.reference };
    };

    const handleAddToCart = async (e: React.MouseEvent, product: Product) => {
        e.stopPropagation();
        if (!canUseCart) { toast.error('Pre nákup sa prihláste.'); return; }
        if (product.parameters?.type === 'wildcard_group' && (product.parameters.options || []).length > 0) {
            const variant = getFirstAvailableVariant(product);
            if (!variant) {
                setProductToRequest(product);
                setOpenRequestModal(true);
                return;
            }
            const variantPrice = variant.gross_price ?? variant.price ?? getCustomerPrice(product);
            if (!variantPrice) { toast.error('Pre tento variant chýba cena.'); return; }
            const variantStock = variant.stock_quantity ?? 0;
            const cur = items.find(i => i.productId === product.id && i.variantReference === variant.reference)?.quantity ?? 0;
            if (cur >= variantStock) { toast.error(`Na sklade je iba ${variantStock} ks.`); return; }
            setAddingId(product.id);
            const bundledScrew = await getBundledScrewForProduct(product, variant);
            if (bundledScrew === null) { setAddingId(null); return; }
            addItem({
                productId: product.id,
                name: product.name,
                price: variantPrice,
                netPrice: variant.price ?? null,
                image: variant.image || getProductPreviewImage(product),
                stockQuantity: variantStock,
                variantReference: variant.reference,
                variantLabel: getVariantLabel(variant),
                bundledScrew,
            });
            toast.success('Pridané do košíka');
            setTimeout(() => setAddingId(null), 900);
            return;
        }
        if (product.stock_quantity <= 0) { toast.error('Produkt nie je skladom.'); return; }
        const cur = items.find(i => i.productId === product.id && !i.variantReference)?.quantity ?? 0;
        if (cur >= product.stock_quantity) { toast.error(`Na sklade je iba ${product.stock_quantity} ks.`); return; }
        setAddingId(product.id);
        const bundledScrew = await getBundledScrewForProduct(product);
        if (bundledScrew === null) { setAddingId(null); return; }
        addItem({ productId: product.id, name: product.name, price: getCustomerPrice(product)!, netPrice: getNetPrice(product), image: getProductPreviewImage(product), stockQuantity: product.stock_quantity, bundledScrew });
        setTimeout(() => setAddingId(null), 600);
    };

    const activeFilterChips: [string, () => void][] = [];
    F.types.forEach(t => { const opt = PRODUCT_TYPE_FILTERS.find(o => o.value === t); if (opt) activeFilterChips.push([opt.label, () => setF(f => ({ ...f, types: f.types.filter(x => x !== t) }))]); });
    F.categories.forEach(c => activeFilterChips.push([c, () => setF(f => ({ ...f, categories: f.categories.filter(x => x !== c) }))]));
    if (F.compatCode) activeFilterChips.push([F.compatCode, () => setF(f => ({ ...f, compatCode: '' }))]);
    if (F.min) activeFilterChips.push([`od ${F.min} €`, () => setF(f => ({ ...f, min: '' }))]);
    if (F.max) activeFilterChips.push([`do ${F.max} €`, () => setF(f => ({ ...f, max: '' }))]);
    if (F.inStockOnly) activeFilterChips.push(['Len skladom', () => setF(f => ({ ...f, inStockOnly: false }))]);
    const resetAll = () => setF({ types: [], categories: [], compatCode: '', min: '', max: '', q: '', inStockOnly: false, priceSortOrder: 'none' });

    const canonicalUrl = `${SEO_SITE_URL}/products`;

    if (isLoading && !data) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', background: T.bg }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', border: `3px solid ${T.line2}`, borderTopColor: T.blue, animation: 'spin 0.8s linear infinite' }} />
        </div>
    );

    if (error) return (
        <div style={{ textAlign: 'center', padding: '80px 20px', background: T.bg }}>
            <p style={{ color: '#c0392b', fontSize: 16 }}>Chyba pri načítavaní produktov. Skúste to prosím neskôr.</p>
        </div>
    );

    return (
        <div style={{ background: T.bg, minHeight: '100vh', fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif" }}>
            <style>{`
                @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
                @keyframes spin{to{transform:rotate(360deg)}}
                @keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
                @keyframes overlayIn{from{opacity:0}to{opacity:1}}
                .pcard:hover{transform:translateY(-3px);box-shadow:0 14px 36px rgba(15,23,42,.10);border-color:#cfe6fb!important}
                .pcard:hover .pimg{transform:scale(1.05)}
                @media(max-width:1100px){.products-grid{grid-template-columns:repeat(3,1fr)!important}}
                @media(max-width:900px){.shell-grid{grid-template-columns:1fr!important}.filter-col{display:none!important}.mfilter-btn{display:flex!important}}
                @media(max-width:560px){.products-grid{grid-template-columns:1fr 1fr!important;gap:12px!important}}
                @media(max-width:400px){.products-grid{grid-template-columns:1fr!important}}
                @media(max-width:900px){.hero-row{flex-direction:column!important;align-items:flex-start!important;gap:24px!important}.hero-badge{width:100%!important}}
                .product-price-login-short{display:none}
                @media(max-width:560px){.product-price-login-full{display:none}.product-price-login-short{display:inline}}
            `}</style>

            <Helmet>
                <title>Dynamic Abutment Solutions – Implant Components & CAD/CAM Solutions</title>
                <meta name="description" content="Shop premium Dynamic Abutment Solutions products: TiBase scanning bodies, Multi-Unit abutments, custom CAD/CAM solutions, and more. Official distributor for Slovakia." />
                <link rel="canonical" href={canonicalUrl} />
                <meta property="og:type" content="website" />
                <meta property="og:title" content="Dynamic Abutment Solutions Products" />
                <meta property="og:url" content={canonicalUrl} />
            </Helmet>

            <main style={{ maxWidth: 1440, margin: '0 auto', padding: '32px 32px 0', boxSizing: 'border-box' }}>

                {/* HERO */}
                <section style={{ background: T.card, borderRadius: 20, padding: 32, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.5),0 1px 2px rgba(0,0,0,.05)' }}>
                    <div className="hero-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 40 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <h1 style={{ fontSize: 40, lineHeight: '50px', fontWeight: 700, letterSpacing: '-0.8px', color: T.ink, margin: 0 }}>Dynamic Abutment Solutions</h1>
                            <p style={{ marginTop: 8, maxWidth: 672, fontSize: 18, lineHeight: '28px', color: T.ink2, marginBottom: 0 }}>Líder v uhlových abutmentoch a digitálnych workflow pre modernú implantológiu. Komplexné riešenia – od skenovacích tiel TiBase, Multi‑Unit abutmentov, až po CAD/CAM individuálne suprakonštrukcie.</p>
                        </div>
                        <div className="hero-badge" style={{ width: 430, flexShrink: 0, paddingTop: 8, borderTop: `1px solid ${T.line}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 24, color: T.blue }}>
                                <IBadge />
                                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.6px' }}>OFICIÁLNY DISTRIBÚTOR</span>
                            </div>
                            <p style={{ marginTop: 8, fontSize: 14, lineHeight: '20px', color: T.ink2, marginBottom: 0 }}>Všetky produkty sú originálne z oficálneho distribútora</p>
                        </div>
                    </div>
                </section>

                {/* SHELL */}
                <div className="shell-grid" style={{ display: 'grid', gridTemplateColumns: '272px 1fr', gap: 32, marginTop: 32, alignItems: 'start' }}>

                    {/* SIDEBAR */}
                    <aside className="filter-col" style={{ position: 'sticky', top: 88 }}>
                        <div style={{ background: T.card, border: `1px solid ${T.line2}`, borderRadius: 16, padding: 24 }}>
                            <FilterPanel
                                F={F} setF={setF}
                                productTypeCounts={productTypeCounts}
                                allCategories={allCategories}
                                categoryCounts={categoryCounts}
                                sortedCompatibilityOptions={sortedCompatibilityOptions}
                                compatibilityCounts={compatibilityCounts}
                                availableTypeFilters={availableTypeFilters}
                            />
                        </div>
                    </aside>

                    {/* CONTENT */}
                    <section>
                        <Toolbar q={F.q} setQ={q => setF(f => ({ ...f, q }))} sort={F.priceSortOrder} setSort={s => setF(f => ({ ...f, priceSortOrder: s as FilterState['priceSortOrder'] }))} view={view} setView={setView} />

                        {/* Mobile filter button */}
                        <div className="mfilter-btn" style={{ display: 'none', marginTop: 14 }}>
                            <button onClick={() => setMobileFiltersOpen(true)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 42, padding: '0 16px', borderRadius: 11, background: '#fff', border: `1px solid ${T.line2}`, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                                <IFilter /> Filtre
                                {activeFilterChips.length > 0 && <span style={{ background: T.blue, color: '#fff', borderRadius: '50%', width: 20, height: 20, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{activeFilterChips.length}</span>}
                            </button>
                        </div>

                        {/* Count */}
                        <p style={{ margin: '20px 0 14px', fontSize: 14, color: T.ink2 }}>
                            Zobrazených <b>{allProducts.length ? start + 1 : 0}–{Math.min(start + allProducts.length, totalCount)}</b> z <b>{totalCount}</b> produktov
                        </p>

                        {/* Active filter chips */}
                        {activeFilterChips.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.6px', color: T.muted }}>AKTÍVNE FILTRE:</span>
                                {activeFilterChips.map(([label, rm], i) => (
                                    <button key={i} onClick={rm} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 32, padding: '0 12px', borderRadius: 9, fontSize: 13, fontWeight: 600, background: '#fff', border: `1px solid ${T.line2}`, cursor: 'pointer', fontFamily: 'inherit' }}>
                                        {label} <IClose size={12} />
                                    </button>
                                ))}
                                <button onClick={resetAll} style={{ fontSize: 13, fontWeight: 600, color: T.blue, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Vymazať všetky filtre</button>
                            </div>
                        )}

                        {/* Grid */}
                        {allProducts.length === 0 && !isFetching ? (
                            <div style={{ textAlign: 'center', padding: '72px 20px', background: '#fff', borderRadius: 16, border: `1px solid ${T.line2}` }}>
                                <p style={{ fontSize: 16, color: T.ink2 }}>Žiadne produkty nevyhovujú zvoleným filtrom.</p>
                                <button onClick={resetAll} style={{ marginTop: 14, fontSize: 14, fontWeight: 600, color: T.blue, background: 'none', border: 'none', cursor: 'pointer' }}>Vymazať filtre</button>
                            </div>
                        ) : (
                            <div
                                className="products-grid"
                                style={{ display: 'grid', gridTemplateColumns: view === 'list' ? '1fr' : 'repeat(4,1fr)', gap: view === 'list' ? 14 : 20, opacity: isFetching ? 0.6 : 1, transition: 'opacity .2s' }}
                            >
                                {allProducts.map((product, index) => {
                                    const cartItem = items.find(i => i.productId === product.id && (product.parameters?.type === 'wildcard_group' ? !!i.variantReference : !i.variantReference));
                                    return (
                                        <ProductCard
                                            key={product.id} product={product} index={index} list={view === 'list'}
                                            canUseCart={canUseCart} isLoggedIn={isLoggedIn}
                                            onCardClick={() => handleProductClick(product)}
                                            onAddToCart={e => handleAddToCart(e, product)}
                                            addingId={addingId} cartItem={cartItem}
                                            onUpdateQty={qty => updateQuantity(product.id, qty, cartItem?.variantReference)}
                                            onRemoveItem={() => removeItem(product.id, cartItem?.variantReference)}
                                            onRequestClick={() => { setProductToRequest(product); setOpenRequestModal(true); }}
                                        />
                                    );
                                })}
                            </div>
                        )}

                        <Pager page={page} pages={totalPages} setPage={setPage} />
                    </section>
                </div>
            </main>

            {/* Mobile filter drawer */}
            {mobileFiltersOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 80 }}>
                    <div onClick={() => setMobileFiltersOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(15,18,22,.45)', animation: 'overlayIn .2s ease' }} />
                    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '88vh', overflowY: 'auto', background: '#fff', borderRadius: '20px 20px 0 0', padding: '20px 22px 32px', animation: 'sheetUp .28s cubic-bezier(.22,1,.36,1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <strong style={{ fontSize: 16 }}>Filtre</strong>
                            <button onClick={() => setMobileFiltersOpen(false)} style={{ width: 36, height: 36, borderRadius: 10, background: '#f4f5f6', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', color: T.ink2 }}><IClose /></button>
                        </div>
                        <FilterPanel
                            F={F} setF={setF}
                            productTypeCounts={productTypeCounts}
                            allCategories={allCategories}
                            categoryCounts={categoryCounts}
                            sortedCompatibilityOptions={sortedCompatibilityOptions}
                            compatibilityCounts={compatibilityCounts}
                            availableTypeFilters={availableTypeFilters}
                        />
                        <button onClick={() => setMobileFiltersOpen(false)}
                            style={{ marginTop: 20, width: '100%', height: 48, borderRadius: 12, background: T.blue, color: '#fff', fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                            Zobraziť {totalCount} produktov
                        </button>
                    </div>
                </div>
            )}

            <RequestProductModal
                open={openRequestModal} onClose={() => setOpenRequestModal(false)}
                productId={productToRequest?.id || 0} productName={productToRequest?.name || ''} productReference={productToRequest?.reference || ''} />
        </div>
    );
}
