import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdminOrders, updateOrderStatus, type Order } from '../api/orders';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const STATUS_LABELS: Record<string, string> = {
    new: 'Nová',
    awaiting_payment: 'Čaká na platbu',
    paid: 'Zaplatená',
    shipped: 'Odoslaná',
    cancelled: 'Zrušená',
};

const STATUS_COLORS: Record<string, string> = {
    new: 'bg-blue-100 text-blue-800 border-blue-200',
    awaiting_payment: 'bg-amber-100 text-amber-800 border-amber-200',
    paid: 'bg-green-100 text-green-800 border-green-200',
    shipped: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200',
};

const PAYMENT_LABELS: Record<string, string> = {
    bank_transfer: 'Bankový prevod',
    card: 'Karta',
};

const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function AdminOrders() {
    const queryClient = useQueryClient();
    const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const { data: orders, isLoading, error } = useQuery({
        queryKey: ['adminOrders'],
        queryFn: getAdminOrders,
    });

    const statusMutation = useMutation({
        mutationFn: ({ id, status }: { id: number; status: string }) => updateOrderStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
            toast.success('Stav objednávky bol aktualizovaný.');
        },
        onError: () => toast.error('Chyba pri aktualizácii stavu.'),
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500" />
            </div>
        );
    }

    if (error) {
        return <div className="p-8 text-center text-red-500 text-lg">Chyba pri načítavaní objednávok.</div>;
    }

    const filtered = statusFilter === 'all'
        ? (orders ?? [])
        : (orders ?? []).filter((o: Order) => o.status === statusFilter);

    const counts = (orders ?? []).reduce((acc: Record<string, number>, o: Order) => {
        acc[o.status] = (acc[o.status] ?? 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="min-h-screen bg-slate-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900">Správa objednávok</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Celkom: <span className="font-semibold text-slate-700">{orders?.length ?? 0}</span> objednávok
                    </p>
                </div>

                {/* Status filter tabs */}
                <div className="flex flex-wrap gap-2 mb-6">
                    <button
                        onClick={() => setStatusFilter('all')}
                        className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                            statusFilter === 'all'
                                ? 'bg-slate-800 text-white border-slate-800'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        Všetky ({orders?.length ?? 0})
                    </button>
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setStatusFilter(key)}
                            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                                statusFilter === key
                                    ? 'bg-slate-800 text-white border-slate-800'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            {label} {counts[key] ? `(${counts[key]})` : '(0)'}
                        </button>
                    ))}
                </div>

                {filtered.length === 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
                        Žiadne objednávky s týmto filtrom.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map((order: Order) => (
                            <div key={order.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                {/* Order header */}
                                <button
                                    type="button"
                                    onClick={() => setExpandedOrder(prev => prev === order.id ? null : order.id)}
                                    className="w-full text-left px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50 transition-colors"
                                >
                                    <div className="flex flex-wrap items-center gap-3">
                                        <span className="font-mono font-bold text-slate-900 text-sm">#{order.order_number}</span>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[order.status] ?? 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                                            {STATUS_LABELS[order.status] ?? order.status}
                                        </span>
                                        <span className="text-xs text-slate-500">{PAYMENT_LABELS[order.payment_method] ?? order.payment_method}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-xs text-slate-500">{formatDate(order.created_at)}</span>
                                        <span className="font-bold text-slate-900">{Number(order.total_price).toFixed(2)} €</span>
                                        {expandedOrder === order.id
                                            ? <ChevronUpIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                            : <ChevronDownIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                        }
                                    </div>
                                </button>

                                {/* Expanded detail */}
                                {expandedOrder === order.id && (
                                    <div className="border-t border-slate-100 bg-slate-50 px-5 py-5">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
                                            {/* Customer */}
                                            <div>
                                                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1.5">Zákazník</p>
                                                <p className="font-semibold text-slate-900 text-sm">{order.customer_name}</p>
                                                <p className="text-sm text-slate-600">{order.email}</p>
                                                <p className="text-sm text-slate-600">{order.phone}</p>
                                                {order.is_company && (
                                                    <div className="mt-1 text-xs text-slate-500">
                                                        <p className="font-medium text-slate-700">{order.company_name}</p>
                                                        <p>IČO: {order.ico}</p>
                                                        {order.dic && <p>DIČ: {order.dic}</p>}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Shipping address */}
                                            <div>
                                                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1.5">Doručovacia adresa</p>
                                                <p className="text-sm text-slate-700">{order.street}</p>
                                                <p className="text-sm text-slate-700">{order.postal_code} {order.city}</p>
                                                <p className="text-sm text-slate-700">{order.country}</p>
                                                {order.shipping_carrier && (
                                                    <p className="mt-1 text-xs text-slate-500">Dopravca: {order.shipping_carrier}</p>
                                                )}
                                                {order.shipping_cost && (
                                                    <p className="text-xs text-slate-500">Doprava: {Number(order.shipping_cost).toFixed(2)} €</p>
                                                )}
                                            </div>

                                            {/* Status update */}
                                            <div>
                                                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1.5">Zmeniť stav</p>
                                                <select
                                                    value={order.status}
                                                    onChange={(e) => statusMutation.mutate({ id: order.id, status: e.target.value })}
                                                    disabled={statusMutation.isPending}
                                                    className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 disabled:opacity-50"
                                                >
                                                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                                                        <option key={key} value={key}>{label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Items table */}
                                        <div>
                                            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-2">Položky</p>
                                            <div className="overflow-x-auto rounded-lg border border-slate-200">
                                                <table className="w-full text-sm bg-white">
                                                    <thead className="bg-slate-50 border-b border-slate-200">
                                                        <tr>
                                                            <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Produkt</th>
                                                            <th className="text-center px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Množstvo</th>
                                                            <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Cena / ks</th>
                                                            <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Spolu</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {order.items.map(item => (
                                                            <tr key={item.id} className="hover:bg-slate-50">
                                                                <td className="px-4 py-2.5 text-slate-800">
                                                                    <span>{item.product_name}</span>
                                                                    {item.batch_allocations?.length > 0 && (
                                                                        <div className="mt-1 flex flex-wrap gap-1">
                                                                            {item.batch_allocations.map((b, i) => (
                                                                                <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-cyan-50 text-cyan-700 border border-cyan-100">
                                                                                    Šarža {b.batch_number} ({b.quantity} ks)
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-2.5 text-center text-slate-600">{item.quantity}</td>
                                                                <td className="px-4 py-2.5 text-right text-slate-600">{Number(item.price_snapshot).toFixed(2)} €</td>
                                                                <td className="px-4 py-2.5 text-right font-semibold text-slate-900">{Number(item.subtotal).toFixed(2)} €</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot className="bg-slate-50 border-t border-slate-200">
                                                        <tr>
                                                            <td colSpan={3} className="px-4 py-2.5 text-right text-sm font-semibold text-slate-700">Celkom:</td>
                                                            <td className="px-4 py-2.5 text-right font-bold text-slate-900">{Number(order.total_price).toFixed(2)} €</td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        </div>

                                        {order.notes && (
                                            <p className="mt-3 text-sm text-slate-500 bg-white border border-slate-200 rounded-lg p-3 italic">
                                                <span className="font-semibold not-italic text-slate-700">Poznámka: </span>{order.notes}
                                            </p>
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
