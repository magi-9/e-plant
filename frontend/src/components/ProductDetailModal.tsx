
import { Fragment, useEffect, useMemo, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { ShoppingCartIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { Product } from '../api/products';
import { useCartStore } from '../store/cartStore';
import { buildDescriptionParts } from '../utils/productDescription';

interface ProductDetailModalProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    product: Product | null;
}

export default function ProductDetailModal({ open, setOpen, product }: ProductDetailModalProps) {
    const { addItem, items, updateQuantity, removeItem } = useCartStore();
    const [isAdding, setIsAdding] = useState(false);
    const variantOptions = useMemo(() => product?.parameters?.options || [], [product?.parameters?.options]);
    const hasVariants = (product?.parameters?.type === 'wildcard_group') && variantOptions.length > 0;
    const [selectedVariantRef, setSelectedVariantRef] = useState<string>('');

    useEffect(() => {
        if (!open) return;
        setSelectedVariantRef(hasVariants ? variantOptions[0]?.reference || '' : '');
    }, [open, product?.id, hasVariants, variantOptions]);

    if (!product) return null;

    const categoryList = (product.all_categories || product.parameters?.all_categories || product.category || '')
        .split(';')
        .map((value) => value.trim())
        .filter(Boolean);

    const defaultVariantRef = hasVariants ? variantOptions[0]?.reference || '' : '';

    const selectedVariant = hasVariants
        ? variantOptions.find((opt) => opt.reference === selectedVariantRef) || variantOptions[0]
        : null;

    const effectiveVariantRef = selectedVariant?.reference || '';
    const effectiveVariantLabel = selectedVariant?.label || '';
    const effectiveStockQuantity = selectedVariant?.stock_quantity ?? product.stock_quantity;

    const handleAddToCart = () => {
        setIsAdding(true);
        addItem({
            productId: product.id,
            name: product.name,
            price: product.price!,
            image: product.image,
            variantReference: effectiveVariantRef || undefined,
            variantLabel: effectiveVariantLabel || undefined,
        });

        // Simple animation feedback
        setTimeout(() => {
            setIsAdding(false);
            setOpen(false);
        }, 600);
    };

    return (
        <Transition.Root show={open} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={setOpen}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <Dialog.Panel className="relative transform overflow-hidden rounded-t-2xl sm:rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl w-full flex flex-col max-h-[90dvh] sm:max-h-[85vh]">
                                <div className="absolute right-0 top-0 pr-3 pt-3 z-10">
                                    <button
                                        type="button"
                                        className="rounded-full bg-white/90 backdrop-blur-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 p-1.5 shadow-sm"
                                        onClick={() => setOpen(false)}
                                    >
                                        <span className="sr-only">Zavrieť</span>
                                        <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                                    </button>
                                </div>

                                <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4 overflow-y-auto flex-1">
                                    <div className="sm:flex sm:items-start">
                                        <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full min-w-0">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 min-w-0">
                                                {/* Image Section */}
                                                <div className="relative aspect-square w-full rounded-lg bg-gray-100 overflow-hidden">
                                                    {product.image ? (
                                                        <img
                                                            src={product.image}
                                                            alt={product.name}
                                                            className="h-full w-full object-cover object-center"
                                                        />
                                                    ) : (
                                                        <div className="flex h-full items-center justify-center bg-blue-50 text-blue-200">
                                                            <svg className="h-24 w-24" fill="currentColor" viewBox="0 0 24 24">
                                                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Content Section */}
                                                <div className="flex flex-col h-full min-w-0">
                                                    <div>
                                                        <Dialog.Title as="h3" className="text-2xl font-bold leading-tight text-gray-900 mb-2 break-words">
                                                            {product.name}
                                                        </Dialog.Title>
                                                        <p className="text-sm text-blue-600 font-medium mb-4 break-words">
                                                            {categoryList.join(', ') || product.category}
                                                        </p>
                                                        {hasVariants && (
                                                            <div className="mb-5">
                                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                    Vyber variant podľa parametrov
                                                                </label>
                                                                <select
                                                                    value={selectedVariant?.reference || defaultVariantRef}
                                                                    onChange={(e) => setSelectedVariantRef(e.target.value)}
                                                                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                                                                >
                                                                    {variantOptions.map((option) => (
                                                                        <option key={option.reference} value={option.reference}>
                                                                            {option.label || `${option.name} (${option.reference})`}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        )}
                                                        {product.description && (() => {
                                                            const parts = buildDescriptionParts(
                                                                product.description,
                                                                hasVariants,
                                                                selectedVariant
                                                            );
                                                            if (!parts.length) return null;
                                                            return (
                                                                <div className="mb-6 rounded-md border border-gray-100 bg-gray-50/70 p-3 sm:p-4 max-h-52 overflow-y-auto">
                                                                    <dl className="space-y-1.5">
                                                                        {parts.map((p, i) => (
                                                                            <div key={i} className="grid grid-cols-[auto_1fr] gap-x-2 text-sm">
                                                                                {p.key && <dt className="text-xs font-medium text-gray-500 whitespace-nowrap pt-0.5">{p.key}:</dt>}
                                                                                <dd className={`text-gray-700 break-words text-sm${!p.key ? ' col-span-2' : ''}`}>{p.value}</dd>
                                                                            </div>
                                                                        ))}
                                                                        {hasVariants && selectedVariant?.option_tokens && (
                                                                            <div className="grid grid-cols-[auto_1fr] gap-x-2 text-sm">
                                                                                <dt className="text-xs font-medium text-gray-500 whitespace-nowrap pt-0.5">Parametre:</dt>
                                                                                <dd className="text-gray-700 break-words text-sm">{selectedVariant.option_tokens}</dd>
                                                                            </div>
                                                                        )}
                                                                    </dl>
                                                                </div>
                                                            );
                                                        })()}
                                                        <div className="flex items-center justify-between gap-3 mb-4">
                                                            <div className="text-sm text-gray-500">
                                                                Skladom: <span className={effectiveStockQuantity > 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                                                                    {effectiveStockQuantity > 0 ? `${effectiveStockQuantity} ks` : 'Vypredané'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Desktop Price & Action */}
                                                    <div className="mt-auto hidden sm:block pt-6 border-t border-gray-100">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                {product.price ? (
                                                                    <p className="text-3xl font-bold text-gray-900">{product.price} €</p>
                                                                ) : (
                                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                                                        Členská cena
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {product.price && (() => {
                                                                const cartItem = items.find(
                                                                    item => item.productId === product.id && (item.variantReference || '') === (effectiveVariantRef || '')
                                                                );

                                                                if (cartItem) {
                                                                    return (
                                                                        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-md p-1 h-12 w-48 shadow-sm">
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    if (cartItem.quantity > 1) {
                                                                                        updateQuantity(product.id, cartItem.quantity - 1, effectiveVariantRef || undefined);
                                                                                    } else {
                                                                                        removeItem(product.id, effectiveVariantRef || undefined);
                                                                                    }
                                                                                }}
                                                                                className="w-12 h-full flex items-center justify-center text-blue-600 hover:bg-blue-100 rounded-md transition font-bold text-lg"
                                                                            >
                                                                                -
                                                                            </button>
                                                                            <span className="font-bold text-blue-900 border-x border-blue-200 px-4 flex-1 text-center h-full flex items-center justify-center bg-white">
                                                                                {cartItem.quantity} <span className="text-xs font-normal text-blue-500 ml-1">v košíku</span>
                                                                            </span>
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    updateQuantity(product.id, cartItem.quantity + 1, effectiveVariantRef || undefined);
                                                                                }}
                                                                                className="w-12 h-full flex items-center justify-center text-blue-600 hover:bg-blue-100 rounded-md transition font-bold text-lg"
                                                                            >
                                                                                +
                                                                            </button>
                                                                        </div>
                                                                    );
                                                                }

                                                                return (
                                                                    <button
                                                                        type="button"
                                                                        onClick={handleAddToCart}
                                                                        disabled={isAdding || effectiveStockQuantity <= 0}
                                                                        className={`inline-flex h-12 justify-center items-center rounded-md px-6 text-sm font-semibold text-white shadow-sm sm:w-auto transition-all duration-300 ${isAdding
                                                                            ? 'bg-green-500 scale-105'
                                                                            : 'bg-blue-600 hover:bg-blue-500'} ${(isAdding || effectiveStockQuantity <= 0) ? 'cursor-not-allowed opacity-60 hover:bg-blue-600' : ''
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
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Mobile Sticky Footer */}
                                <div className="bg-gray-50 px-4 py-4 sm:hidden border-t border-gray-200 w-full z-20 flex-shrink-0">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex-shrink-0">
                                            {product.price ? (
                                                <p className="text-xl font-bold text-gray-900">{product.price} €</p>
                                            ) : (
                                                <span className="text-sm font-medium text-blue-800">Cena pre členov</span>
                                            )}
                                        </div>
                                        {product.price && (
                                            <button
                                                type="button"
                                                onClick={handleAddToCart}
                                                disabled={isAdding || effectiveStockQuantity <= 0}
                                                className={`flex-1 inline-flex justify-center items-center rounded-md px-3 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-300 ${isAdding
                                                    ? 'bg-green-500 scale-95'
                                                    : 'bg-blue-600 hover:bg-blue-500'} ${(isAdding || effectiveStockQuantity <= 0) ? 'cursor-not-allowed opacity-60 hover:bg-blue-600' : ''
                                                    }`}
                                            >
                                                {isAdding ? 'Pridané!' : (effectiveStockQuantity <= 0 ? 'Vypredané' : 'Do košíka')}
                                            </button>
                                        )}
                                        {!product.price && (
                                            <button
                                                type="button"
                                                onClick={() => setOpen(false)}
                                                className="flex-1 inline-flex justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                                            >
                                                Zavrieť
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    )
}
