import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { isAdmin } from '../api/auth';
import { getMyOrders, type Order } from '../api/orders';
import { useNavigate } from 'react-router-dom';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

const PAYMENT_LABELS: Record<string, string> = {
    bank_transfer: 'Bankový prevod',
    card: 'Karta',
};

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric' });

export default function OrdersPage() {
    const navigate = useNavigate();
    const isUserAdmin = isAdmin();
    useEffect(() => {
        if (isUserAdmin) navigate('/admin', { replace: true });
    }, [navigate, isUserAdmin]);

    const [expandedOrder, setExpandedOrder] = useState<number | null>(null);

    const { data: myOrders, isLoading, isError } = useQuery({
        queryKey: ['my-orders'],
        queryFn: getMyOrders,
        enabled: !isUserAdmin,
    });

    if (isLoading) {
        return <div className="p-8 text-center text-gray-500">Načítavam objednávky...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Moje objednávky</h1>

                {isError ? (
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
                                <button
                                    type="button"
                                    onClick={() => setExpandedOrder(prev => (prev === order.id ? null : order.id))}
                                    aria-expanded={expandedOrder === order.id}
                                    aria-controls={`order-panel-${order.id}`}
                                    className="w-full text-left px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex flex-wrap items-center gap-3">
                                        <span className="font-mono font-semibold text-gray-900 text-sm">#{order.order_number}</span>
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

                                {expandedOrder === order.id && (
                                    <div
                                        id={`order-panel-${order.id}`}
                                        className="border-t border-gray-100 px-5 py-4 bg-gray-50"
                                    >
                                        <div className="overflow-x-auto">
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
                                        </div>
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
        </div>
    );
}
