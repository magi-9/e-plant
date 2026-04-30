import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCartStore } from '../store/cartStore';
import { createOrder } from '../api/orders';
import type { CreateOrderData } from '../api/orders';
import { getMe, isAdmin } from '../api/auth';
import { authService } from '../api/authService';
import { getGlobalSettings } from '../api/settings';
import client from '../api/client';
import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';

const PHONE_REGEX = /^(\+[0-9]{12}|0[0-9]{9})$/;
const POSTAL_CODE_REGEX = /^[0-9]{3}\s?[0-9]{2}$/;

const splitStreet = (street: string) => {
    const value = (street || '').trim();
    const match = value.match(/^(.*?)[\s,]+([0-9]+[A-Za-z/]*)$/);
    if (!match) return { street_name: value, street_number: '' };
    return { street_name: (match[1] || '').trim(), street_number: (match[2] || '').trim() };
};

// ── design atoms ─────────────────────────────────────────────

function GBtn({
    children, onClick, outline, full, disabled, type = 'button', loading,
}: {
    children: React.ReactNode; onClick?: () => void; outline?: boolean;
    full?: boolean; disabled?: boolean; type?: 'button' | 'submit'; loading?: boolean;
}) {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all text-sm
                ${full ? 'w-full' : ''}
                px-6 py-3
                ${(disabled || loading) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'}
                ${outline
                    ? 'border border-cyan-500 text-cyan-600 bg-white hover:bg-cyan-50'
                    : 'text-white shadow-[0_4px_14px_rgba(6,182,212,0.22)] hover:shadow-[0_6px_20px_rgba(6,182,212,0.35)]'
                }`}
            style={outline || disabled || loading ? undefined : { background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)' }}
        >
            {loading && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
            )}
            {children}
        </button>
    );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-4 overflow-hidden">
            <div className="px-6 py-3.5 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">{title}</h3>
            </div>
            <div className="px-6 py-5">{children}</div>
        </div>
    );
}

function Field({
    label, name, value, onChange, type = 'text', required, placeholder, half, autoComplete, readOnly, id,
    as: As = 'input', children,
}: {
    label: string; name?: string; value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    type?: string; required?: boolean; placeholder?: string; half?: boolean; autoComplete?: string;
    readOnly?: boolean; id?: string; as?: 'input' | 'textarea' | 'select'; children?: React.ReactNode;
}) {
    return (
        <div className={half ? 'flex-1 min-w-0' : 'w-full'}>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                {label}{required && <span className="text-red-400 ml-0.5">*</span>}
            </label>
            {As === 'select' ? (
                <select
                    id={id} name={name} value={value}
                    onChange={onChange as React.ChangeEventHandler<HTMLSelectElement>}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white text-slate-900 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 transition-all"
                >{children}</select>
            ) : As === 'textarea' ? (
                <textarea
                    id={id} name={name} value={value}
                    onChange={onChange as React.ChangeEventHandler<HTMLTextAreaElement>}
                    placeholder={placeholder} rows={3}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white text-slate-900 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 transition-all resize-none"
                />
            ) : (
                <input
                    id={id} type={type} name={name} value={value}
                    onChange={onChange as React.ChangeEventHandler<HTMLInputElement>}
                    required={required} placeholder={placeholder} readOnly={readOnly}
                    autoComplete={autoComplete}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all
                        ${readOnly
                            ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-default'
                            : 'bg-white border-slate-200 text-slate-900 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100'}`}
                />
            )}
        </div>
    );
}

function ToggleRow({ checked, onChange, label, desc }: {
    checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string;
}) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            aria-pressed={checked}
            className="w-full flex items-center gap-3 cursor-pointer transition-all text-left"
            style={{
                padding: '14px 16px',
                background: checked ? '#e0f7fa' : '#fff',
                borderRadius: checked ? '14px 14px 0 0' : 14,
                border: `1.5px solid ${checked ? '#0891b2' : '#e2e8f0'}`,
            }}
        >
            <div
                className="relative flex-shrink-0 transition-all"
                style={{ width: 44, height: 26, borderRadius: 13, background: checked ? 'linear-gradient(135deg, #06b6d4, #10b981)' : '#cbd5e1' }}
            >
                <div
                    className="absolute top-[3px] w-5 h-5 rounded-full bg-white shadow transition-all"
                    style={{ left: checked ? 21 : 3 }}
                />
            </div>
            <div>
                <p className="text-sm font-semibold text-slate-900">{label}</p>
                {desc && <p className="text-xs text-slate-400">{desc}</p>}
            </div>
        </button>
    );
}

