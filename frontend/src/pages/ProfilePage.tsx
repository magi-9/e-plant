import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMe, deleteMe, isAdmin } from '../api/auth';
import { getMyOrders, type Order } from '../api/orders';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import toast from 'react-hot-toast';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

const STATUS_LABELS: Record<string, string> = {
    new: 'Nová',
    awaiting_payment: 'Čaká na platbu',
    paid: 'Zaplatená',
    shipped: 'Odoslaná',
    cancelled: 'Zrušená',
};

const STATUS_COLORS: Record<string, string> = {
    new: 'bg-blue-100 text-blue-800',
    awaiting_payment: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
    shipped: 'bg-indigo-100 text-indigo-800',
    cancelled: 'bg-red-100 text-red-800',
};

const PAYMENT_LABELS: Record<string, string> = {
    bank_transfer: 'Bankový prevod',
    card: 'Karta',
};

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric' });

export default function ProfilePage() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const isUserAdmin = isAdmin();
    useEffect(() => {
        if (isUserAdmin) navigate('/admin', { replace: true });
    }, [navigate, isUserAdmin]);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [expandedOrder, setExpandedOrder] = useState<number | null>(null);

    const { data: userProfile, isLoading } = useQuery({
        queryKey: ['me'],
        queryFn: getMe,
        enabled: !isUserAdmin,
    });

    const { data: myOrders, isLoading: ordersLoading, isError: ordersError } = useQuery({
        queryKey: ['my-orders'],
        queryFn: getMyOrders,
        enabled: !isUserAdmin,
    });

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        phone: '',
        street: '',
        city: '',
        postal_code: '',
        is_company: false,
        company_name: '',
        ico: '',
        dic: '',
    });

    useEffect(() => {
        if (userProfile) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setFormData({
                first_name: userProfile.first_name || '',
                last_name: userProfile.last_name || '',
                phone: userProfile.phone || '',
                street: userProfile.street || '',
                city: userProfile.city || '',
                postal_code: userProfile.postal_code || '',
                is_company: userProfile.is_company || false,
                company_name: userProfile.company_name || '',
                ico: userProfile.ico || '',
                dic: userProfile.dic || '',
            });
        }
    }, [userProfile]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const updateProfile = async (data: typeof formData) => {
        const response = await client.patch('/auth/me/', data);
        return response.data;
    };

    const mutation = useMutation({
        mutationFn: updateProfile,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['me'] });
            toast.success('Profil bol úspešne uložený!');
        },
        onError: () => {
            toast.error('Chyba pri ukladaní profilu.');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: deleteMe,
        onSuccess: () => {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            queryClient.clear();
            toast.success('Váš účet bol úspešne a natrvalo vymazaný.');
            navigate('/');
            // Reload to clear states securely
            window.location.reload();
        },
        onError: () => {
            toast.error('Chyba pri vymazávaní účtu.');
            setIsDeleteModalOpen(false);
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate(formData);
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500">Načítavam dáta...</div>;

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Môj Profil</h1>

                <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
                    <h3 className="text-lg font-medium leading-6 text-gray-900 border-b pb-2">Osobné údaje</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Meno</label>
                            <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Priezvisko</label>
                            <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Telefón</label>
                            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md" />
                        </div>
                    </div>

                    <h3 className="text-lg font-medium leading-6 text-gray-900 border-b pb-2 mt-8">Adresa dodania / Fakturačná adresa</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Ulica a číslo</label>
                            <input type="text" name="street" value={formData.street} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Mesto</label>
                                <input type="text" name="city" value={formData.city} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">PSČ</label>
                                <input type="text" name="postal_code" value={formData.postal_code} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md" />
                            </div>
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <label className="flex items-center gap-2">
                            <input type="checkbox" name="is_company" checked={formData.is_company} onChange={handleChange} className="rounded text-blue-600 focus:ring-blue-500" />
                            <span className="text-sm text-gray-900 font-medium">Nakupujem na firmu</span>
                        </label>
                    </div>

                    {formData.is_company && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Názov firmy</label>
                                <input type="text" name="company_name" value={formData.company_name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">IČO</label>
                                    <input type="text" name="ico" value={formData.ico} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">DIČ / IČ DPH</label>
                                    <input type="text" name="dic" value={formData.dic} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md" />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between items-center pt-6 mt-6 border-t">
                        <button
                            type="button"
                            onClick={() => setIsDeleteModalOpen(true)}
                            className="px-4 py-2 text-red-600 font-medium hover:bg-red-50 rounded-md transition-colors"
                        >
                            Zabudnúť ma (zmazať účet)
                        </button>
                        <button type="submit" disabled={mutation.isPending} className="px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition">
                            {mutation.isPending ? 'Ukladám...' : 'Uložiť profil'}
                        </button>
                    </div>
                </form>

                {/* História objednávok */}
                <div className="mt-10">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">História objednávok</h2>

                    {ordersLoading ? (
                        <div className="text-center text-gray-500 py-8">Načítavam objednávky...</div>
                    ) : ordersError ? (
                        <div className="bg-white shadow rounded-lg p-8 text-center text-red-600">
                            Nepodarilo sa načítať objednávky. Skúste to znova neskôr.
                        </div>
                    ) : !myOrders || myOrders.length === 0 ? (
                        <div className="bg-white shadow rounded-lg p-8 text-center text-gray-500">
                            <svg className="mx-auto h-12 w-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <p>Zatiaľ nemáte žiadne objednávky.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {myOrders.map((order: Order) => (
                                <div key={order.id} className="bg-white shadow rounded-lg overflow-hidden">
                                    {/* Order header row */}
                                    <button
                                        type="button"
                                        onClick={() => setExpandedOrder(prev => (prev === order.id ? null : order.id))}
                                        aria-expanded={expandedOrder === order.id}
                                        aria-controls={`order-panel-${order.id}`}
                                        className="w-full text-left px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className="font-mono font-semibold text-gray-900 text-sm">#{order.order_number}</span>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-700'}`}>
                                                {STATUS_LABELS[order.status] ?? order.status}
                                            </span>
                                            <span className="text-xs text-gray-500">{PAYMENT_LABELS[order.payment_method] ?? order.payment_method}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm text-gray-500">{formatDate(order.created_at)}</span>
                                            <span className="font-semibold text-gray-900">{parseFloat(order.total_price).toFixed(2)} €</span>
                                            {expandedOrder === order.id
                                                ? <ChevronUpIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                                : <ChevronDownIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                            }
                                        </div>
                                    </button>

                                    {/* Expandable items */}
                                    {expandedOrder === order.id && (
                                        <div id={`order-panel-${order.id}`} className="border-t border-gray-100 px-5 py-4 bg-gray-50">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-200 pb-1">
                                                        <th className="pb-2">Produkt</th>
                                                        <th className="pb-2 text-center">Množstvo</th>
                                                        <th className="pb-2 text-right">Cena / ks</th>
                                                        <th className="pb-2 text-right">Spolu</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {order.items.map(item => (
                                                        <tr key={item.id}>
                                                            <td className="py-2 text-gray-800">{item.product_name}</td>
                                                            <td className="py-2 text-center text-gray-600">{item.quantity}</td>
                                                            <td className="py-2 text-right text-gray-600">{parseFloat(item.price_snapshot).toFixed(2)} €</td>
                                                            <td className="py-2 text-right font-medium text-gray-900">{parseFloat(item.subtotal).toFixed(2)} €</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot>
                                                    <tr className="border-t border-gray-200">
                                                        <td colSpan={3} className="pt-3 font-semibold text-gray-700 text-right pr-4">Celkom:</td>
                                                        <td className="pt-3 font-bold text-gray-900 text-right">{parseFloat(order.total_price).toFixed(2)} €</td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                            {order.notes && (
                                                <p className="mt-3 text-sm text-gray-500 italic">Poznámka: {order.notes}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Zmazanie modal */}
                {isDeleteModalOpen && (
                    <div className="fixed inset-0 z-50 overflow-y-auto">
                        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
                            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsDeleteModalOpen(false)}></div>
                            <div className="relative bg-white rounded-lg shadow-xl text-left overflow-hidden transform transition-all sm:my-8 sm:w-full sm:max-w-md">
                                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                    <div className="sm:flex sm:items-start">
                                        <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                                            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                        </div>
                                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                            <h3 className="text-lg leading-6 font-medium text-gray-900">
                                                Naozaj vymazať účet?
                                            </h3>
                                            <div className="mt-2">
                                                <p className="text-sm text-gray-500">
                                                    Naozaj chcete natrvalo vymazať váš účet, všetky osobné údaje a históriu objednávok z nášho systému? Táto akcia je <strong>nevratná</strong> v zmysle podmienok ochrany osobných údajov ("Právo na zabudnutie").
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 px-4 py-3 sm:px-6 flex flex-row-reverse gap-3">
                                    <button
                                        type="button"
                                        onClick={() => deleteMutation.mutate()}
                                        disabled={deleteMutation.isPending}
                                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 sm:w-auto sm:text-sm disabled:opacity-50"
                                    >
                                        {deleteMutation.isPending ? 'Mažem...' : 'Áno, natrvalo vymazať'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsDeleteModalOpen(false)}
                                        className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:w-auto sm:text-sm"
                                    >
                                        Zrušiť
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
