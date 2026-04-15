import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    adminInterventionDeleteOrder,
    adminInterventionUpdateOrder,
    getAdminOrders,
    updateOrderStatus,
    type AdminOrderInterventionUpdateData,
    type Order
} from '../api/orders';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import AdminNav from '../components/AdminNav';

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

type DraftItem = {
    product_id: number;
    product_name: string;
    quantity: number;
};

type InterventionDraft = {
    reason: string;
    status: string;
    notes: string;
    customer_name: string;
    email: string;
    phone: string;
    street: string;
    city: string;
    postal_code: string;
    country: string;
    is_company: boolean;
    company_name: string;
    ico: string;
    dic: string;
    dic_dph: string;
    is_vat_payer: boolean;
    payment_method: 'bank_transfer' | 'card';
    items: DraftItem[];
};

const createDraftFromOrder = (order: Order): InterventionDraft => ({
    reason: '',
    status: order.status,
    notes: order.notes ?? '',
    customer_name: order.customer_name,
    email: order.email,
    phone: order.phone,
    street: order.street,
    city: order.city,
    postal_code: order.postal_code,
    country: (order.country || 'SK').toUpperCase(),
    is_company: order.is_company,
    company_name: order.company_name ?? '',
    ico: order.ico ?? '',
    dic: order.dic ?? '',
    dic_dph: order.dic_dph ?? '',
    is_vat_payer: order.is_vat_payer,
    payment_method: order.payment_method === 'card' ? 'card' : 'bank_transfer',
    items: order.items.map((item) => ({
        product_id: item.product,
        product_name: item.product_name,
        quantity: item.quantity,
    })),
});

const runDoubleConfirmation = (orderNumber: string, action: 'upraviť' | 'vymazať'): boolean => {
    const firstConfirm = window.confirm(`Naozaj chcete ${action} objednávku #${orderNumber}?`);
    if (!firstConfirm) {
        return false;
    }

    const typed = window.prompt(`Pre potvrdenie zadajte číslo objednávky: ${orderNumber}`);
    return (typed || '').trim().toUpperCase() === orderNumber.toUpperCase();
};

