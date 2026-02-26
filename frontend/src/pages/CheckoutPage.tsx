import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCartStore } from '../store/cartStore';
import { createOrder } from '../api/orders';
import type { CreateOrderData } from '../api/orders';
import { getMe, isAdmin } from '../api/auth';
import { getPaymentSettings } from '../api/settings';
import client from '../api/client';
import { isAxiosError } from 'axios';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function CheckoutPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (isAdmin()) navigate('/admin', { replace: true });
    }, [navigate]);
    const { items, getTotalPrice, clearCart } = useCartStore();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [orderSuccess, setOrderSuccess] = useState(false);
    const [orderNumber, setOrderNumber] = useState<string>('');
    const [orderTotal, setOrderTotal] = useState<number>(0);
    const [saveToProfile, setSaveToProfile] = useState(false);
    const isLoggedIn = !!localStorage.getItem('access_token');

    const { data: userProfile } = useQuery({
        queryKey: ['me'],
        queryFn: getMe,
        enabled: isLoggedIn
    });

    const { data: globalSettings } = useQuery({
        queryKey: ['global-settings'],
        queryFn: getPaymentSettings,
    });

    const [step, setStep] = useState<1 | 2>(1);
    const formInitialized = useRef(false);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        street: '',
        city: '',
        postal_code: '',
        is_company: false,
        company_name: '',
        ico: '',
        dic: '',
        dic_dph: '',
        payment_method: 'bank_transfer' as 'bank_transfer' | 'card',
        notes: ''
    });

    useEffect(() => {
        if (userProfile && !formInitialized.current) {
            formInitialized.current = true;
            setFormData(prev => ({
                ...prev,
                first_name: userProfile.first_name || '',
                last_name: userProfile.last_name || '',
                email: userProfile.email || '',
                phone: userProfile.phone || '',
                street: userProfile.street || '',
                city: userProfile.city || '',
                postal_code: userProfile.postal_code || '',
                is_company: userProfile.is_company || false,
                company_name: userProfile.company_name || '',
                ico: userProfile.ico || '',
                dic: userProfile.dic || ''
            }));
        }
    }, [userProfile]);

    // Redirect if cart is empty
    if (items.length === 0 && !orderSuccess) {
        navigate('/cart');
        return null;
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const proceedToSummary = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setStep(2);
    };

    const handleFinalSubmit = async () => {
        setLoading(true);
        setError(null);

        try {
            const orderData: CreateOrderData = {
                customer_name: `${formData.first_name} ${formData.last_name}`.trim(),
                email: formData.email,
                phone: formData.phone,
                street: formData.street,
                city: formData.city,
                postal_code: formData.postal_code,
                is_company: formData.is_company,
                company_name: formData.company_name,
                ico: formData.ico,
                dic: formData.dic,
                dic_dph: formData.dic_dph,
                payment_method: formData.payment_method,
                notes: formData.notes,
                items: items.map(item => ({
                    product_id: item.productId,
                    quantity: item.quantity
                }))
            };

            const order = await createOrder(orderData);

            if (saveToProfile && isLoggedIn) {
                try {
                    await client.patch('/auth/me/', {
                        first_name: formData.first_name,
                        last_name: formData.last_name,
                        phone: formData.phone,
                        street: formData.street,
                        city: formData.city,
                        postal_code: formData.postal_code,
                        is_company: formData.is_company,
                        company_name: formData.company_name,
                        ico: formData.ico,
                        dic: formData.dic,
                    });
                    queryClient.invalidateQueries({ queryKey: ['me'] });
                    toast.success('Údaje boli uložené do profilu.');
                } catch {
                    toast.error('Objednávka bola vytvorená, ale profil sa nepodarilo uložiť.');
                }
            }

            setOrderNumber(order.order_number);
            setOrderTotal(getTotalPrice());
            setOrderSuccess(true);
            clearCart();
        } catch (error: unknown) {
            console.error('Order creation error:', error);
            if (isAxiosError(error) && error.response?.data) {
                const errorData = error.response.data;
                if (typeof errorData === 'object') {
                    const errorMessages = Object.entries(errorData)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(', ');
                    setError(errorMessages);
                } else {
                    setError('Chyba pri vytváraní objednávky');
                }
            } else {
                setError('Chyba pri vytváraní objednávky');
            }
        } finally {
            setLoading(false);
        }
    };

    if (orderSuccess) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full text-center">
                    <CheckCircleIcon className="mx-auto h-24 w-24 text-green-600" />
                    <h2 className="mt-6 text-3xl font-bold text-gray-900">
                        Objednávka úspešná!
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Vaša objednávka bola úspešne vytvorená.
                    </p>
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-700">
                            Číslo objednávky: <span className="font-bold text-blue-600">{orderNumber}</span>
                        </p>
                    </div>
                    {formData.payment_method === 'bank_transfer' && (
                        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-left">
                            <h3 className="font-semibold text-gray-900 mb-3">Inštrukcie pre platbu:</h3>
                            <div className="space-y-2 text-sm text-gray-700">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Suma:</span>
                                    <span className="font-bold text-gray-900">{orderTotal.toFixed(2)} €</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Variabilný symbol:</span>
                                    <span className="font-mono font-bold text-gray-900">{orderNumber}</span>
                                </div>
                                {globalSettings?.iban && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">IBAN:</span>
                                        <span className="font-mono font-bold text-gray-900">{globalSettings.iban}</span>
                                    </div>
                                )}
                                {globalSettings?.bank_name && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Banka:</span>
                                        <span className="font-medium text-gray-900">{globalSettings.bank_name}</span>
                                    </div>
                                )}
                                {globalSettings?.bank_swift && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">SWIFT/BIC:</span>
                                        <span className="font-mono font-medium text-gray-900">{globalSettings.bank_swift}</span>
                                    </div>
                                )}
                            </div>
                            <p className="mt-3 text-xs text-gray-500 border-t border-yellow-200 pt-3">
                                Faktúra s platobnými údajmi bola zaslaná na váš e-mail.
                            </p>
                        </div>
                    )}
                    <button
                        onClick={() => navigate('/products')}
                        className="mt-6 w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                        Pokračovať v nákupe
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Dokončenie objednávky</h1>

                <div className="bg-white shadow rounded-lg p-6 mb-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Súhrn objednávky</h2>
                    <div className="space-y-2">
                        {items.map((item) => (
                            <div key={item.productId} className="flex justify-between text-sm">
                                <span className="text-gray-700">
                                    {item.name} × {item.quantity}
                                </span>
                                <span className="text-gray-900 font-medium">
                                    {(Number.parseFloat(item.price) * item.quantity).toFixed(2)} €
                                </span>
                            </div>
                        ))}
                        <div className="border-t border-gray-200 pt-2 mt-2">
                            <div className="flex justify-between">
                                <span className="text-base font-medium text-gray-900">Celkom</span>
                                <span className="text-xl font-bold text-blue-600">
                                    {getTotalPrice().toFixed(2)} €
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {step === 1 ? (
                    <form onSubmit={proceedToSummary} className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-lg font-medium text-gray-900 mb-4">Dodacie údaje</h2>

                        {error && (
                            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">Meno *</label>
                                    <input
                                        type="text"
                                        id="first_name"
                                        name="first_name"
                                        required
                                        value={formData.first_name}
                                        onChange={handleChange}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-2 border"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">Priezvisko *</label>
                                    <input
                                        type="text"
                                        id="last_name"
                                        name="last_name"
                                        required
                                        value={formData.last_name}
                                        onChange={handleChange}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-2 border"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                    Email *
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-2 border"
                                />
                            </div>

                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                                    Telefón * (vo formáte +421 alebo číslice)
                                </label>
                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    required
                                    pattern="^\+?[0-9\s]{9,15}$"
                                    title="Zadajte platné telefónne číslo (napr. +421 900 123 456 alebo 0900123456)"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="+421 900 123 456"
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-2 border"
                                />
                            </div>

                            <div>
                                <label htmlFor="street" className="block text-sm font-medium text-gray-700">
                                    Ulica a číslo *
                                </label>
                                <input
                                    type="text"
                                    id="street"
                                    name="street"
                                    required
                                    value={formData.street}
                                    onChange={handleChange}
                                    placeholder="Hlavná 123"
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-2 border"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                                        Mesto *
                                    </label>
                                    <input
                                        type="text"
                                        id="city"
                                        name="city"
                                        required
                                        value={formData.city}
                                        onChange={handleChange}
                                        placeholder="Bratislava"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-2 border"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700">
                                        PSČ *
                                    </label>
                                    <input
                                        type="text"
                                        id="postal_code"
                                        name="postal_code"
                                        required
                                        pattern="^[0-9\s]{5,6}$"
                                        title="Zadajte platné 5-miestne PSČ (napr. 811 01 alebo 81101)"
                                        value={formData.postal_code}
                                        onChange={handleChange}
                                        placeholder="811 01"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-2 border"
                                    />
                                </div>
                            </div>

                            <div className="border-t border-gray-200 pt-4">
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="is_company"
                                        name="is_company"
                                        checked={formData.is_company}
                                        onChange={handleChange}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="is_company" className="ml-2 block text-sm text-gray-900">
                                        Objednávam na firmu
                                    </label>
                                </div>
                            </div>

                            {formData.is_company && (
                                <>
                                    <div>
                                        <label htmlFor="company_name" className="block text-sm font-medium text-gray-700">
                                            Názov firmy *
                                        </label>
                                        <input
                                            type="text"
                                            id="company_name"
                                            name="company_name"
                                            required={formData.is_company}
                                            value={formData.company_name}
                                            onChange={handleChange}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-2 border"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="ico" className="block text-sm font-medium text-gray-700">
                                                IČO *
                                            </label>
                                            <input
                                                type="text"
                                                id="ico"
                                                name="ico"
                                                required={formData.is_company}
                                                value={formData.ico}
                                                onChange={handleChange}
                                                placeholder="12345678"
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-2 border"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="dic" className="block text-sm font-medium text-gray-700">
                                                DIČ
                                            </label>
                                            <input
                                                type="text"
                                                id="dic"
                                                name="dic"
                                                value={formData.dic}
                                                onChange={handleChange}
                                                placeholder="SK1234567890"
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-2 border"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="dic_dph" className="block text-sm font-medium text-gray-700">
                                            IČ DPH
                                        </label>
                                        <input
                                            type="text"
                                            id="dic_dph"
                                            name="dic_dph"
                                            value={formData.dic_dph}
                                            onChange={handleChange}
                                            placeholder="SK1234567890"
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-2 border"
                                        />
                                    </div>
                                </>
                            )}

                            {isLoggedIn && (
                                <div className="border-t border-gray-200 pt-4">
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="save_to_profile"
                                            checked={saveToProfile}
                                            onChange={e => setSaveToProfile(e.target.checked)}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <label htmlFor="save_to_profile" className="ml-2 block text-sm text-gray-900">
                                            Zapamätať údaje pre budúce objednávky
                                        </label>
                                    </div>
                                </div>
                            )}

                            <div>
                                <span className="block text-sm font-medium text-gray-700 mb-2">
                                    Spôsob platby *
                                </span>
                                <div className="space-y-2">
                                    <label className="flex items-center p-4 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
                                        <input
                                            type="radio"
                                            name="payment_method"
                                            value="bank_transfer"
                                            checked={formData.payment_method === 'bank_transfer'}
                                            onChange={handleChange}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="ml-3 text-sm font-medium text-gray-900">
                                            Bankový prevod
                                        </span>
                                    </label>
                                    <label className="flex items-center p-4 border border-gray-200 bg-gray-50 rounded-md cursor-not-allowed opacity-60">
                                        <input
                                            type="radio"
                                            name="payment_method"
                                            value="card"
                                            disabled
                                            className="h-4 w-4 text-gray-400"
                                        />
                                        <div className="ml-3 flex flex-col">
                                            <span className="text-sm font-medium text-gray-500">
                                                Platobná karta
                                            </span>
                                            <span className="text-xs text-gray-400">Dočasne nedostupné</span>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                                    Poznámka k objednávke (nepovinné)
                                </label>
                                <textarea
                                    id="notes"
                                    name="notes"
                                    rows={3}
                                    value={formData.notes}
                                    onChange={handleChange}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-2 border"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex gap-4">
                            <button
                                type="button"
                                onClick={() => navigate('/cart')}
                                className="flex-1 bg-white text-gray-700 py-3 px-4 rounded-md font-medium border border-gray-300 hover:bg-gray-50 transition-colors"
                            >
                                Späť do košíka
                            </button>
                            <button
                                type="submit"
                                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors"
                            >
                                Prejsť na kontrolu
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-lg font-medium text-gray-900 mb-6 border-b pb-2">Kontrola údajov</h2>

                        <div className="space-y-4 mb-8 text-sm text-gray-700">
                            <div>
                                <span className="block text-gray-500 text-xs uppercase tracking-wider mb-1">Fakturačná a dodacia adresa</span>
                                <p className="font-medium text-gray-900">{formData.first_name} {formData.last_name}</p>
                                <p>{formData.street}</p>
                                <p>{formData.postal_code} {formData.city}</p>
                            </div>

                            {formData.is_company && (
                                <div>
                                    <span className="block text-gray-500 text-xs uppercase tracking-wider mb-1">Firemné údaje</span>
                                    <p className="font-medium text-gray-900">{formData.company_name}</p>
                                    <p>IČO: {formData.ico}</p>
                                    {formData.dic && <p>DIČ: {formData.dic}</p>}
                                    {formData.dic_dph && <p>IČ DPH: {formData.dic_dph}</p>}
                                </div>
                            )}

                            <div>
                                <span className="block text-gray-500 text-xs uppercase tracking-wider mb-1">Kontaktné údaje</span>
                                <p>{formData.email}</p>
                                <p>{formData.phone}</p>
                            </div>

                            <div>
                                <span className="block text-gray-500 text-xs uppercase tracking-wider mb-1">Spôsob platby</span>
                                <p className="font-medium text-gray-900">Bankový prevod</p>
                            </div>

                            {formData.notes && (
                                <div>
                                    <span className="block text-gray-500 text-xs uppercase tracking-wider mb-1">Poznámka</span>
                                    <p className="italic">{formData.notes}</p>
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        )}

                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="flex-1 bg-white text-gray-700 py-3 px-4 rounded-md font-medium border border-gray-300 hover:bg-gray-50 transition-colors"
                            >
                                Upraviť údaje
                            </button>
                            <button
                                type="button"
                                onClick={handleFinalSubmit}
                                disabled={loading}
                                className="flex-1 bg-green-600 text-white py-3 px-4 rounded-md font-medium hover:bg-green-700 transition-colors disabled:bg-gray-400"
                            >
                                {loading ? 'Spracovávam...' : 'Objednať s povinnosťou platby'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
