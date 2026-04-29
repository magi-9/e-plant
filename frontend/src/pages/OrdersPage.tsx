import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { isAdmin } from '../api/auth';
import { getMyOrders, type Order } from '../api/orders';
import { useNavigate, Link } from 'react-router-dom';
import { ProfileSidebar } from '../components/ProfileSidebar';

// ── status config ────────────────────────────────────────────

const AUTO_CANCEL_WINDOW_MS = 24 * 60 * 60 * 1000;

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    new:               { label: 'Nová',            color: '#0891b2', bg: '#e0f7fa', dot: '#0891b2' },
    awaiting_payment:  { label: 'Čaká na platbu',  color: '#f59e0b', bg: '#fef3c7', dot: '#f59e0b' },
    paid:              { label: 'Zaplatená',        color: '#10b981', bg: '#d1fae5', dot: '#10b981' },
    shipped:           { label: 'Odoslaná',         color: '#0891b2', bg: '#e0f7fa', dot: '#0891b2' },
    cancelled:         { label: 'Zrušená',          color: '#ef4444', bg: '#fee2e2', dot: '#ef4444' },
};

function getStatusCfg(order: Order) {
    const isOld = Date.now() - new Date(order.created_at).getTime() > AUTO_CANCEL_WINDOW_MS;
    if (isOld && order.status === 'cancelled' && order.payment_method === 'bank_transfer') {
        return { label: 'Platba nevybavená', color: '#64748b', bg: '#f1f5f9', dot: '#94a3b8' };
    }
    return STATUS_CFG[order.status] ?? { label: order.status, color: '#64748b', bg: '#f1f5f9', dot: '#94a3b8' };
}

const SHIP_LABELS: Record<string, string> = {
    courier: 'DPD Kuriér',
    pickup: 'Osobný odber',
};
const PAY_LABELS: Record<string, string> = {
    bank_transfer: 'Bankový prevod',
    card: 'Karta',
};

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' });

// ── gradient button ──────────────────────────────────────────

