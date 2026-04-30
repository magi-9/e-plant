
import { Fragment, useMemo, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { ShoppingCartIcon, XMarkIcon, PencilIcon, TagIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { getProduct, type Product } from '../api/products';
import { useCartStore } from '../store/cartStore';
import { buildDescriptionParts } from '../utils/productDescription';
import RequestProductModal from './RequestProductModal';
import toast from 'react-hot-toast';
import { authService } from '../api/authService';

const VISIBLE_CATEGORIES_COUNT = 6;

interface ProductDetailModalProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    product: Product | null;
    onEdit?: (product: Product) => void;
}

export default function ProductDetailModal({ open, setOpen, product, onEdit }: ProductDetailModalProps) {
    const navigate = useNavigate();
    const isLoggedIn = authService.isAuthenticated();
    const { addItem, items, updateQuantity, removeItem } = useCartStore();
    const [isAdding, setIsAdding] = useState(false);
    const [showActionButtons, setShowActionButtons] = useState(false);
    const [openRequestModal, setOpenRequestModal] = useState(false);
    const [hydratedVariant, setHydratedVariant] = useState<Product | null>(null);
    const variantOptions = useMemo(() => product?.parameters?.options || [], [product?.parameters]);
    const isGroupType = product?.parameters?.type === 'wildcard_group';
    const hasVariants = isGroupType && variantOptions.length > 0;
    const [selectedVariantRef, setSelectedVariantRef] = useState<string>('');
    const selectedVariantId = hasVariants
        ? variantOptions.find((opt) => opt.reference === selectedVariantRef)?.id || variantOptions[0]?.id || null
        : null;

    // Reset UI states when product changes; auto-select first in-stock variant
    useEffect(() => {
        setIsAdding(false);
        setShowActionButtons(false);
        if (isGroupType) {
            const options = product?.parameters?.options || [];
            const firstInStockWithImage = options.find(
                (v) => (v.stock_quantity ?? 0) > 0 && !!v.image
            );
            const firstWithImage = options.find((v) => !!v.image);
            const firstInStock = options.find((v) => (v.stock_quantity ?? 0) > 0);
            setSelectedVariantRef(
                firstInStockWithImage?.reference
                || firstWithImage?.reference
                || firstInStock?.reference
                || options[0]?.reference
                || ''
            );
        } else {
            setSelectedVariantRef('');
        }
        setHydratedVariant(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [product?.id]);

    const defaultVariantRef = hasVariants ? variantOptions[0]?.reference || '' : '';

    const selectedVariant = hasVariants
        ? variantOptions.find((opt) => opt.reference === selectedVariantRef) || variantOptions[0]
        : null;

    useEffect(() => {
        let cancelled = false;

        // Clear the previously hydrated variant immediately so the modal does not
        // briefly render stale image/name/price while the next variant is loading.
        setHydratedVariant(null);

        const loadVariant = async () => {
            if (!hasVariants || !selectedVariantId) {
                return;
            }

            try {
                const fullVariant = await getProduct(selectedVariantId);
                if (!cancelled) {
                    setHydratedVariant(fullVariant);
                }
            } catch {
                if (!cancelled) {
                    setHydratedVariant(null);
                }
            }
        };

        void loadVariant();

        return () => {
            cancelled = true;
        };
    }, [hasVariants, selectedVariantId]);

    if (!product) return null;

    const activeVariant = hydratedVariant || selectedVariant;

    const variantImageFallback =
        variantOptions.find((opt) => !!opt.image)?.image || product.image;

    const effectiveName = activeVariant?.name || product.name;
    const effectiveDescription = activeVariant?.description || product.description;
    const effectiveCategory = activeVariant?.category || product.category;
    const effectiveAllCategories = activeVariant?.all_categories || product.all_categories || product.parameters?.all_categories || effectiveCategory || '';
    const effectiveImage = activeVariant?.image || variantImageFallback || product.image;
    const effectivePrice = activeVariant?.price ?? product.price;
    const effectiveVariantRef = activeVariant?.reference || '';
    const effectiveProductCode = effectiveVariantRef || product.reference || '';
    const effectiveVariantLabel = selectedVariant?.label || '';

    const categoryList = effectiveAllCategories
        .split(';')
        .map((value) => value.trim())
        .filter(Boolean);
    const visibleCategories = categoryList.slice(0, VISIBLE_CATEGORIES_COUNT);
    const hiddenCategories = categoryList.slice(VISIBLE_CATEGORIES_COUNT);
    const compatibilityCodes = (activeVariant?.compatibility_codes && activeVariant.compatibility_codes.length ? activeVariant.compatibility_codes : product.compatibility_codes) || [];
    // Variant stock takes priority; fall back to parent when all variants are 0 but parent has stock
    // (handles products stocked before per-variant tracking was available)
    const effectiveStockQuantity = (() => {
        if (!hasVariants) return product.stock_quantity ?? 0;
        const variantStock = activeVariant?.stock_quantity;
        if (variantStock != null && variantStock > 0) return variantStock;
        const allVariantsEmpty = variantOptions.every((v) => (v.stock_quantity ?? 0) === 0);
        if (allVariantsEmpty && (product.stock_quantity ?? 0) > 0) return product.stock_quantity ?? 0;
        return variantStock ?? 0;
    })();
    const descriptionParts = effectiveDescription
        ? buildDescriptionParts(
            effectiveDescription,
            hasVariants,
            selectedVariant,
            effectiveProductCode
        )
        : [];

    const handleAddToCart = () => {
        const currentQuantity = items.find(
            item => item.productId === product.id && (item.variantReference || '') === (effectiveVariantRef || '')
        )?.quantity ?? 0;

        if (effectiveStockQuantity <= 0) {
            toast.error('Produkt nie je skladom.');
            return;
        }

        if (currentQuantity >= effectiveStockQuantity) {
            toast.error(`Na sklade je iba ${effectiveStockQuantity} ks.`);
            return;
        }

        setIsAdding(true);
        addItem({
            productId: product.id,
            name: effectiveName,
            price: effectivePrice!,
            image: effectiveImage,
            stockQuantity: effectiveStockQuantity,
            variantReference: effectiveVariantRef || undefined,
            variantLabel: effectiveVariantLabel || undefined,
        });

        // Show action buttons after adding
        setTimeout(() => {
            setIsAdding(false);
            setShowActionButtons(true);
        }, 300);
    };

    return (
        <>
            <Transition.Root show={open} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={setOpen}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-200"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-150"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm transition-opacity" />
                </Transition.Child>

                {/* Mobile: bottom sheet | Desktop: right-side panel */}
                <div className="fixed inset-0 z-10 flex items-end lg:items-stretch lg:justify-end overflow-hidden">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 translate-y-full lg:translate-y-0 lg:translate-x-full"
                        enterTo="opacity-100 translate-y-0 lg:translate-x-0"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 translate-y-0 lg:translate-x-0"
                        leaveTo="opacity-0 translate-y-full lg:translate-y-0 lg:translate-x-full"
                    >
                        <Dialog.Panel className="relative bg-white text-left shadow-xl transition-all w-full rounded-t-[22px] lg:rounded-none max-h-[88vh] lg:max-h-none lg:h-full lg:w-[460px] flex flex-col overflow-hidden">
                                {/* Mobile drag handle */}
                                <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0 lg:hidden">
                                    <div className="w-9 h-1 rounded-full bg-slate-200" />
                                </div>

                                {/* Header */}
                                <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">Detail produktu</p>
                                    <div className="flex items-center gap-2">
                                        {onEdit && product && (
                                            <button
                                                type="button"
                                                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-700 px-2.5 py-1.5 text-xs font-medium transition-colors"
                                                onClick={() => { setOpen(false); onEdit(product); }}
                                            >
                                                <PencilIcon className="h-3.5 w-3.5" />
                                                Upraviť
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                                            style={{ background: '#f8fafc' }}
                                            onClick={() => setOpen(false)}
                                            aria-label="Zavrieť"
                                        >
                                            <XMarkIcon className="h-4 w-4" aria-hidden="true" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex flex-col min-h-0 flex-1 overflow-y-auto">
                                    {/* Image */}
                                    <div className="mx-4 mb-4 rounded-2xl overflow-hidden flex-shrink-0" style={{ height: 200, background: '#f0fdfe' }}>
                                        {effectiveImage ? (
                                            <img src={effectiveImage} alt={effectiveName} className="h-full w-full object-contain object-center p-3" />
                                        ) : (
                                            <div className="flex h-full items-center justify-center" style={{ background: 'linear-gradient(135deg, #f0fdfe, #ecfdf5)' }}>
                                                <svg className="h-16 w-16 text-slate-300" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="px-4 pb-8">
                                        <div className="min-w-0">
                                                    <Dialog.Title as="h3" className="text-2xl font-bold leading-tight text-gray-900 mb-1 break-words">
                                                        {effectiveName}
                                                    </Dialog.Title>
                                                    {effectiveProductCode && (
                                                        <p className="text-sm text-gray-500 font-medium mb-2 break-words">{effectiveProductCode}</p>
                                                    )}
                                                    <div className="flex items-start gap-1.5 mb-3 flex-wrap">
                                                        <TagIcon className="h-4 w-4 text-cyan-600 flex-shrink-0 mt-0.5" />
                                                        <p className="text-sm text-cyan-700 font-medium break-words">
                                                            {visibleCategories.join(', ') || effectiveCategory}
                                                            {hiddenCategories.length > 0 && (
                                                                <span className="text-slate-400"> {`+${hiddenCategories.length} ďalších`}</span>
                                                            )}
                                                        </p>
                                                    </div>
                                                    {compatibilityCodes.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5 mb-4">
                                                            {compatibilityCodes.map((code: string) => (
                                                                <span key={code} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold"
                                                                    style={{ background: 'rgba(139,92,246,0.09)', color: '#7c3aed', border: '1px solid rgba(139,92,246,0.2)' }}>
                                                                    ⬡ {code}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {hasVariants && (
                                                        <div className="mb-5 rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50/80 to-white p-3 shadow-sm">
                                                            <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-cyan-700 mb-2">
                                                                Vyber variant podľa parametrov
                                                            </label>
                                                            <select
                                                                value={selectedVariant?.reference || defaultVariantRef}
                                                                onChange={(e) => setSelectedVariantRef(e.target.value)}
                                                                className="w-full rounded-xl border border-cyan-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/25"
                                                            >
                                                                {variantOptions.map((option) => {
                                                                    const qty = option.stock_quantity ?? null;
                                                                    const stockLabel = !isLoggedIn
                                                                        ? ''
                                                                        : qty === null
                                                                            ? ''
                                                                            : qty > 0
                                                                                ? ` · ${qty} ks`
                                                                                : ' · vypredané';
                                                                    const displayLabel = option.reference && option.name
                                                                        ? `${option.reference} – ${option.name}`
                                                                        : option.reference || option.name || option.label || '';
                                                                    return (
                                                                        <option key={option.reference} value={option.reference}>
                                                                            {`${displayLabel}${stockLabel}`}
                                                                        </option>
                                                                    );
                                                                })}
                                                            </select>
                                                        </div>
                                                    )}
                                                    {isLoggedIn && (
                                                        <div className="flex items-center gap-2 mt-3">
                                                            {effectiveStockQuantity >= 5 ? (
                                                                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
                                                            ) : effectiveStockQuantity >= 1 ? (
                                                                <span className="h-2.5 w-2.5 rounded-full bg-amber-500 flex-shrink-0" />
                                                            ) : (
                                                                <span className="h-2.5 w-2.5 rounded-full bg-red-500 flex-shrink-0" />
                                                            )}
                                                            <span className="text-sm text-slate-600">
                                                                {effectiveStockQuantity > 0
                                                                    ? `${effectiveStockQuantity} ks skladom`
                                                                    : 'Vypredané'}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="mt-auto pt-4 border-t border-gray-100">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            {effectivePrice ? (
                                                                <div className="flex items-center gap-2">
                                                                    <SparklesIcon className="h-5 w-5 text-amber-500 flex-shrink-0" />
                                                                    <p className="text-3xl font-bold text-cyan-700">{effectivePrice} €</p>
                                                                </div>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-cyan-50 text-cyan-800">
                                                                    <SparklesIcon className="h-3.5 w-3.5" />
                                                                    Členská cena
                                                                </span>
                                                            )}
                                                        </div>
                                                        {(() => {
                                                            if (!effectivePrice) {
                                                                if (!isLoggedIn) {
                                                                    return (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setOpen(false);
                                                                                navigate('/login');
                                                                            }}
                                                                            className="inline-flex h-12 justify-center items-center rounded-md px-6 text-sm font-semibold text-white shadow-sm sm:w-auto bg-cyan-600 hover:bg-cyan-700 transition-all duration-300"
                                                                        >
                                                                            Prihlásiť sa
                                                                        </button>
                                                                    );
                                                                }

                                                                return null;
                                                            }

                                                            const cartItem = items.find(
                                                                item => item.productId === product.id && (item.variantReference || '') === (effectiveVariantRef || '')
                                                            );

                                                            if (showActionButtons) {
                                                                return (
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                navigate('/cart');
                                                                                setOpen(false);
                                                                                setShowActionButtons(false);
                                                                            }}
                                                                            className="inline-flex h-12 justify-center items-center rounded-md px-4 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-700 shadow-sm transition-all sm:w-auto"
                                                                        >
                                                                            Prejsť do košíka
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setOpen(false);
                                                                                setShowActionButtons(false);
                                                                            }}
                                                                            className="inline-flex h-12 justify-center items-center rounded-md px-4 text-sm font-semibold text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 shadow-sm transition-all sm:w-auto"
                                                                        >
                                                                            Pokračovať v nákupe
                                                                        </button>
                                                                    </div>
                                                                );
                                                            }

                                                            if (cartItem) {
                                                                return (
                                                                    <div className="flex items-center justify-between bg-cyan-50 border border-cyan-200 rounded-md p-1 h-12 w-48 shadow-sm">
                                                                        <button
                                                                            type="button"
                                                                            aria-label="Znížiť množstvo"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                if (cartItem.quantity > 1) {
                                                                                    updateQuantity(product.id, cartItem.quantity - 1, effectiveVariantRef || undefined);
                                                                                } else {
                                                                                    removeItem(product.id, effectiveVariantRef || undefined);
                                                                                }
                                                                            }}
                                                                            className="w-12 h-full flex items-center justify-center text-cyan-700 hover:bg-cyan-100 rounded-md transition font-bold text-lg"
                                                                        >
                                                                            -
                                                                        </button>
                                                                        <span className="font-bold text-cyan-900 border-x border-cyan-200 px-4 flex-1 text-center h-full flex items-center justify-center bg-white">
                                                                            {cartItem.quantity} <span className="text-xs font-normal text-cyan-600 ml-1">v košíku</span>
                                                                        </span>
                                                                        <button
                                                                            type="button"
                                                                            aria-label="Zvýšiť množstvo"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                if (cartItem.quantity >= effectiveStockQuantity) {
                                                                                    toast.error(`Na sklade je iba ${effectiveStockQuantity} ks.`);
                                                                                    return;
                                                                                }
                                                                                updateQuantity(product.id, cartItem.quantity + 1, effectiveVariantRef || undefined);
                                                                            }}
                                                                            disabled={cartItem.quantity >= effectiveStockQuantity}
                                                                            className="w-12 h-full flex items-center justify-center text-cyan-700 hover:bg-cyan-100 rounded-md transition font-bold text-lg"
                                                                        >
                                                                            +
                                                                        </button>
                                                                    </div>
                                                                );
                                                            }

                                                            if (effectiveStockQuantity <= 0) {
                                                                return (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setOpenRequestModal(true)}
                                                                        className="inline-flex h-12 justify-center items-center rounded-md px-6 text-sm font-semibold text-white shadow-sm sm:w-auto bg-slate-500 hover:bg-slate-600 transition-all duration-300"
                                                                    >
                                                                        Požiadať produkt
                                                                    </button>
                                                                );
                                                            }

                                                            return (
                                                                <button
                                                                    type="button"
                                                                    onClick={handleAddToCart}
                                                                    disabled={isAdding}
                                                                    className={`inline-flex h-12 justify-center items-center rounded-md px-6 text-sm font-semibold text-white shadow-sm sm:w-auto transition-all duration-300 ${isAdding
                                                                        ? 'bg-emerald-500 scale-105 cursor-not-allowed opacity-60'
                                                                        : 'bg-cyan-600 hover:bg-cyan-700'
                                                                        }`}
                                                                >
                                                                    {isAdding ? (
                                                                        <>
                                                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                            </svg>
                                                                            Pridávam...
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <ShoppingCartIcon className="h-5 w-5 mr-2" />
                                                                            Pridať do košíka
                                                                        </>
                                                                    )}
                                                                </button>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>

                                    {/* Scrollable Description Section */}
                                    {(descriptionParts.length > 0 || hiddenCategories.length > 0 || (hasVariants && !!selectedVariant?.option_tokens)) && (
                                        <div className="mt-6 rounded-md border border-gray-100 bg-gray-50/70 p-3 sm:p-4 overflow-y-auto overflow-x-hidden flex-1 min-h-0">
                                            <dl className="space-y-1.5 min-w-0">
                                                {descriptionParts.map((p, i) => (
                                                    <div key={i} className="grid grid-cols-[auto_1fr] gap-x-2 text-sm min-w-0">
                                                        {p.key && <dt className="text-xs font-medium text-gray-500 whitespace-nowrap pt-0.5">{p.key}:</dt>}
                                                        <dd className={`text-gray-700 break-all text-sm min-w-0${!p.key ? ' col-span-2' : ''}`}>{p.value}</dd>
                                                    </div>
                                                ))}
                                                {hasVariants && selectedVariant?.option_tokens && (
                                                    <div className="grid grid-cols-[auto_1fr] gap-x-2 text-sm min-w-0">
                                                        <dt className="text-xs font-medium text-gray-500 whitespace-nowrap pt-0.5">Parametre:</dt>
                                                        <dd className="text-gray-700 break-all text-sm min-w-0">{selectedVariant.option_tokens}</dd>
                                                    </div>
                                                )}
                                                {hiddenCategories.length > 0 && (
                                                    <div className="grid grid-cols-[auto_1fr] gap-x-2 text-sm min-w-0">
                                                        <dt className="text-xs font-medium text-gray-500 whitespace-nowrap pt-0.5">Ďalšie kategórie:</dt>
                                                        <dd className="text-gray-700 break-all text-sm min-w-0">{hiddenCategories.join(', ')}</dd>
                                                    </div>
                                                )}
                                            </dl>
                                        </div>
                                    )}
                                    </div>
                            </Dialog.Panel>
                        </Transition.Child>
                </div>
            </Dialog>
        </Transition.Root>

        <RequestProductModal
            open={openRequestModal}
            onClose={() => setOpenRequestModal(false)}
            onSuccess={() => { setOpenRequestModal(false); }}
            productId={product?.id || 0}
            productName={effectiveName || ''}
            productReference={effectiveProductCode}
        />
        </>
    )
}