function PayCard({
    selected, onClick, icon, title, subtitle, badge,
}: {
    selected: boolean; onClick: () => void; icon: React.ReactNode;
    title: string; subtitle?: string; badge?: React.ReactNode;
}) {
    return (
        <div
            onClick={onClick}
            className="flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all mb-3"
            style={{
                borderColor: selected ? '#0891b2' : '#e2e8f0',
                background: selected ? '#e0f7fa' : '#fff',
            }}
        >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: selected ? 'rgba(8,145,178,0.12)' : '#f8fafc' }}>
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{title}</span>
                    {badge}
                </div>
                {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
            <div
                className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                style={{
                    borderColor: selected ? '#0891b2' : '#cbd5e1',
                    background: selected ? 'linear-gradient(135deg, #06b6d4, #10b981)' : 'transparent',
                }}
            >
                {selected && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                )}
            </div>
        </div>
    );
}

// ── step indicator ────────────────────────────────────────────

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
    const steps = [
        { n: 1 as const, label: 'Kontaktné údaje', labelShort: 'Kontakt' },
        { n: 2 as const, label: 'Doručenie & platba', labelShort: 'Doručenie' },
        { n: 3 as const, label: 'Potvrdenie', labelShort: 'Potvrdenie' },
    ];
    return (
        <div className="flex items-center justify-center mb-8">
            {steps.map((s, i) => (
                <div key={s.n} className="flex items-center">
                    <div className="flex flex-col items-center">
                        <div
                            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all"
                            style={{
                                background: s.n <= current ? 'linear-gradient(135deg, #06b6d4, #10b981)' : '#e2e8f0',
                                color: s.n <= current ? '#fff' : '#94a3b8',
                                boxShadow: s.n === current ? '0 0 0 4px rgba(6,182,212,0.15)' : 'none',
                            }}
                        >
                            {s.n < current ? (
                                <svg width="14" height="12" viewBox="0 0 14 12" fill="none">
                                    <path d="M1 6l4 4 8-8" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            ) : s.n}
                        </div>
                        <span className="mt-1.5 text-xs font-medium"
                            style={{ color: s.n <= current ? '#0f172a' : '#94a3b8' }}>
                            <span className="hidden sm:inline">{s.label}</span>
                            <span className="sm:hidden">{s.labelShort}</span>
                        </span>
                    </div>
                    {i < steps.length - 1 && (
                        <div className="w-10 sm:w-16 h-0.5 mx-2 mb-5 transition-all"
                            style={{ background: s.n < current ? 'linear-gradient(90deg, #06b6d4, #10b981)' : '#e2e8f0' }} />
                    )}
                </div>
            ))}
        </div>
    );
}

// ── order summary sidebar ─────────────────────────────────────