export default function AdminOrders() {
    const queryClient = useQueryClient();
    const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [drafts, setDrafts] = useState<Record<number, InterventionDraft>>({});

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

    const interventionUpdateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: AdminOrderInterventionUpdateData }) =>
            adminInterventionUpdateOrder(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
            toast.success('Objednávka bola upravená. Sklad aj zákazník boli aktualizovaní.');
        },
        onError: () => toast.error('Zásah sa nepodaril. Skontrolujte údaje.'),
    });

    const interventionDeleteMutation = useMutation({
        mutationFn: ({ id, reason }: { id: number; reason: string }) =>
            adminInterventionDeleteOrder(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
            toast.success('Objednávka bola vymazaná. Sklad bol vrátený a zákazník informovaný.');
        },
        onError: () => toast.error('Vymazanie objednávky sa nepodarilo.'),
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

    const isPaginated = <T,>(value: unknown): value is { results: T[] } => {
        return typeof value === 'object' && value !== null && Array.isArray((value as { results?: unknown }).results);
    };

    const ordersData: unknown = orders;

    const ordersList: Order[] = Array.isArray(orders)
        ? orders
        : isPaginated<Order>(ordersData)
            ? ordersData.results
            : [];

    const filtered = statusFilter === 'all'
        ? ordersList
        : ordersList.filter((o: Order) => o.status === statusFilter);

    const counts = ordersList.reduce((acc: Record<string, number>, o: Order) => {
        acc[o.status] = (acc[o.status] ?? 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const getDraft = (order: Order): InterventionDraft => {
        return drafts[order.id] ?? createDraftFromOrder(order);
    };

    const updateDraft = (orderId: number, partial: Partial<InterventionDraft>) => {
        setDrafts((prev) => {
            const foundOrder = ordersList.find((o) => o.id === orderId);
            if (!foundOrder) return prev;
            const current = prev[orderId] ?? createDraftFromOrder(foundOrder);
            return {
                ...prev,
                [orderId]: {
                    ...current,
                    ...partial,
                },
            };
        });
    };

    const updateDraftItemQty = (order: Order, productId: number, quantity: number) => {
        const current = getDraft(order);
        const safeQty = Number.isFinite(quantity) ? Math.max(1, quantity) : 1;
        updateDraft(order.id, {
            items: current.items.map((item) =>
                item.product_id === productId ? { ...item, quantity: safeQty } : item
            ),
        });
    };

    const submitInterventionUpdate = (order: Order) => {
        const draft = getDraft(order);
        if (draft.reason.trim().length < 8) {
            toast.error('Dôvod zásahu je povinný (min. 8 znakov).');
            return;
        }

        if (!runDoubleConfirmation(order.order_number, 'upraviť')) {
            toast.error('Dvojité potvrdenie neprebehlo, zmena sa nevykonala.');
            return;
        }

        interventionUpdateMutation.mutate({
            id: order.id,
            payload: {
                reason: draft.reason.trim(),
                status: draft.status,
                notes: draft.notes,
                customer_name: draft.customer_name,
                email: draft.email,
                phone: draft.phone,
                street: draft.street,
                city: draft.city,
                postal_code: draft.postal_code,
                country: draft.country,
                is_company: draft.is_company,
                company_name: draft.company_name,
                ico: draft.ico,
                dic: draft.dic,
                dic_dph: draft.dic_dph,
                is_vat_payer: draft.is_vat_payer,
                payment_method: draft.payment_method,
                items: draft.items.map((item) => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                })),
            },
        });
    };

    const submitInterventionDelete = (order: Order) => {
        const draft = getDraft(order);
        if (draft.reason.trim().length < 8) {
            toast.error('Pred vymazaním zadajte dôvod zásahu (min. 8 znakov).');
            return;
        }

        if (!runDoubleConfirmation(order.order_number, 'vymazať')) {
            toast.error('Dvojité potvrdenie neprebehlo, objednávka ostala zachovaná.');
            return;
        }

        interventionDeleteMutation.mutate({
            id: order.id,
            reason: draft.reason.trim(),
        });
    };

    return (
        <div className="min-h-screen bg-slate-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <AdminNav />
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900">Správa objednávok</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Celkom: <span className="font-semibold text-slate-700">{ordersList.length}</span> objednávok
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
                        Všetky ({ordersList.length})
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
                                        {(() => {
                                            const draft = getDraft(order);
                                            return (
                                                <>
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
                                                                <td className="px-4 py-2.5 text-center text-slate-600">
                                                                    <input
                                                                        type="number"
                                                                        min={1}
                                                                        value={draft.items.find((d) => d.product_id === item.product)?.quantity ?? item.quantity}
                                                                        onChange={(e) => updateDraftItemQty(order, item.product, Number(e.target.value))}
                                                                        className="w-20 rounded border border-slate-300 px-2 py-1 text-center"
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-2.5 text-right text-slate-600">{Number(item.price_snapshot).toFixed(2)} €</td>
                                                                <td className="px-4 py-2.5 text-right font-semibold text-slate-900">
                                                                    {(Number(item.price_snapshot) * (draft.items.find((d) => d.product_id === item.product)?.quantity ?? item.quantity)).toFixed(2)} €
                                                                </td>
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

                                        <div className="mt-4 bg-white border border-amber-200 rounded-xl p-4">
                                            <p className="text-xs font-semibold tracking-wide text-amber-700 uppercase">Admin zásah do objednávky</p>
                                            <p className="text-sm text-slate-600 mt-1 mb-3">
                                                Pri zásahu je povinný dôvod. Uloženie aj vymazanie vyžaduje dvojité potvrdenie.
                                            </p>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                                <div>
                                                    <label className="text-xs font-medium text-slate-600">Stav po zásahu</label>
                                                    <select
                                                        value={draft.status}
                                                        onChange={(e) => updateDraft(order.id, { status: e.target.value })}
                                                        className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                                                    >
                                                        {Object.entries(STATUS_LABELS).map(([key, label]) => (
                                                            <option key={key} value={key}>{label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-slate-600">Spôsob platby</label>
                                                    <select
                                                        value={draft.payment_method}
                                                        onChange={(e) => updateDraft(order.id, { payment_method: e.target.value as 'bank_transfer' | 'card' })}
                                                        className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                                                    >
                                                        <option value="bank_transfer">Bankový prevod</option>
                                                        <option value="card">Karta</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-xs font-medium text-slate-600">Poznámka pre zákazníka</label>
                                                <textarea
                                                    value={draft.notes}
                                                    onChange={(e) => updateDraft(order.id, { notes: e.target.value })}
                                                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                                    rows={2}
                                                />
                                            </div>

                                            <div className="mt-3">
                                                <label className="text-xs font-medium text-slate-600">Povinný dôvod zásahu</label>
                                                <textarea
                                                    value={draft.reason}
                                                    onChange={(e) => updateDraft(order.id, { reason: e.target.value })}
                                                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                                    rows={3}
                                                    placeholder="Uveďte dôvod zásahu (min. 8 znakov)"
                                                    required
                                                />
                                            </div>

                                            <div className="mt-4 flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => submitInterventionUpdate(order)}
                                                    disabled={interventionUpdateMutation.isPending || interventionDeleteMutation.isPending}
                                                    className="inline-flex items-center rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-50"
                                                >
                                                    Uložiť zásah (2x potvrdenie)
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => submitInterventionDelete(order)}
                                                    disabled={interventionUpdateMutation.isPending || interventionDeleteMutation.isPending}
                                                    className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                                                >
                                                    Vymazať objednávku (2x potvrdenie)
                                                </button>
                                            </div>
                                        </div>
                                                </>
                                            );
                                        })()}
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
