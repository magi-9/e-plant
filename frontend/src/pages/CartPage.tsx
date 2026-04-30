import { useEffect, useMemo, useState } from 'react';
import { useCartStore } from '../store/cartStore';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { isAdmin } from '../api/auth';
import { getMe } from '../api/auth';
import { authService } from '../api/authService';
import { getProduct } from '../api/products';
import { getGlobalSettings } from '../api/settings';
import toast from 'react-hot-toast';

// ── helpers ──────────────────────────────────────────────────

const getItemsLabel = (count: number): string => {
    if (count === 1) return 'položka';
    if (count < 5) return 'položky';
    return 'položiek';
};

// ── gradient button ──────────────────────────────────────────

function GBtn({
    children, onClick, outline, full, disabled, type = 'button',
}: {
    children: React.ReactNode; onClick?: () => void; outline?: boolean;
    full?: boolean; disabled?: boolean; type?: 'button' | 'submit';
}) {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all
                ${full ? 'w-full' : ''}
                px-5 py-2.5 text-sm
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${outline
                    ? 'border border-cyan-500 text-cyan-600 bg-white hover:bg-cyan-50'
                    : 'text-white shadow-[0_4px_14px_rgba(6,182,212,0.22)] hover:shadow-[0_6px_20px_rgba(6,182,212,0.35)] active:scale-[0.98]'
                }`}
            style={outline || disabled ? undefined : { background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)' }}
        >
            {children}
        </button>
    );
}

// ── qty stepper ──────────────────────────────────────────────

function QtyStepper({
    value, onDec, onInc, disableInc,
}: { value: number; onDec: () => void; onInc: () => void; disableInc: boolean }) {
    return (
        <div className="inline-flex items-center rounded-full border border-slate-200 bg-white shadow-sm overflow-hidden">
            <button type="button" onClick={onDec}
                className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors font-medium">−</button>
            <span className="min-w-[2rem] text-center text-sm font-semibold text-slate-900">{value}</span>
            <button type="button" onClick={onInc} disabled={disableInc}
                className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors font-medium disabled:opacity-30 disabled:cursor-not-allowed">+</button>
        </div>
    );
}

// ── main component ───────────────────────────────────────────

export default function CartPage() {
    const navigate = useNavigate();
    useEffect(() => {
        if (isAdmin()) navigate('/admin', { replace: true });
    }, [navigate]);

    const { items, removeItem, updateQuantity, clearCart, getTotalPrice } = useCartStore();
    const isLoggedIn = authService.isAuthenticated();
    const [showStockIssueBox, setShowStockIssueBox] = useState(false);
    const [contactFullName, setContactFullName] = useState('');
    const [contactMessage, setContactMessage] = useState('');

    const { data: userProfile } = useQuery({
        queryKey: ['me'],
        queryFn: getMe,
        enabled: isLoggedIn,
    });

    const { data: settings } = useQuery({
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
                map[key] = typeof variant?.stock_quantity === 'number'
                    ? variant.stock_quantity
                    : liveProduct.stock_quantity;
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
                return { item, available: stockByItemKey[key] };
            })
            .filter(({ available, item }) => typeof available === 'number' && item.quantity > available);
    }, [items, stockByItemKey]);

    const buildContactMessage = (name: string) => {
        const list = shortageItems
            .map(({ item, available }) =>
                `- ${item.name}${item.variantLabel ? ` (${item.variantLabel})` : ''}: požadované ${item.quantity} ks, skladom ${available} ks`
            )
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
        const recipient = settings?.warehouse_email || 'warehouse@dentalshop.sk';
        const subject = encodeURIComponent('Záujem o nedostupný produkt z košíka');
        const body = encodeURIComponent(contactMessage);
        window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
    };

    // ── empty state ──────────────────────────────────────────
    if (items.length === 0) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center py-16 px-4">
                <div className="max-w-sm w-full text-center">
                    <div className="mx-auto w-24 h-24 rounded-3xl bg-slate-100 flex items-center justify-center mb-6">
                        <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">Váš košík je prázdny</h2>
                    <p className="mt-2 text-sm text-slate-500">Pridajte si produkty do košíka a pokračujte v nákupe.</p>
                    <div className="mt-6">
                        <GBtn full onClick={() => navigate('/products')}>Prejsť na produkty</GBtn>
                    </div>
                </div>
            </div>
        );
    }

    const subtotal = getTotalPrice();

    return (
        <div className="min-h-screen bg-slate-50 pt-8 pb-28 md:pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Nákupný košík</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            {items.length} {getItemsLabel(items.length)} v košíku
                        </p>
                    </div>
                    <button type="button" onClick={clearCart}
                        className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors">
                        Vyprázdniť košík
                    </button>
                </div>

                <div className="flex flex-col lg:flex-row gap-6 items-start">
                    {/* ── Cart items ── */}
                    <div className="flex-1 min-w-0">
                        <div className="md:bg-white md:rounded-2xl md:border md:border-slate-200 md:shadow-sm overflow-hidden">
                            {/* Desktop table header */}
                            <div className="hidden md:grid grid-cols-[1fr_120px_96px_80px_36px] gap-4 px-5 py-3 border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                <span>Produkt</span>
                                <span className="text-center">Množstvo</span>
                                <span className="text-right">Cena/ks</span>
                                <span className="text-right">Spolu</span>
                                <span />
                            </div>

                            <ul className="flex flex-col gap-2.5 md:gap-0 md:divide-y md:divide-slate-100">
                                {items.map((item) => {
                                    const key = `${item.productId}:${item.variantReference || 'default'}`;
                                    const available = stockByItemKey[key];
                                    const hasShortage = typeof available === 'number' && item.quantity > available;
                                    const disableInc = typeof available === 'number' && item.quantity >= available;
                                    const lineTotal = (parseFloat(item.price) * item.quantity).toFixed(2);

                                    return (
                                        <li key={key} className="bg-white rounded-[18px] border border-slate-200 shadow-sm p-3 md:bg-transparent md:rounded-none md:border-0 md:shadow-none md:p-5">
                                            <div className="flex gap-3 md:gap-4 items-start">
                                                {/* Image */}
                                                <div className="w-14 h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 flex-shrink-0 rounded-xl overflow-hidden"
                                                    style={{ background: 'linear-gradient(135deg, #cffafe, #d1fae5)' }}>
                                                    {item.image ? (
                                                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">img</div>
                                                    )}
                                                </div>

                                                {/* Info row */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0 flex-1">
                                                            <p className="font-semibold text-sm text-slate-900 truncate">{item.name}</p>
                                                            {item.variantLabel && (
                                                                <p className="text-xs text-cyan-600 mt-0.5">{item.variantLabel}</p>
                                                            )}
                                                            <p className="text-xs text-slate-400 mt-0.5">
                                                                {typeof available === 'number' ? `Skladom: ${available} ks` : 'Dostupnosť: nezistená'}
                                                            </p>
                                                        </div>

                                                        {/* Desktop: price + total columns */}
                                                        <div className="hidden md:flex items-center gap-6 text-sm flex-shrink-0">
                                                            <span className="text-slate-500 tabular-nums w-24 text-right">{item.price} €</span>
                                                            <span className="font-semibold text-slate-900 tabular-nums w-20 text-right">{lineTotal} €</span>
                                                            <button type="button"
                                                                onClick={() => removeItem(item.productId, item.variantReference)}
                                                                className="text-slate-300 hover:text-red-400 transition-colors w-9 flex justify-end"
                                                                aria-label="Odstrániť">
                                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6m4-6v6"/><path d="M9 6V4h6v2"/>
                                                                </svg>
                                                            </button>
                                                        </div>

                                                        {/* Mobile: remove button */}
                                                        <button type="button"
                                                            onClick={() => removeItem(item.productId, item.variantReference)}
                                                            className="md:hidden text-slate-300 hover:text-red-400 transition-colors flex-shrink-0"
                                                            aria-label="Odstrániť">
                                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6m4-6v6"/><path d="M9 6V4h6v2"/>
                                                            </svg>
                                                        </button>
                                                    </div>

                                                    {/* Qty + mobile total */}
                                                    <div className="mt-2.5 md:mt-3 pt-2 md:pt-0 border-t md:border-0 border-slate-100 flex items-center gap-3">
                                                        <QtyStepper
                                                            value={item.quantity}
                                                            onDec={() => updateQuantity(item.productId, item.quantity - 1, item.variantReference)}
                                                            onInc={() => {
                                                                if (disableInc) {
                                                                    toast.error(`Pre položku '${item.name}' je skladom iba ${available} ks.`);
                                                                    return;
                                                                }
                                                                updateQuantity(item.productId, item.quantity + 1, item.variantReference);
                                                            }}
                                                            disableInc={disableInc}
                                                        />
                                                        {hasShortage && (
                                                            <span className="hidden md:inline text-xs font-medium text-red-500">Nie je toľko skladom</span>
                                                        )}
                                                        <div className="md:hidden ml-auto text-right">
                                                            <p className="text-sm font-bold text-slate-900">{lineTotal} €</p>
                                                            <p className="text-xs text-slate-400">{item.price} €/ks</p>
                                                        </div>
                                                    </div>
                                                    {hasShortage && (
                                                        <p className="md:hidden text-xs font-medium text-red-500 mt-1.5">Nie je toľko skladom</p>
                                                    )}
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>

                            {/* Mobile: summary card + clear */}
                            <div className="md:hidden mt-2.5 bg-white rounded-[18px] border border-slate-200 p-3.5">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">Súhrn objednávky</p>
                                <div className="flex justify-between text-sm mb-1.5">
                                    <span className="text-slate-500">Medziúčet</span>
                                    <span className="font-medium text-slate-900">{subtotal.toFixed(2)} €</span>
                                </div>
                                <div className="flex justify-between text-sm pb-2.5 mb-2.5 border-b border-slate-100">
                                    <span className="text-slate-500">Doprava</span>
                                    <span className="text-slate-400 text-xs">Podľa spôsobu</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-slate-900">Celkom</span>
                                    <span className="text-lg font-extrabold bg-clip-text text-transparent"
                                        style={{ backgroundImage: 'linear-gradient(135deg, #06b6d4, #10b981)' }}>
                                        {subtotal.toFixed(2)} €
                                    </span>
                                </div>
                            </div>
                            <div className="md:hidden text-center py-3">
                                <button type="button" onClick={clearCart}
                                    className="text-xs text-red-500 font-medium">
                                    Vyprázdniť košík
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── Order summary ── */}
                    <div className="hidden lg:block lg:w-80 flex-shrink-0">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 lg:sticky lg:top-24">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Súhrn objednávky</p>

                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Medziúčet</span>
                                    <span className="font-medium text-slate-900">{subtotal.toFixed(2)} €</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Doprava</span>
                                    <span className="text-slate-400 text-xs">Podľa spôsobu</span>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                                <span className="font-semibold text-slate-900">Celkom</span>
                                <span className="text-2xl font-extrabold bg-clip-text text-transparent"
                                    style={{ backgroundImage: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)' }}>
                                    {subtotal.toFixed(2)} €
                                </span>
                            </div>

                            {shortageItems.length > 0 && (
                                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-600 leading-relaxed">
                                    Niektoré položky nie sú dostupné v požadovanom množstve. Objednajte menej alebo nám napíšte správu.
                                </div>
                            )}

                            <div className="mt-4 space-y-2">
                                <GBtn full onClick={handleProceedToCheckout}>
                                    Pokračovať na objednávku →
                                </GBtn>
                                <Link to="/products"
                                    className="flex items-center justify-center w-full py-2.5 px-5 rounded-full border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                                    Pokračovať v nákupe
                                </Link>
                            </div>

                            {/* Stock inquiry box */}
                            {showStockIssueBox && shortageItems.length > 0 && (
                                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                                    <p className="text-xs font-semibold text-slate-700">Správa o nedostupnom tovare</p>
                                    <div>
                                        <label className="block text-xs text-slate-500 mb-1">Meno a priezvisko</label>
                                        <input type="text" value={contactFullName}
                                            onChange={(e) => setContactFullName(e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-cyan-400" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-500 mb-1">Text správy</label>
                                        <textarea value={contactMessage}
                                            onChange={(e) => setContactMessage(e.target.value)}
                                            rows={7}
                                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white focus:outline-none focus:border-cyan-400 resize-none" />
                                    </div>
                                    <GBtn full onClick={handleStockInquiry}>Napísať správu</GBtn>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile sticky bottom bar */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pt-3 pb-6 border-t border-slate-200"
                style={{ background: 'rgba(248,250,252,0.97)', backdropFilter: 'blur(14px)' }}>
                <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                        <p className="text-xs text-slate-400 font-medium">Celkom</p>
                        <p className="text-lg font-extrabold bg-clip-text text-transparent"
                            style={{ backgroundImage: 'linear-gradient(135deg, #06b6d4, #10b981)' }}>
                            {subtotal.toFixed(2)} €
                        </p>
                    </div>
                    <GBtn full onClick={handleProceedToCheckout}>Pokračovať na objednávku →</GBtn>
                </div>
            </div>
        </div>
    );
}