function GBtn({
    children, onClick, outline, sm, icon,
}: {
    children: React.ReactNode; onClick?: () => void; outline?: boolean; sm?: boolean; icon?: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex items-center gap-1.5 rounded-full font-semibold transition-all cursor-pointer
                ${sm ? 'px-3.5 py-1.5 text-xs' : 'px-4 py-2 text-sm'}
                ${outline
                    ? 'border border-cyan-500 text-cyan-600 bg-transparent hover:bg-cyan-50'
                    : 'text-white shadow-[0_4px_14px_rgba(6,182,212,0.22)] hover:shadow-[0_6px_20px_rgba(6,182,212,0.35)]'
                }`}
            style={outline ? undefined : { background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)' }}
        >
            {icon}{children}
        </button>
    );
}

// ── invoice modal ────────────────────────────────────────────

interface InvoiceModalProps {
    order: Order;
    onClose: () => void;
}

function InvoiceModal({ order, onClose }: InvoiceModalProps) {
    const subtotal = order.items.reduce((s, it) => s + parseFloat(it.subtotal), 0);
    const shippingCost = parseFloat(order.shipping_cost || '0');
    const invoiceNo = `FAK-${order.order_number}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <div className="fixed inset-0 bg-slate-950/70" onClick={onClose} />
            <div id="invoice-print-area" className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Invoice content */}
                <div className="p-10 pb-6">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-10">
                        <div>
                            <div className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-500 to-emerald-500 bg-clip-text text-transparent mb-1">
                                DAS e-shop
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                Hlavná 15, 811 01 Bratislava<br />
                                IČO: 12345678 | DIČ: 2023456789<br />
                                das@eshop.sk | +421 900 000 000
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Faktúra</div>
                            <div className="text-2xl font-extrabold text-slate-900">{invoiceNo}</div>
                            <div className="text-xs text-slate-400 mt-1">{formatDate(order.created_at)}</div>
                        </div>
                    </div>

                    {/* Billing info */}
                    <div className="flex gap-10 mb-9">
                        <div className="flex-1">
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Odberateľ</div>
                            <p className="text-sm font-semibold text-slate-900 mb-0.5">{order.customer_name}</p>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                {order.is_company && order.company_name && <>{order.company_name}<br /></>}
                                {order.street}<br />
                                {order.postal_code} {order.city}<br />
                                {order.country}
                                {order.ico && <><br />IČO: {order.ico}</>}
                                {order.dic && <><br />DIČ: {order.dic}</>}
                            </p>
                        </div>
                        <div className="flex-1">
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Platba</div>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Číslo objednávky: <strong className="text-slate-900">{order.order_number}</strong><br />
                                Dátum: <strong className="text-slate-900">{formatDate(order.created_at)}</strong><br />
                                Spôsob: {PAY_LABELS[order.payment_method] ?? order.payment_method}
                            </p>
                        </div>
                    </div>

                    {/* Items table */}
                    <table className="w-full text-sm mb-6 border-collapse">
                        <thead>
                            <tr className="border-b-2 border-slate-200">
                                {['Položka', 'Množstvo', 'Jednotková cena', 'Spolu'].map((h, i) => (
                                    <th key={h} className={`pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wide ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {order.items.map(it => (
                                <tr key={it.id} className="border-b border-slate-100">
                                    <td className="py-3">
                                        <div className="font-medium text-slate-900">{it.product_name}</div>
                                    </td>
                                    <td className="py-3 text-right text-slate-500">{it.quantity}×</td>
                                    <td className="py-3 text-right text-slate-500">{parseFloat(it.price_snapshot).toFixed(2)} €</td>
                                    <td className="py-3 text-right font-semibold text-slate-900">{parseFloat(it.subtotal).toFixed(2)} €</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Totals */}
                    <div className="flex justify-end">
                        <div className="w-64 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Medziúčet</span>
                                <span className="text-slate-800">{subtotal.toFixed(2)} €</span>
                            </div>
                            <div className="flex justify-between text-sm pb-3 border-b border-slate-200">
                                <span className="text-slate-500">Doprava ({SHIP_LABELS[order.shipping_method] ?? order.shipping_method})</span>
                                <span className={shippingCost === 0 ? 'text-emerald-600' : 'text-slate-800'}>
                                    {shippingCost === 0 ? 'Zadarmo' : `${shippingCost.toFixed(2)} €`}
                                </span>
                            </div>
                            <div className="flex justify-between items-center pt-1">
                                <span className="font-bold text-slate-900">Celkom</span>
                                <span className="text-2xl font-extrabold bg-gradient-to-r from-cyan-500 to-emerald-500 bg-clip-text text-transparent">
                                    {parseFloat(order.total_price).toFixed(2)} €
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Footer note */}
                    <div className="mt-10 pt-5 border-t border-slate-100 text-center text-xs text-slate-400 leading-relaxed">
                        Faktúra bola vystavená elektronicky a je platná bez podpisu. Ďakujeme za váš nákup.
                    </div>
                </div>

                {/* Actions */}
                <div className="px-10 py-5 border-t border-slate-100 flex justify-end gap-3">
                    <GBtn outline onClick={onClose}>Zavrieť</GBtn>
                    <GBtn
                        onClick={() => window.print()}
                        icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>}
                    >Exportovať PDF</GBtn>
                </div>
            </div>
        </div>
    );
}

// ── order row ────────────────────────────────────────────────

function OrderRow({ order, onViewInvoice }: { order: Order; onViewInvoice: (o: Order) => void }) {
    const [open, setOpen] = useState(false);
    const sc = getStatusCfg(order);

    return (
        <div
            className="rounded-2xl overflow-hidden transition-all"
            style={{
                border: `1px solid ${open ? '#0891b2' : '#e2e8f0'}`,
                boxShadow: open ? '0 0 0 3px rgba(8,145,178,0.08), 0 1px 4px rgba(0,0,0,0.04)' : '0 1px 4px rgba(0,0,0,0.04)',
                marginBottom: 12,
            }}
        >
            {/* Row header */}
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 sm:py-4 transition-colors text-left"
                style={{ background: open ? '#e0f7fa' : '#ffffff' }}
            >
                <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 transition-transform"
                    style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
                >
                    <polyline points="9 18 15 12 9 6"/>
                </svg>

                <div className="flex-1 min-w-0 sm:w-40 sm:flex-none">
                    <div className="text-sm font-bold text-slate-900 truncate">{order.order_number}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{formatDate(order.created_at)}</div>
                </div>

                <div className="hidden sm:block flex-1 text-sm text-slate-500 truncate">
                    {order.items.slice(0, 2).map(it => it.product_name).join(', ')}
                    {order.items.length > 2 ? ` +${order.items.length - 2} ďalšie` : ''}
                </div>

                <span
                    className="text-xs font-semibold rounded-full px-2.5 sm:px-3 py-1 flex-shrink-0 flex items-center gap-1.5"
                    style={{ color: sc.color, background: sc.bg }}
                >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />
                    <span className="hidden xs:inline">{sc.label}</span>
                </span>

                <div className="text-sm font-bold text-slate-900 flex-shrink-0 text-right">
                    {parseFloat(order.total_price).toFixed(2)} €
                </div>
            </button>

            {/* Expanded detail */}
            {open && (
                <div className="border-t border-slate-100 bg-white">
                    <div className="px-5 py-4 pl-12">
                        {/* Items list */}
                        <div className="mb-4">
                            {order.items.map((it, i) => (
                                <div
                                    key={it.id}
                                    className="flex items-center gap-3 py-2.5"
                                    style={{ borderBottom: i < order.items.length - 1 ? '1px solid #f1f5f9' : 'none' }}
                                >
                                    <div className="w-9 h-9 rounded-lg flex-shrink-0" style={{ background: 'linear-gradient(135deg, #cffafe, #d1fae5)' }} />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold text-slate-900">{it.product_name}</div>
                                    </div>
                                    <div className="text-xs text-slate-400">{it.quantity}×</div>
                                    <div className="text-sm font-medium text-slate-800 min-w-14 text-right">
                                        {parseFloat(it.subtotal).toFixed(2)} €
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Footer row */}
                        <div className="flex items-center justify-between">
                            <div className="text-xs text-slate-400">
                                Doprava: <span className="text-slate-600 font-medium">{SHIP_LABELS[order.shipping_method] ?? order.shipping_method}</span>
                                {order.notes && <> · Poznámka: <span className="italic">{order.notes}</span></>}
                            </div>
                            <div className="flex items-center gap-2">
                                <GBtn sm outline icon={
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                } onClick={() => onViewInvoice(order)}>Faktúra</GBtn>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── filter tabs ──────────────────────────────────────────────

type FilterTab = 'all' | 'delivered' | 'in_progress';

function filterOrders(orders: Order[], tab: FilterTab): Order[] {
    if (tab === 'delivered') return orders.filter(o => o.status === 'paid' || o.status === 'shipped');
    if (tab === 'in_progress') return orders.filter(o => o.status === 'new' || o.status === 'awaiting_payment');
    return orders;
}

// ── main page ────────────────────────────────────────────────

export default function OrdersPage() {
    const navigate = useNavigate();
    const isUserAdmin = isAdmin();
    useEffect(() => {
        if (isUserAdmin) navigate('/admin', { replace: true });
    }, [navigate, isUserAdmin]);

    const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
    const [filterTab, setFilterTab] = useState<FilterTab>('all');

    const { data: myOrders, isLoading, isError } = useQuery({
        queryKey: ['my-orders'],
        queryFn: getMyOrders,
        enabled: !isUserAdmin,
    });

    const filteredOrders = filterOrders(myOrders ?? [], filterTab);
    const deliveredCount = (myOrders ?? []).filter(o => o.status === 'paid' || o.status === 'shipped').length;

    return (
        <>
            {/* Print styles for invoice */}
            <style>{`
                @media print {
                    body > * { display: none !important; }
                    #invoice-print-area { display: block !important; position: fixed; inset: 0; background: #fff; padding: 48px; z-index: 9999; }
                }
            `}</style>

            {invoiceOrder && (
                <InvoiceModal order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />
            )}

            <div className="min-h-screen bg-slate-50 py-8">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Breadcrumb */}
                    <nav className="hidden md:flex items-center gap-2 mb-6 text-xs text-slate-400">
                        <Link to="/products" className="hover:text-slate-600 transition-colors">Domov</Link>
                        <svg width="5" height="8" viewBox="0 0 6 10"><path d="M1 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
                        <span className="text-slate-700 font-medium">Moje objednávky</span>
                    </nav>

                    {/* Mobile nav tabs */}
                    <div className="md:hidden mb-5 flex gap-1 bg-white rounded-2xl border border-slate-200 p-1 shadow-sm">
                        <Link to="/profile" className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium text-slate-500">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            Profil
                        </Link>
                        <Link to="/orders" className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #06b6d4, #10b981)' }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
                            Objednávky
                        </Link>
                    </div>

                    <div className="flex gap-6 items-start">
                        <ProfileSidebar active="orders" />

                        <div className="flex-1 min-w-0">
                            {isLoading ? (
                                <div className="text-center py-12 text-slate-400 text-sm">Načítavam objednávky...</div>
                            ) : isError ? (
                                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-red-500 text-sm shadow-sm">
                                    Nepodarilo sa načítať objednávky. Skúste to znova neskôr.
                                </div>
                            ) : !myOrders || myOrders.length === 0 ? (
                                <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center shadow-sm">
                                    <svg className="mx-auto h-12 w-12 text-slate-200 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    <p className="text-sm text-slate-500">Zatiaľ nemáte žiadne objednávky.</p>
                                </div>
                            ) : (
                                <>
                                    {/* Stats row */}
                                    <div className="flex gap-4 mb-5">
                                        {[
                                            { label: 'Celkové objednávky', value: myOrders.length, color: '#0891b2' },
                                            { label: 'Doručené', value: deliveredCount, color: '#10b981' },
                                        ].map(stat => (
                                            <div key={stat.label} className="flex-1 bg-white rounded-2xl border border-slate-200 px-5 py-4 shadow-sm">
                                                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{stat.label}</div>
                                                <div className="text-2xl font-extrabold" style={{ color: stat.color }}>{stat.value}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Orders card */}
                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-sm font-bold text-slate-900">Moje objednávky</h3>
                                                <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">Kliknite na objednávku pre zobrazenie detailov</p>
                                            </div>
                                            {/* Filter tabs */}
                                            <div className="flex gap-1 bg-slate-50 rounded-xl p-1 self-start sm:self-auto">
                                                {([
                                                    { id: 'all', label: 'Všetky' },
                                                    { id: 'delivered', label: 'Doručené' },
                                                    { id: 'in_progress', label: 'V procese' },
                                                ] as const).map(tab => (
                                                    <button
                                                        key={tab.id}
                                                        type="button"
                                                        onClick={() => setFilterTab(tab.id)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer
                                                            ${filterTab === tab.id
                                                                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                                                                : 'text-slate-400 hover:text-slate-600'
                                                            }`}
                                                    >
                                                        {tab.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            {filteredOrders.length === 0 ? (
                                                <p className="text-center text-sm text-slate-400 py-8">Žiadne objednávky v tejto kategórii.</p>
                                            ) : (
                                                filteredOrders.map(order => (
                                                    <OrderRow key={order.id} order={order} onViewInvoice={setInvoiceOrder} />
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
