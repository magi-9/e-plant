import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProducts, getAdminCategories } from '../api/products';
import { issueStock, receiveStock } from '../api/orders';
import type { Product, ProductListParams } from '../api/products';
import { ArchiveBoxArrowDownIcon, ArchiveBoxXMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import AdminNav from '../components/AdminNav';
import { useAdminPageGuard } from '../hooks/useAdminPageGuard';

const PAGE_SIZE = 50;

export default function AdminInventory() {
    const canAccess = useAdminPageGuard();

    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [stockFilter, setStockFilter] = useState<'all' | 'in' | 'out'>('all');
    const [currentPage, setCurrentPage] = useState(0);

    const [receiptProduct, setReceiptProduct] = useState<Product | null>(null);
    const [receiptForm, setReceiptForm] = useState({ batch_number: '', quantity: 1, notes: '', variant_reference: '' });
    const [issueProduct, setIssueProduct] = useState<Product | null>(null);
    const [issueForm, setIssueForm] = useState({ quantity: 1, notes: '', variant_reference: '' });

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 250);
        return () => clearTimeout(t);
    }, [searchTerm]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCurrentPage(0);
    }, [debouncedSearch, categoryFilter, stockFilter]);

    const queryParams = useMemo<ProductListParams>(() => ({
        search: debouncedSearch || undefined,
        ordering: 'name' as const,
        limit: PAGE_SIZE,
        offset: currentPage * PAGE_SIZE,
        admin_view: '1' as const,
        ...(categoryFilter !== 'all' ? { categories: [categoryFilter] } : {}),
        ...(stockFilter !== 'all' ? { stock: stockFilter as 'in' | 'out' } : {}),
    }), [debouncedSearch, currentPage, categoryFilter, stockFilter]);

    const { data: paginatedData, isLoading, isFetching } = useQuery({
        queryKey: ['inventory-products', queryParams],
        queryFn: () => getProducts(queryParams),
    });

    const { data: adminCategories = [] } = useQuery({
        queryKey: ['admin-categories'],
        queryFn: getAdminCategories,
        staleTime: 5 * 60 * 1000,
    });

    const products = paginatedData?.results ?? [];
    const totalCount = paginatedData?.count ?? 0;
    const totalPages = totalCount > 0 ? Math.ceil(totalCount / PAGE_SIZE) : 0;
    const displayPage = currentPage + 1;

    const receiveStockMutation = useMutation({
        mutationFn: receiveStock,
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['inventory-products'], exact: false });
            queryClient.invalidateQueries({ queryKey: ['products-admin'], exact: false });
            toast.success(result.message);
            setReceiptProduct(null);
            setReceiptForm({ batch_number: '', quantity: 1, notes: '', variant_reference: '' });
        },
        onError: () => toast.error('Chyba pri naskladňovaní.'),
    });

    const issueStockMutation = useMutation({
        mutationFn: issueStock,
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['inventory-products'], exact: false });
            queryClient.invalidateQueries({ queryKey: ['products-admin'], exact: false });
            toast.success(result.message);
            setIssueProduct(null);
            setIssueForm({ quantity: 1, notes: '', variant_reference: '' });
        },
        onError: () => toast.error('Chyba pri vyskladnení.'),
    });

    const openReceipt = (product: Product) => {
        setReceiptProduct(product);
        setReceiptForm({ batch_number: '', quantity: 1, notes: '', variant_reference: '' });
    };

    const openIssue = (product: Product) => {
        setIssueProduct(product);
        setIssueForm({ quantity: 1, notes: '', variant_reference: '' });
    };

    const stockLabel = (qty: number) =>
        qty > 0
            ? { text: `${qty} ks`, cls: 'bg-emerald-100 text-emerald-800' }
            : { text: '0 ks', cls: 'bg-red-100 text-red-800' };

    if (!canAccess) return null;

    return (
        <div className="min-h-screen bg-slate-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <AdminNav />

                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-slate-900">Naskladňovanie</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Vyhľadajte produkt a naskladnite novú šaržu. Každé naskladnenie sa zaznamenáva ako audit záznam.
                    </p>
                </div>

                {/* Filters */}
                <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="sm:col-span-2">
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Vyhľadávanie</label>
                            <input
                                type="search"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Názov, ref. číslo..."
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Kategória</label>
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                            >
                                <option value="all">Všetky</option>
                                {adminCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Stav skladu</label>
                            <select
                                value={stockFilter}
                                onChange={(e) => setStockFilter(e.target.value as 'all' | 'in' | 'out')}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                            >
                                <option value="all">Všetko</option>
                                <option value="in">Skladom</option>
                                <option value="out">Vypredané</option>
                            </select>
                        </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                        <span>
                            Celkovo <span className="font-semibold text-slate-900">{totalCount}</span> produktov
                            {isFetching && <span className="ml-2 text-xs text-cyan-600">Aktualizujem...</span>}
                        </span>
                        <button
                            onClick={() => { setSearchTerm(''); setCategoryFilter('all'); setStockFilter('all'); }}
                            className="text-xs text-slate-500 hover:text-slate-800 underline-offset-2 hover:underline"
                        >
                            Reset filtrov
                        </button>
                    </div>
                </div>

                {/* Table */}
                {isLoading && !paginatedData ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 animate-pulse">
                        Načítavam produkty...
                    </div>
                ) : (
                    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Produkt</th>
                                    <th className="hidden sm:table-cell px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Ref. číslo</th>
                                    <th className="hidden md:table-cell px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Kategória</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Sklad</th>
                                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Akcia</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {products.map((product) => {
                                    const stock = stockLabel(product.stock_quantity);
                                    return (
                                        <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-5 py-3">
                                                <div className="font-semibold text-sm text-slate-800">{product.name}</div>
                                            </td>
                                            <td className="hidden sm:table-cell px-5 py-3">
                                                <span className="text-xs font-mono text-slate-500 select-all">{product.reference || '—'}</span>
                                            </td>
                                            <td className="hidden md:table-cell px-5 py-3 text-sm text-slate-600 max-w-xs">
                                                <span className="truncate block">{product.category || '—'}</span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className={`px-2 py-0.5 inline-flex text-xs font-semibold rounded-full ${stock.cls}`}>
                                                    {stock.text}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <div className="inline-flex items-center gap-2">
                                                    <button
                                                        onClick={() => openIssue(product)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors"
                                                    >
                                                        <ArchiveBoxXMarkIcon className="h-4 w-4" />
                                                        Vyskladniť
                                                    </button>
                                                    <button
                                                        onClick={() => openReceipt(product)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                                                    >
                                                        <ArchiveBoxArrowDownIcon className="h-4 w-4" />
                                                        Naskladniť
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {products.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-400">
                                            Nenašli sa žiadne produkty.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
                                <span className="text-sm text-slate-500">
                                    Strana <span className="font-semibold">{displayPage}</span> z <span className="font-semibold">{totalPages}</span>
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                                        disabled={currentPage === 0 || isFetching}
                                        className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                                    >
                                        ← Predchádzajúca
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                                        disabled={currentPage >= totalPages - 1 || isFetching}
                                        className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                                    >
                                        Ďalšia →
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Stock receipt dialog ── */}
            {receiptProduct && (
                <div className="fixed inset-0 z-30 flex items-center justify-center px-4">
                    <div className="fixed inset-0 bg-black/40" onClick={() => setReceiptProduct(null)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                const isWildcard = receiptProduct.parameters?.type === 'wildcard_group';
                                if (isWildcard && !receiptForm.variant_reference) {
                                    toast.error('Vyberte variant produktu.');
                                    return;
                                }
                                receiveStockMutation.mutate({
                                    product_id: receiptProduct.id,
                                    batch_number: receiptForm.batch_number,
                                    quantity: receiptForm.quantity,
                                    notes: receiptForm.notes,
                                    ...(receiptForm.variant_reference ? { variant_reference: receiptForm.variant_reference } : {}),
                                });
                            }}
                        >
                            <div className="px-6 py-5 border-b border-slate-200">
                                <h3 className="text-lg font-bold text-slate-900">Naskladniť tovar</h3>
                                <p className="text-sm text-slate-600 mt-1 font-medium">{receiptProduct.name}</p>
                            </div>

                            <div className="px-6 py-5 space-y-4">
                                {receiptProduct.parameters?.type === 'wildcard_group' && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Variant (ref. číslo)</label>
                                        <select
                                            required
                                            value={receiptForm.variant_reference}
                                            onChange={(e) => setReceiptForm({ ...receiptForm, variant_reference: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                                        >
                                            <option value="">— Vyberte variant —</option>
                                            {(receiptProduct.parameters.options ?? []).map((opt) => (
                                                <option key={opt.reference} value={opt.reference}>
                                                    {opt.reference}{opt.label ? ` · ${opt.label}` : ''} (teraz: {opt.stock_quantity ?? 0} ks)
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Číslo šarže *</label>
                                    <input
                                        type="text"
                                        required
                                        value={receiptForm.batch_number}
                                        onChange={(e) => setReceiptForm({ ...receiptForm, batch_number: e.target.value })}
                                        placeholder="napr. LOT-2026-001"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Počet kusov *</label>
                                    <input
                                        type="number"
                                        required
                                        min={1}
                                        value={receiptForm.quantity}
                                        onChange={(e) => setReceiptForm({ ...receiptForm, quantity: parseInt(e.target.value) || 1 })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Poznámka (nepovinné)</label>
                                    <textarea
                                        value={receiptForm.notes}
                                        onChange={(e) => setReceiptForm({ ...receiptForm, notes: e.target.value })}
                                        rows={2}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>

                            <div className="px-6 py-4 bg-slate-50 rounded-b-2xl flex justify-end gap-3 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setReceiptProduct(null)}
                                    className="px-4 py-2 text-sm border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100"
                                >
                                    Zrušiť
                                </button>
                                <button
                                    type="submit"
                                    disabled={receiveStockMutation.isPending}
                                    className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-60"
                                >
                                    {receiveStockMutation.isPending ? 'Ukladám...' : 'Naskladniť'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Stock issue dialog ── */}
            {issueProduct && (
                <div className="fixed inset-0 z-30 flex items-center justify-center px-4">
                    <div className="fixed inset-0 bg-black/40" onClick={() => setIssueProduct(null)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                const isWildcard = issueProduct.parameters?.type === 'wildcard_group';
                                if (isWildcard && !issueForm.variant_reference) {
                                    toast.error('Vyberte variant produktu.');
                                    return;
                                }
                                issueStockMutation.mutate({
                                    product_id: issueProduct.id,
                                    quantity: issueForm.quantity,
                                    notes: issueForm.notes,
                                    ...(issueForm.variant_reference ? { variant_reference: issueForm.variant_reference } : {}),
                                });
                            }}
                        >
                            <div className="px-6 py-5 border-b border-slate-200">
                                <h3 className="text-lg font-bold text-slate-900">Vyskladniť tovar</h3>
                                <p className="text-sm text-slate-600 mt-1 font-medium">{issueProduct.name}</p>
                            </div>

                            <div className="px-6 py-5 space-y-4">
                                {issueProduct.parameters?.type === 'wildcard_group' && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Variant (ref. číslo)</label>
                                        <select
                                            required
                                            value={issueForm.variant_reference}
                                            onChange={(e) => setIssueForm({ ...issueForm, variant_reference: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500"
                                        >
                                            <option value="">— Vyberte variant —</option>
                                            {(issueProduct.parameters.options ?? []).map((opt) => (
                                                <option key={opt.reference} value={opt.reference}>
                                                    {opt.reference}{opt.label ? ` · ${opt.label}` : ''} (teraz: {opt.stock_quantity ?? 0} ks)
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Počet kusov *</label>
                                    <input
                                        type="number"
                                        required
                                        min={1}
                                        value={issueForm.quantity}
                                        onChange={(e) => setIssueForm({ ...issueForm, quantity: parseInt(e.target.value) || 1 })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Poznámka (nepovinné)</label>
                                    <textarea
                                        value={issueForm.notes}
                                        onChange={(e) => setIssueForm({ ...issueForm, notes: e.target.value })}
                                        rows={2}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500"
                                    />
                                </div>
                            </div>

                            <div className="px-6 py-4 bg-slate-50 rounded-b-2xl flex justify-end gap-3 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setIssueProduct(null)}
                                    className="px-4 py-2 text-sm border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100"
                                >
                                    Zrušiť
                                </button>
                                <button
                                    type="submit"
                                    disabled={issueStockMutation.isPending}
                                    className="px-4 py-2 text-sm bg-rose-600 text-white rounded-lg font-medium hover:bg-rose-700 disabled:opacity-60"
                                >
                                    {issueStockMutation.isPending ? 'Ukladám...' : 'Vyskladniť'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
