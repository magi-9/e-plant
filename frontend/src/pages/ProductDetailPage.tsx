import { Fragment, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { getCompatibleScrews, getProduct, getProducts, type Product } from '../api/products';
import CatalogPdfViewer from '../components/CatalogPdfViewer';
import DropdownSelect from '../components/DropdownSelect';
import RequestProductModal from '../components/RequestProductModal';
import { authService } from '../api/authService';
import { isAdmin } from '../api/auth';
import { useCartStore } from '../store/cartStore';
import { buildDescriptionParts } from '../utils/productDescription';
import { getOrderedCategories } from '../utils/productCategories';
import { getProductPreviewImage } from '../utils/productImages';
import { sortByFirstOptionTokenValue } from '../utils/variantOptions';
import toast from 'react-hot-toast';

type ProductVariant = NonNullable<NonNullable<Product['parameters']>['options']>[number];

const getCustomerPrice = (product: Product | ProductVariant): string | null =>
    product.gross_price ?? product.price ?? null;

const getNetPrice = (product: Product | ProductVariant): string | null => product.price ?? null;

const isTiBaseProduct = (product: Product): boolean => {
    const haystack = [
        product.reference, product.category, product.name,
        product.wildcard_group_name, product.parameters?.wildcard_reference,
        product.parameters?.catalog_section,
    ].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes('tibase') || haystack.includes('titanium base') || (product.reference || '').startsWith('31.');
};

const getVariantLabel = (option: ProductVariant): string => {
    const tokens = (option.option_tokens || '').split('|').map(t => t.trim()).filter(Boolean);
    const ghToken = tokens.find(token => /^GH\s*\(/i.test(token) || /^GH\s*:/i.test(token));
    const parts: string[] = [];
    if (ghToken) {
        const sep = ghToken.indexOf(':');
        const value = sep >= 0 ? ghToken.slice(sep + 1).trim() : ghToken.trim();
        parts.push(`GH ${value}${/mm/i.test(value) ? '' : ' mm'}`);
    }
    if (option.engaging === 1) parts.push('Engaging');
    if (option.engaging === 0) parts.push('Non-engaging');
    if (parts.length > 0) return parts.join(' · ');
    if (option.label && option.label !== option.reference && option.label !== option.name) return option.label;
    const visibleTokens = tokens.filter(token => {
        const key = token.slice(0, token.indexOf(':') >= 0 ? token.indexOf(':') : token.length).trim().toUpperCase();
        return !['ADAPTOR', 'SCREWDRIVER', 'SCREWDRIVER ADAPTOR', 'DYNAMIC SCREW'].includes(key);
    });
    if (visibleTokens.length > 0) return visibleTokens.slice(0, 2).join(' · ');
    return option.label || option.parameter_code || option.reference || option.name || 'Variant';
};

const isSelectableVariant = (option: ProductVariant): boolean => {
    const tokens = (option.option_tokens || '').split('|').map(t => t.trim()).filter(Boolean);
    const typeToken = tokens.find(token => token.toUpperCase().startsWith('TYPE:'));
    const typeValue = typeToken?.slice(typeToken.indexOf(':') + 1).trim().toUpperCase();
    if (typeValue && ['ADAPTOR', 'SCREWDRIVER', 'SCREWDRIVER ADAPTOR', 'DYNAMIC SCREW'].includes(typeValue)) return false;

    const name = `${option.name || ''} ${option.category || ''}`.toUpperCase();
    return !/\b(SCREWDRIVER ADAPTOR|SCREWDRIVER|ADAPTOR|DYNAMIC SCREW)\b/.test(name);
};

const formatParsedKey = (key: string): string =>
    key.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());

const formatParsedValue = (value: unknown): string => {
    if (value === null || value === undefined || value === '') return '';
    if (Array.isArray(value)) return value.map(formatParsedValue).filter(Boolean).join(', ');
    if (typeof value === 'object') {
        return Object.entries(value as Record<string, unknown>)
            .map(([key, nestedValue]) => {
                const formatted = formatParsedValue(nestedValue);
                return formatted ? `${formatParsedKey(key)}: ${formatted}` : '';
            })
            .filter(Boolean)
            .join(' | ');
    }
    return String(value);
};

const getParsedDetailRows = (details: unknown): Array<{ key: string; value: string }> => {
    if (!details || typeof details !== 'object' || Array.isArray(details)) return [];
    return Object.entries(details as Record<string, unknown>)
        .map(([key, value]) => ({ key: formatParsedKey(key), value: formatParsedValue(value) }))
        .filter(row => row.value.length > 0);
};

const getEngagingAnswer = (value: number | null | undefined): string => {
    if (value === 1) return 'Áno';
    if (value === 0) return 'Nie';
    return 'Neuvedené';
};

/* ── Design tokens ─────────────────────────────────────────── */
const T = {
    bg: '#f0f1f3', card: '#fff', ink: '#1a1c1e', ink2: '#45474c',
    muted: '#94a3b8', line: '#eef0f2', line2: '#e2e8f0',
    blue: '#2196f3', blueD: '#1565c0',
    purpleBg: '#f6f0fd', purpleText: '#6b3fa0', purpleBorder: '#e6d9f5',
    greenBg: '#f1fbf6', greenBorder: '#cdeede', greenText: '#1f9d55',
};

/* ── SVG icons ─────────────────────────────────────────────── */
const IBack    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>;
const IBook    = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>;
const ITag     = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>;
const IStar    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const ICart    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1.4"/><circle cx="19" cy="21" r="1.4"/><path d="M2.5 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L23 7H6"/></svg>;
const IZoom    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35M11 8v6M8 11h6"/></svg>;

/* ── RelatedProductCard (vertical) ──────────────────────────── */
function RelatedProductCard({ product }: { product: Product }) {
    const image = getProductPreviewImage(product);
    const price = getCustomerPrice(product);
    return (
        <Link to={`/products/${product.id}`} style={{ textDecoration: 'none', display: 'block' }}>
            <div style={{ background: T.card, border: `1px solid ${T.line2}`, borderRadius: 16, overflow: 'hidden', transition: 'transform .2s,box-shadow .2s,border-color .2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 28px rgba(15,23,42,.10)'; (e.currentTarget as HTMLElement).style.borderColor = '#cfe6fb'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; (e.currentTarget as HTMLElement).style.borderColor = T.line2; }}
            >
                <div style={{ height: 160, background: '#f7f8fa', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {image
                        ? <img src={image} alt={product.name} style={{ maxWidth: '70%', maxHeight: '80%', objectFit: 'contain' }} />
                        : <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke={T.muted} strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                    }
                </div>
                <div style={{ padding: '14px 16px 18px' }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: T.ink, margin: 0, lineHeight: '20px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{product.name}</h3>
                    {product.reference && <p style={{ marginTop: 4, fontSize: 12, color: T.muted, fontFamily: 'monospace' }}>{product.reference}</p>}
                    <div style={{ marginTop: 12 }}>
                        {price
                            ? <p style={{ fontSize: 14, fontWeight: 700, color: T.blueD }}>{price} € s DPH</p>
                            : <span style={{ display: 'inline-flex', alignItems: 'center', height: 24, padding: '0 10px', borderRadius: 20, background: '#eaf4fe', fontSize: 12, fontWeight: 700, color: T.blueD }}>Pre cenu sa prihláste</span>
                        }
                    </div>
                </div>
            </div>
        </Link>
    );
}

export default function ProductDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isLoggedIn = authService.isAuthenticated();
    const canUseCart = isLoggedIn && !isAdmin();
    const { addItem, items, updateQuantity, removeItem } = useCartStore();
    const [selectedVariantRef, setSelectedVariantRef] = useState('');
    const [selectedScrewId, setSelectedScrewId] = useState<number | null>(null);
    const [imageZoomOrigin, setImageZoomOrigin] = useState('50% 50%');
    const [imageHovered, setImageHovered] = useState(false);
    const [catalogOpen, setCatalogOpen] = useState(false);
    const [requestOpen, setRequestOpen] = useState(false);

    const productId = Number(id);
    const productQuery = useQuery({
        queryKey: ['product-detail', productId],
        queryFn: () => getProduct(productId),
        enabled: Number.isFinite(productId),
    });

    const product = productQuery.data;
    const variantOptions = useMemo(
        () => sortByFirstOptionTokenValue(product?.parameters?.options || []).filter(isSelectableVariant),
        [product?.parameters?.options]
    );
    const activeVariant = variantOptions.find(o => o.reference === selectedVariantRef) || variantOptions[0] || null;
    const hasVariants = product?.parameters?.type === 'wildcard_group' && variantOptions.length > 0;
    const effectiveItem = hasVariants && activeVariant ? activeVariant : product;
    const effectiveName = effectiveItem?.name || product?.name || '';
    const effectiveReference = activeVariant?.reference || product?.reference || '';
    const effectiveDescription = effectiveItem?.description || product?.description || '';
    const effectiveCategory = effectiveItem?.category || product?.category || '';
    const effectiveAllCategories = effectiveItem?.all_categories || product?.all_categories || product?.parameters?.all_categories || effectiveCategory;
    const effectiveImage = activeVariant?.image || getProductPreviewImage(product || ({} as Product));
    const effectivePrice = effectiveItem ? getCustomerPrice(effectiveItem) : null;
    const effectiveNetPrice = effectiveItem ? getNetPrice(effectiveItem) : null;
    const effectiveStock = hasVariants ? (activeVariant?.stock_quantity ?? 0) : (product?.stock_quantity ?? 0);
    const compatibilityCodes = (activeVariant?.compatibility_codes?.length ? activeVariant.compatibility_codes : product?.compatibility_codes) || [];
    const selectedCompatibilityCode = compatibilityCodes[0] || product?.compatibility_code || '';
    const categories = product
        ? getOrderedCategories({ ...product, category: effectiveCategory, all_categories: effectiveAllCategories }, [], '')
        : [];
    const descriptionParts = effectiveDescription
        ? buildDescriptionParts(effectiveDescription, hasVariants, activeVariant, effectiveReference)
        : [];
    const parsedDetailRows = useMemo(
        () => getParsedDetailRows(product?.parameters?.details),
        [product?.parameters?.details]
    );

    const compatibleProductsQuery = useQuery({
        queryKey: ['related-products', 'compatibility', product?.id, selectedCompatibilityCode],
        queryFn: async () => {
            if (!selectedCompatibilityCode) return [];
            const data = await getProducts({ compatibility_code: selectedCompatibilityCode, limit: 12 });
            return data.results.filter(item => item.id !== product?.id);
        },
        enabled: !!product && !!selectedCompatibilityCode,
    });

    const similarProductsQuery = useQuery({
        queryKey: ['related-products', 'category', product?.id, categories[0]],
        queryFn: async () => {
            if (!categories[0]) return [];
            const data = await getProducts({ categories: [categories[0]], limit: 12 });
            return data.results.filter(item => item.id !== product?.id);
        },
        enabled: !!product && !!categories[0],
    });

    const compatibleScrewsQuery = useQuery({
        queryKey: ['compatible-screws', product?.id, selectedCompatibilityCode],
        queryFn: () => getCompatibleScrews(product!.id, selectedCompatibilityCode),
        enabled: !!product && isTiBaseProduct(product),
    });
    const compatibleScrews = compatibleScrewsQuery.data?.screws || [];

    const relatedProducts = useMemo(() => {
        const byId = new Map<number, Product>();
        [...(compatibleProductsQuery.data || []), ...(similarProductsQuery.data || [])].forEach(item => {
            if (item.id !== product?.id) byId.set(item.id, item);
        });
        return Array.from(byId.values()).slice(0, 8);
    }, [compatibleProductsQuery.data, product?.id, similarProductsQuery.data]);

    const cartItem = product ? items.find(
        item => item.productId === product.id && (item.variantReference || '') === (activeVariant?.reference || '')
    ) : null;
    const defaultScrew = compatibleScrews.find(s => s.stock_quantity > 0) || compatibleScrews[0] || null;
    const selectedScrew = compatibleScrews.find(s => s.id === selectedScrewId) || defaultScrew;
    const selectedEffectiveScrewId = selectedScrew?.id ?? null;

    const handleAddToCart = () => {
        if (!product || !effectiveItem || !effectivePrice) return;
        if (!canUseCart) { navigate('/login'); return; }
        if (effectiveStock <= 0) { toast.error('Produkt nie je skladom.'); return; }
        if (compatibleScrews.length > 0 && (!selectedScrew || selectedScrew.stock_quantity === 0)) {
            toast.error('Vybraná skrutka nie je skladom.'); return;
        }
        addItem({
            productId: product.id, name: effectiveName, price: effectivePrice,
            netPrice: effectiveNetPrice, image: effectiveImage, stockQuantity: effectiveStock,
            variantReference: activeVariant?.reference || undefined,
            variantLabel: activeVariant ? getVariantLabel(activeVariant) : undefined,
            bundledScrew: selectedScrew ? { productId: selectedScrew.id, name: selectedScrew.name, reference: selectedScrew.reference } : undefined,
        });
    };

    if (productQuery.isLoading) {
        return (
            <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${T.line2}`, borderTopColor: T.blue, animation: 'spin .8s linear infinite' }} />
                <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
            </div>
        );
    }

    if (!product) {
        return (
            <div style={{ minHeight: '60vh', padding: '64px 32px', background: T.bg }}>
                <div style={{ maxWidth: 1440, margin: '0 auto' }}>
                    <button type="button" onClick={() => navigate('/products')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: T.blueD, background: 'none', border: 'none', cursor: 'pointer' }}>
                        <IBack /> Späť na produkty
                    </button>
                    <p style={{ marginTop: 32, fontSize: 18, fontWeight: 600, color: T.ink }}>Produkt sa nepodarilo nájsť.</p>
                </div>
            </div>
        );
    }

    const hasDetails = descriptionParts.length > 0 || categories.length > 0 || activeVariant?.option_tokens || parsedDetailRows.length > 0 || hasVariants;

    return (
        <>
            <Helmet>
                <title>{effectiveName} | Ebringer</title>
                <meta name="description" content={effectiveDescription || product.name} />
            </Helmet>

            <style>{`
                @keyframes spin{to{transform:rotate(360deg)}}
                @media(max-width:900px){.detail-grid{grid-template-columns:1fr!important}}
                @media(max-width:700px){.related-grid{grid-template-columns:1fr 1fr!important}}
                @media(max-width:480px){.related-grid{grid-template-columns:1fr!important}}
                @media(max-width:900px){.details-table{grid-template-columns:1fr!important}}
            `}</style>

            <main style={{ background: T.bg, minHeight: '100vh', fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif" }}>

                {/* Breadcrumb bar */}
                <div style={{ background: '#fff', borderBottom: `1px solid ${T.line2}`, height: 58, display: 'flex', alignItems: 'center' }}>
                    <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 32px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxSizing: 'border-box' }}>
                        <button type="button" onClick={() => navigate('/products')}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: T.ink2, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                            <IBack /> Produkty
                        </button>
                        {effectiveReference && (
                            <button type="button" onClick={() => setCatalogOpen(true)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 36, padding: '0 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, color: T.blueD, background: '#eaf4fe', border: `1px solid rgba(33,150,243,0.2)`, cursor: 'pointer', fontFamily: 'inherit' }}>
                                <IBook /> Pozrieť v katalógu
                            </button>
                        )}
                    </div>
                </div>

                {/* Main section */}
                <section style={{ maxWidth: 1440, margin: '0 auto', padding: '32px 32px 0', boxSizing: 'border-box' }}>
                    <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.1fr) minmax(380px,.9fr)', gap: 28, alignItems: 'start' }}>

                        {/* Image panel */}
                        <div style={{ background: T.card, borderRadius: 18, border: `1px solid ${T.line2}`, overflow: 'hidden' }}>
                            <div
                                style={{ position: 'relative', aspectRatio: '4/3', minHeight: 300, background: '#f7f8fa', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: effectiveImage ? 'zoom-in' : 'default', overflow: 'hidden' }}
                                onMouseMove={e => { const r = e.currentTarget.getBoundingClientRect(); setImageZoomOrigin(`${((e.clientX-r.left)/r.width)*100}% ${((e.clientY-r.top)/r.height)*100}%`); }}
                                onMouseEnter={() => setImageHovered(true)}
                                onMouseLeave={() => { setImageHovered(false); setImageZoomOrigin('50% 50%'); }}
                            >
                                {effectiveImage ? (
                                    <>
                                        <img src={effectiveImage} alt={effectiveName}
                                            style={{ maxWidth: '72%', maxHeight: '80%', objectFit: 'contain', transition: 'transform .3s ease', transform: imageHovered ? `scale(1.6)` : 'scale(1)', transformOrigin: imageZoomOrigin }} />
                                        {imageHovered && (
                                            <div style={{ position: 'absolute', top: 12, right: 12, display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 8, background: 'rgba(255,255,255,.9)', padding: '6px 10px', fontSize: 12, fontWeight: 600, color: T.ink2 }}>
                                                <IZoom /> Zoom
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <svg width="72" height="72" fill="none" viewBox="0 0 24 24" stroke={T.muted} strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                                )}
                            </div>
                        </div>

                        {/* Info panel */}
                        <div>
                            <div style={{ background: T.card, borderRadius: 18, border: `1px solid ${T.line2}`, padding: 28 }}>
                                {/* Category chips */}
                                {categories.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                                        {categories.slice(0, 4).map(cat => (
                                            <span key={cat} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 26, padding: '0 10px', borderRadius: 8, background: '#eaf4fe', color: T.blueD, fontSize: 12, fontWeight: 700 }}>
                                                <ITag /> {cat}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <h1 style={{ fontSize: 28, fontWeight: 700, lineHeight: '36px', color: T.ink, margin: 0 }}>{effectiveName}</h1>
                                {effectiveReference && <p style={{ marginTop: 6, fontSize: 13, fontWeight: 600, color: T.muted, fontFamily: 'monospace' }}>{effectiveReference}</p>}

                                {/* Compatibility badges — PURPLE */}
                                {compatibilityCodes.length > 0 && (
                                    <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                        {compatibilityCodes.map(code => (
                                            <span key={code} style={{ display: 'inline-flex', height: 28, padding: '0 10px', borderRadius: 8, border: `1px solid ${T.purpleBorder}`, background: T.purpleBg, color: T.purpleText, fontSize: 12, fontWeight: 700, alignItems: 'center' }}>
                                                {code}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Variant selector */}
                                {hasVariants && (
                                    <div style={{ marginTop: 20 }}>
                                        <p style={{ marginBottom: 8, fontSize: 11, fontWeight: 700, letterSpacing: '.6px', color: T.muted }}>VARIANT</p>
                                        <DropdownSelect
                                            value={activeVariant?.reference || ''}
                                            onChange={setSelectedVariantRef}
                                            options={variantOptions.map(o => ({ value: o.reference, label: getVariantLabel(o) }))}
                                            placeholder="Vybrať variant"
                                        />
                                    </div>
                                )}

                                {/* TiBase screw section — green */}
                                {isTiBaseProduct(product) && (
                                    <div style={{ marginTop: 20, borderRadius: 12, border: `1px solid ${T.greenBorder}`, background: T.greenBg, padding: 16 }}>
                                        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.6px', color: T.muted, marginBottom: 12 }}>
                                            SKRUTKA <span style={{ color: T.greenText }}>({cartItem?.quantity ?? 1} ks zadarmo)</span>
                                        </p>
                                        {compatibleScrewsQuery.isLoading ? (
                                            <p style={{ fontSize: 14, color: T.ink2 }}>Načítavam skrutky...</p>
                                        ) : compatibleScrews.length === 0 ? (
                                            <p style={{ fontSize: 14, color: T.ink2 }}>Kompatibilná skrutka nie je k dispozícii.</p>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                {compatibleScrews.map(screw => (
                                                    <label key={screw.id} style={{ display: 'flex', alignItems: 'center', gap: 12, borderRadius: 10, border: `1px solid ${selectedEffectiveScrewId === screw.id ? T.blue : T.greenBorder}`, background: '#fff', padding: '10px 14px', cursor: screw.stock_quantity === 0 ? 'not-allowed' : 'pointer', opacity: screw.stock_quantity === 0 ? 0.5 : 1 }}>
                                                        <input type="radio" name="detail-bundled-screw" value={screw.id} checked={selectedEffectiveScrewId === screw.id} onChange={() => setSelectedScrewId(screw.id)} disabled={screw.stock_quantity === 0} style={{ accentColor: T.blue }} />
                                                        <span style={{ flex: 1, minWidth: 0 }}>
                                                            <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: T.ink }}>{screw.name}</span>
                                                            <span style={{ display: 'block', fontSize: 12, color: T.muted, fontFamily: 'monospace' }}>{screw.reference}</span>
                                                        </span>
                                                        <span style={{ fontSize: 12, fontWeight: 700, color: screw.stock_quantity > 0 ? T.greenText : '#c0392b', whiteSpace: 'nowrap' }}>
                                                            {screw.stock_quantity > 0 ? `${screw.stock_quantity} ks` : 'Nie je skladom'}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Price + CTA */}
                                <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${T.line}` }}>
                                    {effectivePrice ? (
                                        <div>
                                            {effectiveNetPrice && <p style={{ fontSize: 13, color: T.muted, marginBottom: 4 }}>bez DPH {effectiveNetPrice} €</p>}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <IStar />
                                                <p style={{ fontSize: 30, fontWeight: 800, color: T.blueD, margin: 0 }}>{effectivePrice} € s DPH</p>
                                            </div>
                                                </div>
                                    ) : (
                                        <div style={{ display: 'inline-flex', minHeight: 32, padding: '6px 14px', borderRadius: 20, background: '#eaf4fe', alignItems: 'center', fontSize: 14, fontWeight: 700, color: T.blueD }}>Pre cenu sa prihláste</div>
                                    )}

                                    <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {!isLoggedIn ? (
                                            <button type="button" onClick={() => navigate('/login')}
                                                style={{ height: 50, borderRadius: 12, background: T.blue, color: '#fff', fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>
                                                Prihlásiť sa
                                            </button>
                                        ) : cartItem ? (
                                            <div style={{ display: 'flex', height: 50, overflow: 'hidden', borderRadius: 12, border: `1px solid rgba(33,150,243,0.25)`, background: '#eaf4fe' }}>
                                                <button type="button" aria-label="Znížiť" onClick={() => cartItem.quantity > 1 ? updateQuantity(product.id, cartItem.quantity - 1, activeVariant?.reference || undefined) : removeItem(product.id, activeVariant?.reference || undefined)} style={{ width: 50, fontSize: 22, fontWeight: 700, color: T.blueD, background: 'none', border: 'none', cursor: 'pointer' }}>−</button>
                                                <span style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', fontSize: 14, fontWeight: 700, color: T.blueD }}>{cartItem.quantity} v košíku</span>
                                                <button type="button" aria-label="Zvýšiť" onClick={() => { if (cartItem.quantity >= effectiveStock) { toast.error(`Na sklade je iba ${effectiveStock} ks.`); return; } updateQuantity(product.id, cartItem.quantity + 1, activeVariant?.reference || undefined); }} disabled={cartItem.quantity >= effectiveStock} style={{ width: 50, fontSize: 22, fontWeight: 700, color: T.blueD, background: 'none', border: 'none', cursor: 'pointer', opacity: cartItem.quantity >= effectiveStock ? 0.4 : 1 }}>+</button>
                                            </div>
                                        ) : effectiveStock <= 0 ? (
                                            <button type="button" onClick={() => setRequestOpen(true)}
                                                style={{ height: 50, borderRadius: 12, background: '#64748b', color: '#fff', fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>
                                                <ICart /> Požiadať produkt
                                            </button>
                                        ) : (
                                            <button type="button" onClick={handleAddToCart}
                                                style={{ height: 50, borderRadius: 12, background: T.blue, color: '#fff', fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>
                                                <ICart /> {canUseCart ? 'Pridať do košíka' : 'Prihlásiť sa'}
                                            </button>
                                        )}
                                        {isLoggedIn && (
                                            <Link to="/cart" style={{ height: 50, borderRadius: 12, background: '#fff', color: T.ink2, fontSize: 15, fontWeight: 700, border: `1px solid ${T.line2}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none', fontFamily: 'inherit' }}>
                                                <ICart /> Do košíka
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Details table — full width */}
                        {hasDetails && (
                            <div style={{ gridColumn: '1 / -1', background: T.card, borderRadius: 18, border: `1px solid ${T.line2}`, padding: 28 }}>
                                <h2 style={{ fontSize: 18, fontWeight: 700, color: T.ink, margin: '0 0 20px' }}>Detaily a vlastnosti</h2>
                                <dl className="details-table" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '12px 32px', margin: 0 }}>
                                    {categories.length > 0 && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 4, alignItems: 'start' }}>
                                            <dt style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.6px', color: T.muted, textTransform: 'uppercase' }}>Systémy</dt>
                                            <dd style={{ fontSize: 14, color: T.ink2, margin: 0 }}>{categories.join(', ')}</dd>
                                        </div>
                                    )}
                                    {compatibilityCodes.length > 0 && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 4, alignItems: 'start' }}>
                                            <dt style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.6px', color: T.muted, textTransform: 'uppercase' }}>Kódy</dt>
                                            <dd style={{ fontSize: 14, color: T.ink2, margin: 0 }}>{compatibilityCodes.join(', ')}</dd>
                                        </div>
                                    )}
                                    {descriptionParts.map((part, index) => (
                                        <Fragment key={`${part.key}-${index}`}>
                                            {part.key === 'Parametre' && part.value.includes(':') ? (
                                                part.value.split('|').map((token, tokenIndex) => {
                                                    const sep = token.indexOf(':');
                                                    if (sep === -1) return null;
                                                    return (
                                                        <div key={`${token}-${tokenIndex}`} style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 4, alignItems: 'start' }}>
                                                            <dt style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.6px', color: T.muted, textTransform: 'uppercase' }}>{token.slice(0, sep)}</dt>
                                                            <dd style={{ fontSize: 14, color: T.ink2, margin: 0, fontFamily: 'monospace' }}>{token.slice(sep + 1)}</dd>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div style={{ display: 'grid', gridTemplateColumns: part.key ? '150px 1fr' : '1fr', gap: 4, alignItems: 'start', gridColumn: part.key ? undefined : '1 / -1' }}>
                                                    {part.key && <dt style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.6px', color: T.muted, textTransform: 'uppercase' }}>{part.key}</dt>}
                                                    <dd style={{ fontSize: 14, color: T.ink2, margin: 0 }}>{part.value}</dd>
                                                </div>
                                            )}
                                        </Fragment>
                                    ))}
                                    {activeVariant?.option_tokens?.split('|').map((token, index) => {
                                        const sep = token.indexOf(':');
                                        if (sep === -1) return null;
                                        return (
                                            <div key={`${token}-${index}`} style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 4, alignItems: 'start' }}>
                                                <dt style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.6px', color: T.muted, textTransform: 'uppercase' }}>{token.slice(0, sep)}</dt>
                                                <dd style={{ fontSize: 14, color: T.ink2, margin: 0, fontFamily: 'monospace' }}>{token.slice(sep + 1)}</dd>
                                            </div>
                                        );
                                    })}
                                    {activeVariant && activeVariant.engaging !== undefined && activeVariant.engaging !== null && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 4, alignItems: 'start' }}>
                                            <dt style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.6px', color: T.muted, textTransform: 'uppercase' }}>Engaging</dt>
                                            <dd style={{ fontSize: 14, color: T.ink2, margin: 0, fontFamily: 'monospace' }}>{getEngagingAnswer(activeVariant.engaging)}</dd>
                                        </div>
                                    )}
                                    {parsedDetailRows.map((row) => (
                                        <div key={`parsed-${row.key}`} style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 4, alignItems: 'start' }}>
                                            <dt style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.6px', color: T.muted, textTransform: 'uppercase' }}>{row.key}</dt>
                                            <dd style={{ fontSize: 14, color: T.ink2, margin: 0 }}>{row.value}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>
                        )}
                    </div>

                    {/* Related products */}
                    {relatedProducts.length > 0 && (
                        <section style={{ marginTop: 40, paddingBottom: 48 }}>
                            <h2 style={{ fontSize: 22, fontWeight: 700, color: T.ink, marginBottom: 20 }}>Súvisiace produkty</h2>
                            <div className="related-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}>
                                {relatedProducts.map(related => (
                                    <RelatedProductCard key={related.id} product={related} />
                                ))}
                            </div>
                        </section>
                    )}
                </section>
            </main>

            <RequestProductModal
                open={requestOpen} onClose={() => setRequestOpen(false)} onSuccess={() => setRequestOpen(false)}
                productId={product.id} productName={effectiveName} productReference={effectiveReference}
            />
            <CatalogPdfViewer open={catalogOpen} onClose={() => setCatalogOpen(false)} reference={effectiveReference} />
        </>
    );
}
