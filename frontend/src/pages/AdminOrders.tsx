import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdminOrders, updateAdminOrderStatus } from '../api/orders';

const STATUS_OPTIONS = [
    { value: 'new', label: 'Nová' },
    { value: 'awaiting_payment', label: 'Čaká na platbu' },
    { value: 'paid', label: 'Zaplatená' },
    { value: 'shipped', label: 'Odoslaná' },
    { value: 'cancelled', label: 'Zrušená' },
];

export default function AdminOrders() {
    const queryClient = useQueryClient();
    const [statusFilter, setStatusFilter] = useState('all');

    const { data: orders, isLoading, error } = useQuery({
        queryKey: ['adminOrders'],
        queryFn: getAdminOrders,
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: number; status: string }) => updateAdminOrderStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
        },
    });

    if (isLoading) {
        return <div className="p-8 text-center text-gray-500">Načítavam objednávky...</div>;
    }

    if (error) {
        return <div className="p-8 text-center text-red-500 text-lg">Chyba pri načítavaní objednávok.</div>;
    }

    const filteredOrders = statusFilter === 'all'
        ? orders
        : orders?.filter(order => order.status === statusFilter);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Správa objednávok</h1>

            <div className="mb-6">
                <label className="mr-4 text-gray-700 font-medium">Filter stavu:</label>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border border-gray-300 rounded-md shadow-sm p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="all">Všetky objednávky</option>
                    {STATUS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md flex flex-col gap-4 p-4">
                {filteredOrders?.map((order) => (
                    <div key={order.id} className="border border-gray-200 rounded-lg p-5">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-blue-800">#{order.order_number}</h3>
                                <p className="text-sm text-gray-600">Dátum: {new Date(order.created_at).toLocaleString('sk-SK')}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <p className="font-semibold text-gray-800">
                                    Spolu: {Number(order.total_price).toFixed(2)} €
                                </p>
                                <select
                                    value={order.status}
                                    onChange={(e) => updateStatusMutation.mutate({ id: order.id, status: e.target.value })}
                                    className="border border-gray-300 rounded p-1 text-sm bg-gray-50 font-medium"
                                    disabled={updateStatusMutation.isPending}
                                >
                                    {STATUS_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700 mb-4">
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-1">Zákazník</h4>
                                <p>{order.customer_name}</p>
                                <p>{order.email}</p>
                                <p>{order.phone}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-1">Doručovacia adresa</h4>
                                <p>{order.street}</p>
                                <p>{order.city}, {order.postal_code}</p>
                                {order.is_company && (
                                    <p className="mt-1 font-medium">Firma: {order.company_name} (IČO: {order.ico})</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-semibold text-gray-900 mb-2 border-b pb-1">Položky:</h4>
                            <ul className="space-y-1 mb-2">
                                {order.items.map(item => (
                                    <li key={item.id} className="text-sm text-gray-700 flex justify-between">
                                        <span>{item.quantity}x {item.product_name}</span>
                                        <span>{Number(item.subtotal).toFixed(2)} €</span>
                                    </li>
                                ))}
                            </ul>
                            {order.notes && (
                                <p className="text-sm text-gray-500 bg-gray-50 p-2 rounded italic mt-2">
                                    <span className="font-semibold not-italic">Poznámka: </span>
                                    {order.notes}
                                </p>
                            )}
                        </div>
                    </div>
                ))}

                {filteredOrders?.length === 0 && (
                    <div className="text-center text-gray-500 p-8">Žiadne objednávky v danom stave.</div>
                )}
            </div>
        </div>
    );
}
