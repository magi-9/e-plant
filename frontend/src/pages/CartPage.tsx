import { useEffect, useMemo, useState } from 'react';
import { useCartStore } from '../store/cartStore';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { TrashIcon, MinusIcon, PlusIcon } from '@heroicons/react/24/outline';
import { isAdmin } from '../api/auth';
import { getMe } from '../api/auth';
import { getProduct } from '../api/products';
import { getGlobalSettings } from '../api/settings';
import toast from 'react-hot-toast';

const getItemsLabel = (count: number): string => {
    if (count === 1) return 'položka';
    if (count < 5) return 'položky';
    return 'položiek';
};

export default function CartPage() {
    const navigate = useNavigate();
    useEffect(() => {
        if (isAdmin()) navigate('/admin', { replace: true });
    }, [navigate]);
    const { items, removeItem, updateQuantity, clearCart, getTotalPrice } = useCartStore();
    const isLoggedIn = !!localStorage.getItem('access_token');
    const [showStockIssueBox, setShowStockIssueBox] = useState(false);
    const [contactFullName, setContactFullName] = useState('');
    const [contactMessage, setContactMessage] = useState('');

    const { data: userProfile } = useQuery({
        queryKey: ['me'],
        queryFn: getMe,
        enabled: isLoggedIn,
    });

    const { data: globalSettings } = useQuery({
        queryKey: ['global-settings'],
        queryFn: getGlobalSettings,
    });

    const uniqueProductIds = useMemo(
        () => Array.from(new Set(items.map((item) => item.productId))),
        [items]
    );

    const { data: productsById } = useQuery({
        queryKey: ['cart-stock-products', uniqueProductIds],
        queryFn: async () => {
            const products = await Promise.all(uniqueProductIds.map((id) => getProduct(id)));
            return products.reduce<Record<number, Awaited<ReturnType<typeof getProduct>>>>((acc, product) => {
                acc[product.id] = product;
                return acc;
            }, {});
        },
        enabled: uniqueProductIds.length > 0,
    });

    const stockByItemKey = useMemo(() => {
        const map: Record<string, number | null> = {};

        for (const item of items) {
            const key = `${item.productId}:${item.variantReference || 'default'}`;
            const liveProduct = productsById?.[item.productId];

            if (!liveProduct) {
                map[key] = typeof item.stockQuantity === 'number' ? item.stockQuantity : null;
                continue;
            }

            if (item.variantReference) {
                const variant = liveProduct.parameters?.options?.find(
                    (option) => option.reference === item.variantReference
                );
                if (typeof variant?.stock_quantity === 'number') {
                    map[key] = variant.stock_quantity;
                } else {
                    map[key] = liveProduct.stock_quantity;
                }
                continue;
            }

            map[key] = liveProduct.stock_quantity;
        }

        return map;
    }, [items, productsById]);

    const shortageItems = useMemo(() => {
        return items
            .map((item) => {
                const key = `${item.productId}:${item.variantReference || 'default'}`;
                const available = stockByItemKey[key];
                return {
                    item,
                    available,
                };
            })
            .filter(({ available, item }) => typeof available === 'number' && item.quantity > available);
    }, [items, stockByItemKey]);

    const buildContactMessage = (name: string) => {
        const list = shortageItems
            .map(({ item, available }) => {
                return `- ${item.name}${item.variantLabel ? ` (${item.variantLabel})` : ''}: požadované ${item.quantity} ks, skladom ${available} ks`;
            })
            .join('\n');

        return [
            'Dobrý deň,',
            'mal by som záujem o tento produkt / produkty:',
            list,
            '',
            'Prosím o informáciu o dostupnosti alebo alternatívnom riešení.',
            '',
            'S pozdravom,',
            name || 'Meno a priezvisko',
        ].join('\n');
    };

    const handleProceedToCheckout = () => {
        if (shortageItems.length === 0) {
            navigate('/checkout');
            return;
        }

        toast.error('Nie je toľko skladom. Objednajte menej alebo nám napíšte správu.');
        const profileName = `${userProfile?.title || ''} ${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim();
        const fallbackName = contactFullName || profileName;
        setContactFullName(fallbackName);
        setContactMessage(buildContactMessage(fallbackName));
        setShowStockIssueBox(true);
    };

    const handleStockInquiry = () => {
        const recipient = globalSettings?.warehouse_email || 'warehouse@ebringer.sk';
        const subject = encodeURIComponent('Záujem o nedostupný produkt z košíka');
        const body = encodeURIComponent(contactMessage);
        window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
    };

    if (items.length === 0) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full text-center">
                    <svg
                        className="mx-auto h-24 w-24 text-slate-300"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1}
                            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                        />
                    </svg>
                    <h2 className="mt-6 text-2xl font-bold text-slate-900">
                        Váš košík je prázdny
                    </h2>
                    <p className="mt-2 text-sm text-slate-600">
                        Pridajte si produkty do košíka a pokračujte v nákupe.
                    </p>
                    <Link
                        to="/products"
                        className="mt-6 inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 transition-colors"
                    >
                        Prejsť na produkty
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900">Nákupný košík</h1>
                    <p className="mt-2 text-sm text-slate-600">
                        {items.length} {getItemsLabel(items.length)} v košíku
                    </p>
                </div>

                <div className="lg:grid lg:grid-cols-12 lg:gap-x-8">
                    {/* Cart Items */}
                    <div className="lg:col-span-8">
                        <div className="bg-white shadow rounded-lg border border-slate-100">
                            <ul className="divide-y divide-slate-200">
                                {items.map((item) => (
                                    <li key={`${item.productId}:${item.variantReference || 'default'}`} className="p-4 sm:p-6">
                                        <div className="flex items-start sm:items-center">
                                            {/* Product Image */}
                                            <div className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24">
                                                {item.image ? (
                                                    <img
                                                        src={item.image}
                                                        alt={item.name}
                                                        className="w-full h-full object-cover rounded-md"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-slate-100 rounded-md flex items-center justify-center">
                                                        <span className="text-slate-400 text-xs">Bez obrázka</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Product Info */}
                                            <div className="ml-4 sm:ml-6 flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <h3 className="text-base sm:text-lg font-medium text-slate-900 truncate">
                                                            {item.name}
                                                        </h3>
                                                        {item.variantLabel && (
                                                            <p className="mt-1 text-xs text-cyan-700 break-words">Variant: {item.variantLabel}</p>
                                                        )}
                                                        <p className="mt-1 text-sm text-slate-500">
                                                            Cena: {item.price} €
                                                        </p>
                                                        <p className="mt-1 text-xs text-slate-500">
                                                            Skladom:{' '}
                                                            {(() => {
                                                                const key = `${item.productId}:${item.variantReference || 'default'}`;
                                                                const available = stockByItemKey[key];
                                                                if (typeof available !== 'number') {
                                                                    return 'nezistené';
                                                                }
                                                                return `${available} ks`;
                                                            })()}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => removeItem(item.productId, item.variantReference)}
                                                        className="text-red-600 hover:text-red-800"
                                                    >
                                                        <TrashIcon className="h-5 w-5" />
                                                    </button>
                                                </div>

                                                {/* Quantity Controls */}
                                                <div className="mt-3 flex flex-wrap items-center gap-3">
                                                    <div className="flex items-center border border-slate-300 rounded-md">
                                                        <button
                                                            onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variantReference)}
                                                            className="p-2 hover:bg-slate-100 transition-colors"
                                                        >
                                                            <MinusIcon className="h-4 w-4 text-gray-600" />
                                                        </button>
                                                        <span className="px-4 py-2 text-slate-900 font-medium">
                                                            {item.quantity}
                                                        </span>
                                                        <button
                                                            onClick={() => {
                                                                const key = `${item.productId}:${item.variantReference || 'default'}`;
                                                                const available = stockByItemKey[key];
                                                                if (typeof available === 'number' && item.quantity >= available) {
                                                                    toast.error(`Pre položku '${item.name}' je skladom iba ${available} ks.`);
                                                                    return;
                                                                }
                                                                updateQuantity(item.productId, item.quantity + 1, item.variantReference);
                                                            }}
                                                            disabled={(() => {
                                                                const key = `${item.productId}:${item.variantReference || 'default'}`;
                                                                const available = stockByItemKey[key];
                                                                return typeof available === 'number' && item.quantity >= available;
                                                            })()}
                                                            className="p-2 hover:bg-slate-100 transition-colors"
                                                        >
                                                            <PlusIcon className="h-4 w-4 text-gray-600" />
                                                        </button>
                                                    </div>
                                                    {(() => {
                                                        const key = `${item.productId}:${item.variantReference || 'default'}`;
                                                        const available = stockByItemKey[key];
                                                        if (typeof available === 'number' && item.quantity > available) {
                                                            return (
                                                                <span className="text-xs font-medium text-red-600">
                                                                    Nie je toľko skladom. Upravte množstvo alebo nám napíšte správu.
                                                                </span>
                                                            );
                                                        }
                                                        return null;
                                                    })()}
                                                    <span className="text-sm text-slate-600">
                                                        Spolu: {(Number.parseFloat(item.price) * item.quantity).toFixed(2)} €
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>

                            {/* Clear Cart Button */}
                            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
                                <button
                                    onClick={clearCart}
                                    className="text-sm text-red-600 hover:text-red-800 font-medium"
                                >
                                    Vyprázdniť košík
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div className="lg:col-span-4 mt-8 lg:mt-0">
                        <div className="bg-white shadow rounded-lg p-6 sticky top-8 border border-slate-100">
                            <h2 className="text-lg font-medium text-slate-900 mb-4">
                                Súhrn objednávky
                            </h2>

                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Medziúčet</span>
                                    <span className="text-slate-900 font-medium">
                                        {getTotalPrice().toFixed(2)} €
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Doprava</span>
                                    <span className="text-slate-900 font-medium">
                                        Podľa ceny
                                    </span>
                                </div>
                                <div className="border-t border-slate-200 pt-3">
                                    <div className="flex justify-between">
                                        <span className="text-base font-medium text-slate-900">
                                            Celkom
                                        </span>
                                        <span className="text-xl font-bold text-cyan-700">
                                            {getTotalPrice().toFixed(2)} €
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {shortageItems.length > 0 && (
                                <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                    Nie je toľko skladom. Objednajte menej alebo napíšte správu a ozveme sa vám.
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={handleProceedToCheckout}
                                className="mt-6 w-full block text-center bg-cyan-600 text-white py-3 px-4 rounded-md font-medium hover:bg-cyan-700 transition-colors"
                            >
                                Pokračovať na objednávku
                            </button>

                            <Link
                                to="/products"
                                className="mt-3 w-full block text-center bg-white text-cyan-700 py-3 px-4 rounded-md font-medium border border-cyan-600 hover:bg-cyan-50 transition-colors"
                            >
                                Pokračovať v nákupe
                            </Link>

                            {showStockIssueBox && shortageItems.length > 0 && (
                                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                                    <h3 className="text-sm font-semibold text-slate-900 mb-2">Správa o nedostupnom tovare</h3>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">Meno a priezvisko</label>
                                    <input
                                        type="text"
                                        value={contactFullName}
                                        onChange={(e) => setContactFullName(e.target.value)}
                                        className="mb-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                                    />
                                    <label className="block text-xs font-medium text-slate-700 mb-1">Text správy</label>
                                    <textarea
                                        value={contactMessage}
                                        onChange={(e) => setContactMessage(e.target.value)}
                                        rows={8}
                                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleStockInquiry}
                                        className="mt-3 w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                                    >
                                        Napísať správu
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