function OrderSummary({ items, shippingMethod, shippingCost }: {
    items: ReturnType<typeof useCartStore.getState>['items'];
    shippingMethod: string;
    shippingCost: number;
}) {
    const subtotal = items.reduce((s, i) => s + parseFloat(i.price) * i.quantity, 0);
    const total = subtotal + (shippingMethod === 'pickup' ? 0 : shippingCost);

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 lg:sticky lg:top-24">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Súhrn objednávky</p>
            <div className="space-y-2.5 mb-4">
                {items.map((item) => (
                    <div key={`${item.productId}:${item.variantReference || 'default'}`}
                        className="flex justify-between gap-2 text-sm">
                        <span className="text-slate-600 min-w-0 truncate">
                            {item.name}{item.variantLabel ? ` (${item.variantLabel})` : ''} ×{item.quantity}
                        </span>
                        <span className="font-medium text-slate-900 flex-shrink-0 tabular-nums">
                            {(parseFloat(item.price) * item.quantity).toFixed(2)} €
                        </span>
                    </div>
                ))}
            </div>
            <div className="border-t border-slate-100 pt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-slate-500">Medziúčet</span>
                    <span className="font-medium text-slate-900">{subtotal.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-500">Doprava</span>
                    <span className={shippingMethod === 'pickup' ? 'text-emerald-600 font-medium' : 'font-medium text-slate-900'}>
                        {shippingMethod === 'pickup' ? 'Zadarmo' : shippingCost > 0 ? `${shippingCost.toFixed(2)} €` : '—'}
                    </span>
                </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
                <span className="font-bold text-slate-900">Celkom</span>
                <span className="text-xl font-extrabold bg-clip-text text-transparent"
                    style={{ backgroundImage: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)' }}>
                    {total.toFixed(2)} €
                </span>
            </div>
        </div>
    );
}

// ── main page ─────────────────────────────────────────────────

export default function CheckoutPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (isAdmin()) navigate('/admin', { replace: true });
    }, [navigate]);

    const { items, clearCart } = useCartStore();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [orderSuccess, setOrderSuccess] = useState(false);
    const [orderNumber, setOrderNumber] = useState<string>('');
    const [orderTotal, setOrderTotal] = useState<number>(0);
    const [saveToProfile, setSaveToProfile] = useState(false);
    const [agreementsAccepted, setAgreementsAccepted] = useState(false);
    const [agreementsError, setAgreementsError] = useState(false);
    const agreementsErrorMessage = 'Please accept the terms and conditions to proceed with your order.';
    const isLoggedIn = authService.isAuthenticated();

    const { data: userProfile } = useQuery({ queryKey: ['me'], queryFn: getMe, enabled: isLoggedIn });
    const { data: globalSettings } = useQuery({ queryKey: ['global-settings'], queryFn: getGlobalSettings });

    const [step, setStep] = useState<1 | 2>(1);
    const formInitialized = useRef(false);
    const step1FormRef = useRef<HTMLFormElement>(null);

    const [formData, setFormData] = useState({
        title: '', first_name: '', last_name: '', email: '', phone: '',
        street_name: '', street_number: '', address_line2: '',
        city: '', postal_code: '', country: 'SK',
        is_company: false, company_name: '', ico: '', dic: '', dic_dph: '', is_vat_payer: false,
        payment_method: 'bank_transfer' as 'bank_transfer' | 'card',
        shipping_method: 'courier' as 'courier' | 'pickup',
        notes: '',
    });

    useEffect(() => {
        if (userProfile && !formInitialized.current) {
            const parsedStreet = splitStreet(userProfile.street || '');
            formInitialized.current = true;
            setFormData(prev => ({
                ...prev,
                title: userProfile.title || '',
                first_name: userProfile.first_name || '',
                last_name: userProfile.last_name || '',
                email: userProfile.email || '',
                phone: userProfile.phone || '',
                street_name: parsedStreet.street_name,
                street_number: parsedStreet.street_number,
                city: userProfile.city || '',
                postal_code: userProfile.postal_code || '',
                country: userProfile.country || 'SK',
                is_company: userProfile.is_company || false,
                company_name: userProfile.company_name || '',
                ico: userProfile.ico || '',
                dic: userProfile.dic || '',
            }));
        }
    }, [userProfile]);

    if (items.length === 0 && !orderSuccess) {
        navigate('/cart');
        return null;
    }

    const set = (name: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const shippingCost = Number(globalSettings?.shipping_cost ?? 0);

    // ── step 1 → 2 ───────────────────────────────────────────
    const proceedToStep2 = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const normalizedPhone = formData.phone.replace(/[\s-]/g, '');
        if (!PHONE_REGEX.test(normalizedPhone)) {
            setError('Telefón musí byť vo formáte +421XXXXXXXXX alebo 0XXXXXXXXX.');
            return;
        }
        setError(null);
        setStep(2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // ── final submit ──────────────────────────────────────────
    const handleFinalSubmit = async () => {
        if (!agreementsAccepted) {
            setError(agreementsErrorMessage);
            setAgreementsError(true);
            return;
        }
        const normalizedPhone = formData.phone.replace(/[\s-]/g, '');
        const normalizedPostalCode = formData.postal_code.replace(/[\s-]/g, '');
        const combinedStreet = `${formData.street_name} ${formData.street_number}`.trim();
        const isPickup = formData.shipping_method === 'pickup';

        if (!PHONE_REGEX.test(normalizedPhone)) { setError('Skontrolujte telefón.'); return; }
        if (!isPickup && (!POSTAL_CODE_REGEX.test(formData.postal_code.trim()) || !combinedStreet || !formData.street_number.trim())) {
            setError('Skontrolujte PSČ a adresu (ulica + číslo).'); return;
        }

        setLoading(true);
        setError(null);

        try {
            const variantNotes = items
                .filter(i => i.variantReference)
                .map(i => `${i.name} x${i.quantity} -> ${i.variantLabel || i.variantReference}`);
            const mergedNotes = [formData.notes.trim(), variantNotes.length ? `Varianty: ${variantNotes.join(' | ')}` : '']
                .filter(Boolean).join('\n\n');

            const orderData: CreateOrderData = {
                customer_name: `${formData.title} ${formData.first_name} ${formData.last_name}`.trim(),
                email: formData.email, phone: normalizedPhone,
                street: isPickup ? '' : combinedStreet,
                city: isPickup ? '' : formData.city,
                postal_code: isPickup ? '' : normalizedPostalCode,
                country: formData.country,
                shipping_address: formData.address_line2.trim(),
                is_company: formData.is_company, company_name: formData.company_name,
                ico: formData.ico, dic: formData.dic, dic_dph: formData.dic_dph,
                is_vat_payer: formData.is_vat_payer,
                payment_method: formData.payment_method,
                shipping_method: formData.shipping_method,
                notes: mergedNotes,
                items: items.map(i => ({ product_id: i.productId, quantity: i.quantity })),
            };

            const order = await createOrder(orderData);

            if (saveToProfile && isLoggedIn) {
                try {
                    await client.patch('/auth/me/', {
                        title: formData.title, first_name: formData.first_name, last_name: formData.last_name,
                        phone: normalizedPhone, is_company: formData.is_company,
                        company_name: formData.company_name, ico: formData.ico, dic: formData.dic,
                        ...(isPickup ? {} : { street: combinedStreet, city: formData.city, postal_code: normalizedPostalCode }),
                    });
                    queryClient.invalidateQueries({ queryKey: ['me'] });
                    toast.success('Údaje boli uložené do profilu.');
                } catch {
                    toast.error('Objednávka bola vytvorená, ale profil sa nepodarilo uložiť.');
                }
            }

            setOrderNumber(order.order_number);
            setOrderTotal(Number(order.total_price));
            setOrderSuccess(true);
            clearCart();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err: unknown) {
            if (isAxiosError(err) && err.response?.data) {
                const d = err.response.data;
                setError(typeof d === 'object'
                    ? Object.entries(d).map(([k, v]) => `${k}: ${v}`).join(', ')
                    : 'Chyba pri vytváraní objednávky');
            } else {
                setError('Chyba pri vytváraní objednávky');
            }
        } finally {
            setLoading(false);
        }
    };

    // ── success screen ────────────────────────────────────────
    if (orderSuccess) {
        return (
            <div className="min-h-screen bg-slate-50 py-12 px-4">
                <style>{`
                    @keyframes scaleIn { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                    @keyframes fadeUp  { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
                    .anim-check { animation: scaleIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both; }
                    .anim-1 { animation: fadeUp 0.4s ease-out 0.2s both; }
                    .anim-2 { animation: fadeUp 0.4s ease-out 0.35s both; }
                    .anim-3 { animation: fadeUp 0.4s ease-out 0.5s both; }
                `}</style>
                <div className="max-w-lg mx-auto">
                    <StepIndicator current={3} />
                    <div className="text-center mb-6">
                        <div className="anim-check mx-auto w-20 h-20 rounded-full flex items-center justify-center shadow-lg"
                            style={{ background: 'linear-gradient(135deg, #06b6d4, #10b981)' }}>
                            <svg width="36" height="28" viewBox="0 0 36 28" fill="none">
                                <path d="M3 14l9 9L33 3" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>
                    </div>

                    <div className="anim-1 text-center mb-6">
                        <h2 className="text-2xl font-extrabold text-slate-900">Objednávka prijatá!</h2>
                        <p className="mt-2 text-sm text-slate-500">Potvrdenie sme zaslali na váš e-mail.</p>
                    </div>

                    <div className="anim-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-4">
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Číslo objednávky</span>
                            <span className="font-mono font-bold text-cyan-700">{orderNumber}</span>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Celková suma</span>
                                <span className="font-bold text-slate-900">{orderTotal.toFixed(2)} €</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Platba</span>
                                <span className="text-slate-700">Bankový prevod</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Doprava</span>
                                <span className="text-slate-700">
                                    {formData.shipping_method === 'pickup' ? 'Osobný odber' : 'Kuriér'}
                                </span>
                            </div>
                        </div>

                        {formData.payment_method === 'bank_transfer' && (
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Platobné inštrukcie</p>
                                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Suma</span>
                                        <span className="font-bold text-slate-900">{orderTotal.toFixed(2)} €</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Variabilný symbol</span>
                                        <span className="font-mono font-bold text-slate-900">{orderNumber}</span>
                                    </div>
                                    {globalSettings?.iban && (
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">IBAN</span>
                                            <span className="font-mono font-bold text-slate-900">{globalSettings.iban}</span>
                                        </div>
                                    )}
                                    {globalSettings?.bank_name && (
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Banka</span>
                                            <span className="text-slate-900">{globalSettings.bank_name}</span>
                                        </div>
                                    )}
                                    {globalSettings?.bank_swift && (
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">SWIFT/BIC</span>
                                            <span className="font-mono text-slate-900">{globalSettings.bank_swift}</span>
                                        </div>
                                    )}
                                    <p className="pt-2 border-t border-amber-200 text-xs text-slate-400">
                                        Faktúra s platobnými údajmi bola zaslaná na váš e-mail.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="anim-3 flex flex-col gap-2">
                        <GBtn full onClick={() => navigate('/products')}>Späť do e-shopu</GBtn>
                        <Link to="/orders"
                            className="flex items-center justify-center w-full py-3 px-6 rounded-full border border-cyan-500 text-sm font-semibold text-cyan-600 hover:bg-cyan-50 transition-colors">
                            Zobraziť moje objednávky
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const indicatorStep = step === 1 ? 1 : 2;

    return (
        <div className="min-h-screen bg-slate-50 pt-8 pb-28 md:pb-8">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <StepIndicator current={indicatorStep} />

                <div className="flex flex-col lg:flex-row gap-6 items-start">
                    {/* ── main form ── */}
                    <div className="flex-1 min-w-0">

                        {/* STEP 1 ─ Contact & Address */}
                        {step === 1 && (
                            <form ref={step1FormRef} onSubmit={proceedToStep2}>
                                {error && (
                                    <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                                        {error}
                                    </div>
                                )}

                                <SectionCard title="Kontaktné údaje">
                                    <div className="space-y-4">
                                        <div className="flex gap-4">
                                            <Field label="Titul" name="title" value={formData.title} onChange={set('title')} half placeholder="MUDr., Ing." />
                                            <Field label="Meno" name="first_name" value={formData.first_name} onChange={set('first_name')} half required />
                                            <Field label="Priezvisko" name="last_name" value={formData.last_name} onChange={set('last_name')} half required />
                                        </div>
                                        <div className="flex gap-4">
                                            <Field label="E-mail" name="email" type="email" value={formData.email} onChange={set('email')} half required autoComplete="email" />
                                            <Field label="Telefón" name="phone" type="tel" value={formData.phone} onChange={set('phone')} half required placeholder="+421 900 123 456" autoComplete="tel" />
                                        </div>
                                    </div>
                                </SectionCard>

                                <SectionCard title="Adresa">
                                    <div className="space-y-4">
                                        <div className="flex gap-4">
                                            <Field label="Ulica" name="street_name" value={formData.street_name} onChange={set('street_name')} half required placeholder="Hlavná" />
                                            <Field label="Číslo" name="street_number" value={formData.street_number} onChange={set('street_number')} half required placeholder="123" />
                                        </div>
                                        <Field label="Adresa 2 (nepovinné)" name="address_line2" value={formData.address_line2} onChange={set('address_line2')} placeholder="Poschodie, byt..." />
                                        <div className="flex gap-4">
                                            <Field label="Mesto" name="city" value={formData.city} onChange={set('city')} half required />
                                            <Field label="PSČ" name="postal_code" value={formData.postal_code} onChange={set('postal_code')} half required placeholder="811 01" />
                                        </div>
                                        <Field label="Krajina" name="country" value={formData.country} onChange={set('country')} as="select">
                                            <option value="SK">Slovensko</option>
                                            <option value="CZ">Česká republika</option>
                                        </Field>
                                    </div>
                                </SectionCard>

                                <div className="mb-4">
                                    <ToggleRow
                                        checked={formData.is_company}
                                        onChange={v => setFormData(p => ({ ...p, is_company: v }))}
                                        label="Fakturovať na firmu / IČO"
                                        desc="Zadajte IČO, DIČ a DIČ DPH"
                                    />
                                    {formData.is_company && (
                                        <div className="px-5 py-5 space-y-4 border-x border-b border-cyan-400"
                                            style={{ borderRadius: '0 0 14px 14px', background: '#f8fafc' }}>
                                            <Field label="Názov firmy" name="company_name" value={formData.company_name}
                                                onChange={set('company_name')} required={formData.is_company} />
                                            <div className="flex gap-4">
                                                <Field label="IČO" name="ico" value={formData.ico} onChange={set('ico')} half required={formData.is_company} placeholder="12345678" />
                                                <Field label="DIČ" name="dic" value={formData.dic} onChange={set('dic')} half placeholder="SK1234567890" />
                                                <Field label="IČ DPH" name="dic_dph" value={formData.dic_dph} onChange={set('dic_dph')} half placeholder="SK1234567890" />
                                            </div>
                                            <label className="flex items-center gap-3 pt-2">
                                                <input type="checkbox" checked={formData.is_vat_payer}
                                                    onChange={e => setFormData(p => ({ ...p, is_vat_payer: e.target.checked }))}
                                                    className="w-4 h-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500" />
                                                <span className="text-sm text-slate-600">Som platiteľ DPH</span>
                                            </label>
                                        </div>
                                    )}
                                </div>

                                {isLoggedIn && (
                                    <div className="mb-4 flex items-center gap-3 px-1">
                                        <input type="checkbox" id="save_to_profile" checked={saveToProfile}
                                            onChange={e => setSaveToProfile(e.target.checked)}
                                            className="w-4 h-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500" />
                                        <label htmlFor="save_to_profile" className="text-sm text-slate-600 cursor-pointer">
                                            Zapamätať údaje pre budúce objednávky
                                        </label>
                                    </div>
                                )}

                                <div className="hidden md:flex gap-3 mt-2">
                                    <GBtn outline onClick={() => navigate('/cart')}>← Späť do košíka</GBtn>
                                    <GBtn type="submit" full>Pokračovať na doručenie & platbu →</GBtn>
                                </div>
                            </form>
                        )}

                        {/* STEP 2 ─ Shipping, Payment & Confirm */}
                        {step === 2 && (
                            <div>
                                {error && (
                                    <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                                        {error}
                                    </div>
                                )}

                                <SectionCard title="Spôsob doručenia">
                                    <PayCard
                                        selected={formData.shipping_method === 'courier'}
                                        onClick={() => setFormData(p => ({ ...p, shipping_method: 'courier' }))}
                                        title={`Kuriér — ${shippingCost > 0 ? `${shippingCost.toFixed(2)} €` : '...'}`}
                                        subtitle="Doručenie na adresu"
                                        icon={
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0891b2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 5v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                                            </svg>
                                        }
                                        badge={
                                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                                style={{ background: '#e0f7fa', color: '#0891b2' }}>
                                                {shippingCost > 0 ? `${shippingCost.toFixed(2)} €` : ''}
                                            </span>
                                        }
                                    />
                                    <PayCard
                                        selected={formData.shipping_method === 'pickup'}
                                        onClick={() => setFormData(p => ({ ...p, shipping_method: 'pickup' }))}
                                        title="Osobný odber — Zadarmo"
                                        subtitle={[globalSettings?.pickup_address, globalSettings?.opening_hours].filter(Boolean).join(' · ')}
                                        icon={
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                                            </svg>
                                        }
                                    />
                                </SectionCard>

                                <SectionCard title="Spôsob platby">
                                    <PayCard
                                        selected
                                        onClick={() => {}}
                                        title="Bankový prevod"
                                        subtitle="Platba na základe faktúry"
                                        icon={
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0891b2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                                            </svg>
                                        }
                                    />
                                    <p className="text-xs text-slate-400 mt-1 px-1">
                                        Platobné údaje dostanete e-mailom po potvrdení objednávky.
                                    </p>
                                </SectionCard>

                                <SectionCard title="Poznámka (nepovinné)">
                                    <Field label="Poznámka k objednávke" name="notes" value={formData.notes}
                                        onChange={set('notes')} as="textarea" placeholder="Špeciálne požiadavky alebo informácie pre kuriéra..." />
                                </SectionCard>

                                {/* GDPR agreement */}
                                <div
                                    className={`mb-4 rounded-2xl border shadow-sm px-5 py-4 ${agreementsError ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'}`}
                                >
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <div
                                            onClick={() => {
                                                const nextValue = !agreementsAccepted;
                                                setAgreementsAccepted(nextValue);
                                                if (nextValue) {
                                                    setAgreementsError(false);
                                                    if (error === agreementsErrorMessage) {
                                                        setError(null);
                                                    }
                                                }
                                            }}
                                            className="mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all cursor-pointer"
                                            style={{
                                                borderColor: agreementsAccepted ? '#0891b2' : agreementsError ? '#f87171' : '#cbd5e1',
                                                background: agreementsAccepted
                                                    ? 'linear-gradient(135deg, #06b6d4, #10b981)'
                                                    : agreementsError
                                                        ? '#fff5f5'
                                                        : '#fff',
                                            }}
                                        >
                                            {agreementsAccepted && (
                                                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                                    <path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            )}
                                        </div>
                                        <span className="text-sm text-slate-600 leading-relaxed">
                                            Súhlasím so{' '}
                                            <a href="/terms" target="_blank" rel="noreferrer" className="font-semibold text-cyan-600 hover:underline">
                                                všeobecnými podmienkami
                                            </a>{' '}
                                            a{' '}
                                            <a href="/privacy" target="_blank" rel="noreferrer" className="font-semibold text-cyan-600 hover:underline">
                                                GDPR / ochranou osobných údajov
                                            </a>.
                                        </span>
                                    </label>
                                </div>

                                <div className="hidden md:flex gap-3">
                                    <GBtn outline onClick={() => { setStep(1); setError(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                                        ← Späť
                                    </GBtn>
                                    <GBtn full onClick={handleFinalSubmit} loading={loading} disabled={loading}>
                                        {loading ? 'Spracovávam...' : 'Objednať s povinnosťou platby ✓'}
                                    </GBtn>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── sticky summary ── */}
                    <div className="w-full lg:w-80 flex-shrink-0">
                        <OrderSummary
                            items={items}
                            shippingMethod={formData.shipping_method}
                            shippingCost={shippingCost}
                        />
                    </div>
                </div>
            </div>

            {/* Mobile sticky bottom bar */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pt-3 pb-6 border-t border-slate-200"
                style={{ background: 'rgba(248,250,252,0.97)', backdropFilter: 'blur(14px)' }}>
                {step === 2 && (
                    <button
                        type="button"
                        onClick={() => { setStep(1); setError(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className="w-full py-2.5 px-5 rounded-full border border-cyan-500 text-sm font-semibold text-cyan-600 mb-2 bg-white"
                    >
                        ← Späť
                    </button>
                )}
                {step === 1 ? (
                    <GBtn full type="button" onClick={() => step1FormRef.current?.requestSubmit()}>
                        Pokračovať na doručenie & platbu →
                    </GBtn>
                ) : (
                    <GBtn full onClick={handleFinalSubmit} loading={loading} disabled={loading}>
                        {loading ? 'Spracovávam...' : 'Objednať s povinnosťou platby ✓'}
                    </GBtn>
                )}
            </div>
        </div>
    );
}
