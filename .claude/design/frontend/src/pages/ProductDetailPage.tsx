import { Fragment, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { ArrowLeftIcon, CursorArrowRaysIcon, MagnifyingGlassIcon, ShoppingCartIcon, SparklesIcon, TagIcon } from '@heroicons/react/24/outline';
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
        product.reference,
        product.category,
        product.name,
        product.wildcard_group_name,
        product.parameters?.wildcard_reference,
        product.parameters?.catalog_section,
    ].filter(Boolean).join(' ').toLowerCase();

    return haystack.includes('tibase') || haystack.includes('titanium base') || (product.reference || '').startsWith('31.');
};

const getVariantLabel = (option: ProductVariant): string => {
    const tokens = (option.option_tokens || '')
        .split('|')
        .map((token) => token.trim())
        .filter(Boolean);

    if (tokens.length > 0) {
        return tokens.slice(0, 2).join(' · ');
    }

    return option.label || option.parameter_code || option.reference || option.name || 'Variant';
};

function RelatedProductCard({ product }: { product: Product }) {
    const image = getProductPreviewImage(product);
    const price = getCustomerPrice(product);

    return (
        <Link
            to={`/products/${product.id}`}
            className="group flex min-h-[144px] gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-cyan-300 hover:shadow-md"
        >
            <div className="h-28 w-28 flex-shrink-0 overflow-hidden rounded-md bg-slate-100">
                {image ? (
                    <img src={image} alt={product.name} className="h-full w-full object-contain p-2 transition group-hover:scale-105" />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">Bez obrázka</div>
                )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
                <h3 className="line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-cyan-700">{product.name}</h3>
                {product.reference && <p className="mt-1 truncate text-xs font-medium text-slate-500">{product.reference}</p>}
                <div className="mt-auto">
                    {price ? (
                        <p className="text-sm font-bold text-cyan-700">{price} € s DPH</p>
                    ) : (
                        <span className="inline-flex rounded-full bg-cyan-50 px-2 py-0.5 text-xs font-semibold text-cyan-700">Členská cena</span>
                    )}
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
        () => sortByFirstOptionTokenValue(product?.parameters?.options || []),
        [product?.parameters?.options]
    );
    const activeVariant = variantOptions.find((option) => option.reference === selectedVariantRef) || variantOptions[0] || null;
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
        ? getOrderedCategories(
            { ...product, category: effectiveCategory, all_categories: effectiveAllCategories },
            [],
            '',
        )
        : [];
    const descriptionParts = effectiveDescription
        ? buildDescriptionParts(effectiveDescription, hasVariants, activeVariant, effectiveReference)
        : [];

    const compatibleProductsQuery = useQuery({
        queryKey: ['related-products', 'compatibility', product?.id, selectedCompatibilityCode],
        queryFn: async () => {
            if (!selectedCompatibilityCode) return [];
            const data = await getProducts({ compatibility_code: selectedCompatibilityCode, limit: 12 });
            return data.results.filter((item) => item.id !== product?.id);
        },
        enabled: !!product && !!selectedCompatibilityCode,
    });

    const similarProductsQuery = useQuery({
        queryKey: ['related-products', 'category', product?.id, categories[0]],
        queryFn: async () => {
            if (!categories[0]) return [];
            const data = await getProducts({ categories: [categories[0]], limit: 12 });
            return data.results.filter((item) => item.id !== product?.id);
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
        [...(compatibleProductsQuery.data || []), ...(similarProductsQuery.data || [])].forEach((item) => {
            if (item.id !== product?.id) byId.set(item.id, item);
        });
        return Array.from(byId.values()).slice(0, 8);
    }, [compatibleProductsQuery.data, product?.id, similarProductsQuery.data]);

    const cartItem = product ? items.find(
        (item) => item.productId === product.id && (item.variantReference || '') === (activeVariant?.reference || '')
    ) : null;
    const defaultScrew = compatibleScrews.find((screw) => screw.stock_quantity > 0) || compatibleScrews[0] || null;
    const selectedScrew = compatibleScrews.find((screw) => screw.id === selectedScrewId) || defaultScrew;
    const selectedEffectiveScrewId = selectedScrew?.id ?? null;

    const handleAddToCart = () => {
        if (!product || !effectiveItem || !effectivePrice) return;

        if (!canUseCart) {
            navigate('/login');
            return;
        }

        if (effectiveStock <= 0) {
            toast.error('Produkt nie je skladom.');
            return;
        }

        if (compatibleScrews.length > 0 && (!selectedScrew || selectedScrew.stock_quantity === 0)) {
            toast.error('Vybraná skrutka nie je skladom.');
            return;
        }

        addItem({
            productId: product.id,
            name: effectiveName,
            price: effectivePrice,
            netPrice: effectiveNetPrice,
            image: effectiveImage,
            stockQuantity: effectiveStock,
            variantReference: activeVariant?.reference || undefined,
            variantLabel: activeVariant ? getVariantLabel(activeVariant) : undefined,
            bundledScrew: selectedScrew
                ? { productId: selectedScrew.id, name: selectedScrew.name, reference: selectedScrew.reference }
                : undefined,
        });
    };

    if (productQuery.isLoading) {
        return (
            <div className="min-h-[60vh] px-4 py-16">
                <div className="mx-auto max-w-6xl text-slate-500">Načítavam produkt...</div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="min-h-[60vh] px-4 py-16">
                <div className="mx-auto max-w-6xl">
                    <button type="button" onClick={() => navigate('/products')} className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-700">
                        <ArrowLeftIcon className="h-4 w-4" />
                        Späť na produkty
                    </button>
                    <p className="mt-8 text-lg font-semibold text-slate-900">Produkt sa nepodarilo nájsť.</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <Helmet>
                <title>{effectiveName} | Ebringer</title>
                <meta name="description" content={effectiveDescription || product.name} />
            </Helmet>

            <main className="bg-slate-50">
                <section className="border-b border-slate-200 bg-white px-4 py-5">
                    <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
                        <button type="button" onClick={() => navigate('/products')} className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-700 hover:text-cyan-800">
                            <ArrowLeftIcon className="h-4 w-4" />
                            Produkty
                        </button>
                        {effectiveReference && (
                            <button
                                type="button"
                                onClick={() => setCatalogOpen(true)}
                                className="inline-flex items-center gap-2 rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700 hover:bg-cyan-100"
                            >
                                <CursorArrowRaysIcon className="h-4 w-4" />
                                Pozrieť v katalógu
                            </button>
                        )}
                    </div>
                </section>

                <section className="px-4 py-8 sm:py-10">
                    <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
                        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                            <div
                                className="group relative aspect-[4/3] min-h-[300px] overflow-hidden bg-slate-100 sm:min-h-[420px]"
                                onMouseMove={(event) => {
                                    const rect = event.currentTarget.getBoundingClientRect();
                                    const x = ((event.clientX - rect.left) / rect.width) * 100;
                                    const y = ((event.clientY - rect.top) / rect.height) * 100;
                                    setImageZoomOrigin(`${x}% ${y}%`);
                                }}
                                onMouseLeave={() => setImageZoomOrigin('50% 50%')}
                            >
                                {effectiveImage ? (
                                    <>
                                        <img
                                            src={effectiveImage}
                                            alt={effectiveName}
                                            className="h-full w-full cursor-zoom-in object-contain p-5 transition-transform duration-200 ease-out group-hover:scale-[1.75]"
                                            style={{ transformOrigin: imageZoomOrigin }}
                                        />
                                        <div className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-white/90 px-2.5 py-1.5 text-xs font-semibold text-slate-600 opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                                            <MagnifyingGlassIcon className="h-3.5 w-3.5" />
                                            Zoom
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-slate-400">Bez obrázka</div>
                                )}
                            </div>
                        </div>

                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                {categories.slice(0, 4).map((category) => (
                                    <span key={category} className="inline-flex items-center gap-1 rounded-md bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-700">
                                        <TagIcon className="h-3.5 w-3.5" />
                                        {category}
                                    </span>
                                ))}
                            </div>

                            <h1 className="mt-4 text-3xl font-bold leading-tight text-slate-950 sm:text-4xl">{effectiveName}</h1>
                            {effectiveReference && <p className="mt-2 text-sm font-semibold text-slate-500">{effectiveReference}</p>}

                            {compatibilityCodes.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {compatibilityCodes.map((code) => (
                                        <span key={code} className="inline-flex rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-bold text-violet-700">
                                            {code}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {hasVariants && (
                                <div className="mt-6">
                                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Variant</p>
                                    <DropdownSelect
                                        value={activeVariant?.reference || ''}
                                        onChange={setSelectedVariantRef}
                                        options={variantOptions.map((option) => ({ value: option.reference, label: getVariantLabel(option) }))}
                                        placeholder="Vybrať variant"
                                    />
                                </div>
                            )}

                            {isTiBaseProduct(product) && (
                                <div className="mt-6 rounded-lg border border-emerald-100 bg-emerald-50/60 p-4">
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                        Skrutka <span className="text-emerald-700">({cartItem?.quantity ?? 1} ks zadarmo)</span>
                                    </p>
                                    {compatibleScrewsQuery.isLoading ? (
                                        <p className="mt-3 text-sm text-slate-500">Načítavam skrutky...</p>
                                    ) : compatibleScrews.length === 0 ? (
                                        <p className="mt-3 text-sm text-slate-500">Kompatibilná skrutka nie je k dispozícii.</p>
                                    ) : (
                                        <div className="mt-3 grid gap-2">
                                            {compatibleScrews.map((screw) => (
                                                <label
                                                    key={screw.id}
                                                    className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 text-sm transition ${
                                                        selectedEffectiveScrewId === screw.id
                                                            ? 'border-cyan-500 bg-white text-cyan-900 shadow-sm'
                                                            : 'border-emerald-100 bg-white/70 text-slate-700 hover:border-cyan-300'
                                                    } ${screw.stock_quantity === 0 ? 'cursor-not-allowed opacity-50' : ''}`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="detail-bundled-screw"
                                                        value={screw.id}
                                                        checked={selectedEffectiveScrewId === screw.id}
                                                        onChange={() => setSelectedScrewId(screw.id)}
                                                        disabled={screw.stock_quantity === 0}
                                                        className="accent-cyan-600"
                                                    />
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block font-semibold">{screw.name}</span>
                                                        <span className="block text-xs text-slate-500">{screw.reference}</span>
                                                    </span>
                                                    <span className={`text-xs font-semibold ${screw.stock_quantity > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                                        {screw.stock_quantity > 0 ? `${screw.stock_quantity} ks` : 'Nie je skladom'}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="mt-7 border-t border-slate-200 pt-6">
                                {effectivePrice ? (
                                    <div>
                                        {effectiveNetPrice && <p className="text-sm text-slate-400">bez DPH {effectiveNetPrice} €</p>}
                                        <p className="flex items-center gap-2 text-3xl font-bold text-cyan-700">
                                            <SparklesIcon className="h-6 w-6 text-amber-500" />
                                            {effectivePrice} € s DPH
                                        </p>
                                    </div>
                                ) : (
                                    <span className="inline-flex rounded-full bg-cyan-50 px-3 py-1 text-sm font-semibold text-cyan-700">Členská cena</span>
                                )}

                                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                                    {cartItem ? (
                                        <div className="flex h-12 overflow-hidden rounded-md border border-cyan-200 bg-cyan-50">
                                            <button
                                                type="button"
                                                aria-label="Znížiť množstvo"
                                                onClick={() => cartItem.quantity > 1
                                                    ? updateQuantity(product.id, cartItem.quantity - 1, activeVariant?.reference || undefined)
                                                    : removeItem(product.id, activeVariant?.reference || undefined)}
                                                className="w-12 text-lg font-bold text-cyan-700 hover:bg-cyan-100"
                                            >
                                                -
                                            </button>
                                            <span className="flex min-w-28 items-center justify-center bg-white px-4 text-sm font-bold text-cyan-900">{cartItem.quantity} v košíku</span>
                                            <button
                                                type="button"
                                                aria-label="Zvýšiť množstvo"
                                                onClick={() => {
                                                    if (cartItem.quantity >= effectiveStock) {
                                                        toast.error(`Na sklade je iba ${effectiveStock} ks.`);
                                                        return;
                                                    }
                                                    updateQuantity(product.id, cartItem.quantity + 1, activeVariant?.reference || undefined);
                                                }}
                                                disabled={cartItem.quantity >= effectiveStock}
                                                className="w-12 text-lg font-bold text-cyan-700 hover:bg-cyan-100 disabled:opacity-40"
                                            >
                                                +
                                            </button>
                                        </div>
                                    ) : effectiveStock <= 0 ? (
                                        <button
                                            type="button"
                                            onClick={() => setRequestOpen(true)}
                                            className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-slate-600 px-6 text-sm font-semibold text-white shadow-sm hover:bg-slate-700"
                                        >
                                            <ShoppingCartIcon className="h-5 w-5" />
                                            Požiadať produkt
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handleAddToCart}
                                            className="inline-flex h-12 items-center justify-center rounded-md bg-cyan-600 px-6 text-sm font-semibold text-white shadow-sm hover:bg-cyan-700"
                                        >
                                            <ShoppingCartIcon className="mr-2 h-5 w-5" />
                                            {canUseCart ? 'Pridať do košíka' : 'Prihlásiť sa'}
                                        </button>
                                    )}
                                    <Link to="/cart" className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                                        <ShoppingCartIcon className="h-5 w-5" />
                                        Do košíka
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {(descriptionParts.length > 0 || categories.length > 0 || activeVariant?.option_tokens) && (
                            <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-6 lg:col-span-2">
                                <h2 className="text-lg font-bold text-slate-950">Detaily a vlastnosti</h2>
                                <dl className="mt-4 grid gap-x-8 gap-y-3 md:grid-cols-2">
                                    {categories.length > 0 && (
                                        <div className="grid gap-1 sm:grid-cols-[150px_1fr]">
                                            <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Systémy</dt>
                                            <dd className="text-sm text-slate-700">{categories.join(', ')}</dd>
                                        </div>
                                    )}
                                    {compatibilityCodes.length > 0 && (
                                        <div className="grid gap-1 sm:grid-cols-[150px_1fr]">
                                            <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Kódy</dt>
                                            <dd className="text-sm text-slate-700">{compatibilityCodes.join(', ')}</dd>
                                        </div>
                                    )}
                                    {descriptionParts.map((part, index) => (
                                        <Fragment key={`${part.key}-${index}`}>
                                            {part.key === 'Parametre' && part.value.includes(':') ? (
                                                part.value.split('|').map((token, tokenIndex) => {
                                                    const separator = token.indexOf(':');
                                                    if (separator === -1) return null;
                                                    return (
                                                        <div key={`${token}-${tokenIndex}`} className="grid gap-1 sm:grid-cols-[150px_1fr]">
                                                            <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{token.slice(0, separator)}</dt>
                                                            <dd className="text-sm font-mono text-slate-700">{token.slice(separator + 1)}</dd>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className={`grid gap-1 sm:grid-cols-[150px_1fr] ${!part.key ? 'md:col-span-2' : ''}`}>
                                                    {part.key && <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{part.key}</dt>}
                                                    <dd className={`text-sm text-slate-700 ${!part.key ? 'sm:col-span-2' : ''}`}>{part.value}</dd>
                                                </div>
                                            )}
                                        </Fragment>
                                    ))}
                                    {activeVariant?.option_tokens?.split('|').map((token, index) => {
                                        const separator = token.indexOf(':');
                                        if (separator === -1) return null;
                                        return (
                                            <div key={`${token}-${index}`} className="grid gap-1 sm:grid-cols-[150px_1fr]">
                                                <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{token.slice(0, separator)}</dt>
                                                <dd className="text-sm font-mono text-slate-700">{token.slice(separator + 1)}</dd>
                                            </div>
                                        );
                                    })}
                                </dl>
                            </div>
                        )}
                    </div>
                </section>

                {relatedProducts.length > 0 && (
                    <section className="border-t border-slate-200 bg-white px-4 py-8 sm:py-10">
                        <div className="mx-auto max-w-7xl">
                            <h2 className="text-xl font-bold text-slate-950">Súvisiace produkty</h2>
                            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                {relatedProducts.map((related) => (
                                    <RelatedProductCard key={related.id} product={related} />
                                ))}
                            </div>
                        </div>
                    </section>
                )}
            </main>

            <RequestProductModal
                open={requestOpen}
                onClose={() => setRequestOpen(false)}
                onSuccess={() => setRequestOpen(false)}
                productId={product.id}
                productName={effectiveName}
                productReference={effectiveReference}
            />
            <CatalogPdfViewer
                open={catalogOpen}
                onClose={() => setCatalogOpen(false)}
                reference={effectiveReference}
            />
        </>
    );
}
