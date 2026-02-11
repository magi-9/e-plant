import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { createOrder } from '../api/orders';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

export default function CheckoutPage() {
    const navigate = useNavigate();
    const { items, getTotalPrice, clearCart } = useCartStore();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [orderSuccess, setOrderSuccess] = useState(false);
    const [orderNumber, setOrderNumber] = useState<string>('');

    const [formData, setFormData] = useState({
        customer_name: '',
        email: '',
        phone: '',
        street: '',
        city: '',
        postal_code: '',
        is_company: false,
        company_name: '',
        ico: '',
        dic: '',
        payment_method: 'bank_transfer' as 'bank_transfer' | 'card',
        notes: ''
    });

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

    const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const orderData = {
                ...formData,
                items: items.map(item => ({
                    product_id: item.productId,
                    quantity: item.quantity
                }))
            };

            const order = await createOrder(orderData);
            setOrderNumber(order.order_number);
            setOrderSuccess(true);
            clearCart();
        } catch (err: any) {
            console.error('Order creation error:', err);
            if (err.response?.data) {
                const errorData = err.response.data;
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
                            <h3 className="font-semibold text-gray-900 mb-2">Inštrukcie pre platbu:</h3>
                            <p className="text-sm text-gray-700 mb-2">
                                Variabilný symbol: <span className="font-mono font-bold">{orderNumber}</span>
                            </p>
                            <p className="text-sm text-gray-700 mb-2">
                                IBAN: SK00 0000 0000 0000 0000 0000
                            </p>
                            <p className="text-sm text-gray-700">
                                Suma: <span className="font-bold">{getTotalPrice().toFixed(2)} €</span>
                            </p>
                            <p className="mt-3 text-xs text-gray-600">
                                Po prijatí platby vám zašleme potvrdenie emailom.
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

                <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Dodacie údaje</h2>

                    {error && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="customer_name" className="block text-sm font-medium text-gray-700">
                                Meno a priezvisko *
                            </label>
                            <input
                                type="text"
                                id="customer_name"
                                name="customer_name"
                                required
                                value={formData.customer_name}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-2 border"
                            />
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
                                Telefón *
                            </label>
                            <input
                                type="tel"
                                id="phone"
                                name="phone"
                                required
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

                        <div className="grid grid-cols-2 gap-4">
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

                                <div className="grid grid-cols-2 gap-4">
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
                            </>
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
                                <label className="flex items-center p-4 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
                                    <input
                                        type="radio"
                                        name="payment_method"
                                        value="card"
                                        checked={formData.payment_method === 'card'}
                                        onChange={handleChange}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="ml-3 text-sm font-medium text-gray-900">
                                        Platobná karta
                                    </span>
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
                            disabled={loading}
                            className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                        >
                            {loading ? 'Vytváram objednávku...' : 'Dokončiť objednávku'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
