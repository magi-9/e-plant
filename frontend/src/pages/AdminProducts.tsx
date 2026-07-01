import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProducts, createProduct, updateProduct, deleteProduct, importProductsCsv, bulkDeleteProducts, bulkSetVisibleProducts, getAdminProductIds, getAdminCategories } from '../api/products';
import { receiveStock } from '../api/orders';
import { PencilIcon, TrashIcon, PlusIcon, ArrowUpTrayIcon, ArchiveBoxArrowDownIcon } from '@heroicons/react/24/outline';
import type { Product, ProductListParams } from '../api/products';
import toast from 'react-hot-toast';
import AdminNav from '../components/AdminNav';
import ConfirmModal from '../components/ConfirmModal';
import { useAdminPageGuard } from '../hooks/useAdminPageGuard';
import AdminEditModal, { type EditSavePayload } from '../components/admin/AdminEditModal';
import DropdownSelect from '../components/DropdownSelect';
import { sortByFirstOptionTokenValue } from '../utils/variantOptions';

const PAGE_SIZE = 50;

const C = {
    grad: 'linear-gradient(135deg, #2196f3, #3b82f6)',
    card: { background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 3px rgba(15,23,42,0.06)' } as React.CSSProperties,
    input: { width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 13, border: '1px solid #e2e8f0', color: '#0f172a', outline: 'none', boxSizing: 'border-box' } as React.CSSProperties,
};

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label style={{ display: 'block', marginBottom: 5, fontSize: 12, fontWeight: 600, color: '#374151' }}>{label}</label>
            {children}
        </div>
    );
}

function StyledInput({ style, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
    return <input {...props} style={{ ...C.input, ...style }} />;
}

function StyledTextarea({ style, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return <textarea {...props} style={{ ...C.input, resize: 'vertical' as const, ...style }} />;
}

const getCategoryList = (product: Product): string[] => {
    const raw = product.all_categories || product.parameters?.all_categories || product.category || '';
    return raw
        .split(';')
        .map((value: string) => value.trim())
        .filter(Boolean);
};

export default function AdminProducts() {
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const [receiptProduct, setReceiptProduct] = useState<Product | null>(null);
    const [receiptForm, setReceiptForm] = useState({ batch_number: '', quantity: 1, notes: '', variant_reference: '' });

    const [isUploadingCSV, setIsUploadingCSV] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [sortBy, setSortBy] = useState('-name');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [visibleFilter, setVisibleFilter] = useState<'all' | 'visible' | 'hidden'>('visible');
    const [stockFilter, setStockFilter] = useState<'all' | 'in' | 'out'>('all');
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [confirmDelete, setConfirmDelete] = useState<{ mode: 'single'; product: Product } | { mode: 'bulk'; count: number } | null>(null);

    useEffect(() => {
        const timeout = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 250);
        return () => clearTimeout(timeout);
    }, [searchTerm]);

    useEffect(() => {
        setCurrentPage(0);
        setSelectedIds(new Set());
    }, [debouncedSearch, sortBy, categoryFilter, visibleFilter, stockFilter]);

    const invalidateProductQueries = () => {
        queryClient.invalidateQueries({ queryKey: ['products'], exact: false });
        queryClient.invalidateQueries({ queryKey: ['products-admin'], exact: false });
        queryClient.invalidateQueries({ queryKey: ['products-count'], exact: false });
        queryClient.invalidateQueries({ queryKey: ['category-counts'], exact: false });
        queryClient.invalidateQueries({ queryKey: ['compatibility-counts'], exact: false });
        queryClient.invalidateQueries({ queryKey: ['products-categories'], exact: false });
    };

    const adminQueryParams = useMemo<ProductListParams>(() => ({
        search: debouncedSearch,
        ordering: sortBy,
        limit: PAGE_SIZE,
        offset: currentPage * PAGE_SIZE,
        admin_view: '1' as const,
        ...(categoryFilter !== 'all' ? { categories: [categoryFilter] } : {}),
        ...(visibleFilter === 'visible' ? { is_visible: true } : visibleFilter === 'hidden' ? { is_visible: false } : {}),
        ...(stockFilter !== 'all' ? { stock: stockFilter as 'in' | 'out' } : {}),
    }), [debouncedSearch, sortBy, currentPage, categoryFilter, visibleFilter, stockFilter]);

    const { data: paginatedData, isLoading, isFetching } = useQuery({
        queryKey: ['products-admin', adminQueryParams],
        queryFn: () => getProducts(adminQueryParams),
    });

    const { data: adminCategories } = useQuery({
        queryKey: ['admin-categories'],
        queryFn: getAdminCategories,
        staleTime: 5 * 60 * 1000,
    });

    const products = useMemo(() => paginatedData?.results || [], [paginatedData]);
    const totalCount = paginatedData?.count || 0;

    const categories = useMemo(() => adminCategories || [], [adminCategories]);

    const allCompat = useMemo(() => {
        const seen = new Set<string>();
        products.forEach(p => {
            const cs = (p.parameters as Record<string, unknown> & { compat_systems?: string[] } | undefined)?.compat_systems;
            if (Array.isArray(cs)) cs.forEach(c => seen.add(c));
        });
        return Array.from(seen).sort();
    }, [products]);

    const allRefs = useMemo(() =>
        products.map(p => p.reference).filter(Boolean) as string[],
        [products]);


    const displayedCount = products.length;

    const receiveStockMutation = useMutation({
        mutationFn: receiveStock,
        onSuccess: (result) => {
            invalidateProductQueries();
            toast.success(result.message);
            setReceiptProduct(null);
            setReceiptForm({ batch_number: '', quantity: 1, notes: '', variant_reference: '' });
        },
        onError: () => toast.error('Chyba pri naskladňovaní.'),
    });

    const mutationOptions = {
        onSuccess: () => {
            invalidateProductQueries();
            setIsModalOpen(false);
        }
    };

    const createMutation = useMutation({ mutationFn: createProduct, ...mutationOptions });
    const updateMutation = useMutation({ mutationFn: ({ id, data }: { id: number, data: FormData }) => updateProduct(id, data), ...mutationOptions });
    const deleteMutation = useMutation({ mutationFn: deleteProduct, onSuccess: mutationOptions.onSuccess });

    const bulkDeleteMutation = useMutation({
        mutationFn: (ids: number[]) => bulkDeleteProducts(ids),
        onSuccess: (res) => {
            invalidateProductQueries();
            setSelectedIds(new Set());
            toast.success(`Odstránených ${res.deleted} produktov.`);
        },
        onError: () => toast.error('Chyba pri hromadnom odstraňovaní.'),
    });

    const bulkSetVisibleMutation = useMutation({
        mutationFn: ({ ids, is_visible }: { ids: number[]; is_visible: boolean }) =>
            bulkSetVisibleProducts(ids, is_visible),
        onSuccess: (res, { is_visible }) => {
            invalidateProductQueries();
            setSelectedIds(new Set());
            toast.success(`${is_visible ? 'Zobrazených' : 'Skrytých'} ${res.updated} produktov.`);
        },
        onError: () => toast.error('Chyba pri zmene viditeľnosti.'),
    });

    const selectAllMutation = useMutation({
        mutationFn: () => getAdminProductIds({
            search: debouncedSearch,
            ordering: sortBy,
            admin_view: '1',
            ...(categoryFilter !== 'all' ? { categories: [categoryFilter] } : {}),
            ...(visibleFilter === 'visible' ? { is_visible: true } : visibleFilter === 'hidden' ? { is_visible: false } : {}),
            ...(stockFilter !== 'all' ? { stock: stockFilter as 'in' | 'out' } : {}),
        }),
        onSuccess: (ids) => setSelectedIds(new Set(ids)),
        onError: () => toast.error('Chyba pri výbere všetkých produktov.'),
    });

    const totalPages = totalCount > 0 ? Math.ceil(totalCount / PAGE_SIZE) : 0;

    useEffect(() => {
        if (totalPages > 0 && currentPage >= totalPages) {
            setCurrentPage(totalPages - 1);
        }
    }, [totalPages, currentPage]);

    const goToPreviousPage = () => setCurrentPage((p) => Math.max(0, p - 1));
    const goToNextPage = () => setCurrentPage((p) => Math.min(totalPages - 1, p + 1));

    const displayPage = currentPage + 1;
    const canGoPrevious = currentPage > 0;
    const canGoNext = currentPage < totalPages - 1;

    const someSelected = selectedIds.size > 0;
    const allPagesSelected = someSelected && selectedIds.size === totalCount;

    const toggleSelectAll = () => {
        if (someSelected) {
            setSelectedIds(new Set());
        } else {
            selectAllMutation.mutate();
        }
    };

    const toggleSelect = (id: number) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const handleBulkDelete = () => {
        setConfirmDelete({ mode: 'bulk', count: selectedIds.size });
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setEditingProduct(null);
        setIsModalOpen(true);
    };

    const handleSave = (payload: EditSavePayload) => {
        const parameters = {
            ...(editingProduct?.parameters || {}),
            all_categories: payload.cats.join('; '),
            compat_systems: payload.compat,
            details: payload.details,
            variant: payload.variant,
        };

        const fd = new FormData();
        fd.append('name', payload.name);
        fd.append('description', payload.description);
        fd.append('category', payload.cats[0] || '');
        fd.append('price', payload.price);
        fd.append('vat_rate', payload.vatRate);
        fd.append('is_visible', payload.visible.toString());
        fd.append('reference', payload.ref);
        if (payload.imageFile) {
            fd.append('image', payload.imageFile);
        } else if (payload.removeImage) {
            fd.append('remove_image', 'true');
        }
        fd.append('parameters', JSON.stringify(parameters));

        if (editingProduct) {
            updateMutation.mutate({ id: editingProduct.id, data: fd }, {
                onSuccess: () => { toast.success('Produkt bol úspešne upravený!'); setIsModalOpen(false); },
                onError: () => toast.error('Chyba pri ukladaní produktu.'),
            });
        } else {
            createMutation.mutate(fd, {
                onSuccess: () => { toast.success('Nový produkt bol úspešne pridaný!'); setIsModalOpen(false); },
                onError: () => toast.error('Chyba pri vytváraní produktu.'),
            });
        }
    };

    const handleDelete = (product: Product) => {
        setConfirmDelete({ mode: 'single', product });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingCSV(true);
        toast.loading('Importujem CSV...', { id: 'csv-upload' });
        try {
            const res = await importProductsCsv(file);
            toast.success(res.message || 'Import úspešný', { id: 'csv-upload' });
            invalidateProductQueries();
        } catch (error: unknown) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const err = error as any;
            toast.error(err.response?.data?.error || 'Chyba importu CSV', { id: 'csv-upload' });
        } finally {
            setIsUploadingCSV(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const canAccess = useAdminPageGuard();
    if (!canAccess) return null;

    const thStyle: React.CSSProperties = {
        padding: '10px 14px', textAlign: 'left', fontSize: 11,
        fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b',
    };
    const filterLabel: React.CSSProperties = {
        display: 'block', marginBottom: 4, fontSize: 11, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b',
    };
    const filterSelect: React.CSSProperties = {
        width: '100%', padding: '7px 12px', borderRadius: 8, fontSize: 13,
        border: '1px solid #e2e8f0', color: '#0f172a',
    };
    const paginationBtn = (enabled: boolean): React.CSSProperties => ({
        padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
        border: '1px solid #e2e8f0', background: '#fff',
        color: enabled ? '#374151' : '#94a3b8',
        cursor: enabled ? 'pointer' : 'not-allowed',
    });

    return (
        <div className="min-h-screen" style={{ background: '#f6f8fb' }}>
            <AdminNav />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* ── Header ── */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
                    <div>
                        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', margin: 0 }}>
                            Produkty
                        </h1>
                        <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 13.5, color: '#64748b' }}>Celkom</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '1px 9px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: 'rgba(33,150,243,0.1)', color: '#2196f3' }}>
                                {totalCount}
                            </span>
                            {isFetching && <span style={{ fontSize: 12, color: '#2196f3' }}>· Aktualizujem...</span>}
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <input type="file" ref={fileInputRef} accept=".csv" className="hidden" onChange={handleFileUpload} />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploadingCSV}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                                border: '1px solid #e2e8f0', background: '#fff', color: '#374151',
                                cursor: isUploadingCSV ? 'not-allowed' : 'pointer',
                                opacity: isUploadingCSV ? 0.6 : 1,
                            }}
                        >
                            <ArrowUpTrayIcon style={{ width: 15, height: 15 }} />
                            {isUploadingCSV ? 'Importujem...' : 'Z CSV'}
                        </button>
                        <button
                            onClick={handleAdd}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                                border: 'none', background: C.grad, color: '#fff', cursor: 'pointer',
                            }}
                        >
                            <PlusIcon style={{ width: 15, height: 15 }} />
                            Nový produkt
                        </button>
                    </div>
                </div>

                {/* ── Filters ── */}
                <div style={{ ...C.card, padding: '16px 20px', marginBottom: 14 }}>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                        <div className="xl:col-span-2">
                            <label style={filterLabel}>Vyhľadávanie</label>
                            <input
                                type="search" value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Názov, ref. číslo, kategória..."
                                style={filterSelect}
                            />
                        </div>
                        <div>
                            <label style={filterLabel}>Triedenie</label>
                            <DropdownSelect
                                value={sortBy}
                                onChange={setSortBy}
                                placeholder="Triedenie"
                                neutralValues={['-name']}
                                options={[
                                    { value: '-name', label: 'Názov Z-A' },
                                    { value: 'name', label: 'Názov A-Z' },
                                    { value: '-price', label: 'Cena od najvyššej' },
                                    { value: 'price', label: 'Cena od najnižšej' },
                                    { value: '-stock_quantity', label: 'Sklad najviac' },
                                    { value: 'stock_quantity', label: 'Sklad najmenej' },
                                    { value: 'category', label: 'Kategória A-Z' },
                                ]}
                            />
                        </div>
                        <div>
                            <label style={filterLabel}>Kategória</label>
                            <DropdownSelect
                                value={categoryFilter}
                                onChange={setCategoryFilter}
                                placeholder="Všetky"
                                neutralValues={['all']}
                                options={categories.map((cat) => ({ value: cat, label: cat }))}
                            />
                        </div>
                        <div>
                            <label style={filterLabel}>Viditeľnosť</label>
                            <DropdownSelect
                                value={visibleFilter}
                                onChange={(value) => setVisibleFilter(value as 'all' | 'visible' | 'hidden')}
                                placeholder="Všetky"
                                neutralValues={['all']}
                                options={[
                                    { value: 'all', label: 'Všetky' },
                                    { value: 'visible', label: 'Viditeľné' },
                                    { value: 'hidden', label: 'Skryté' },
                                ]}
                            />
                        </div>
                    </div>
                    <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                            Zobrazené <strong style={{ color: '#0f172a' }}>{displayedCount}</strong> z <strong style={{ color: '#0f172a' }}>{totalCount}</strong>
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <label style={{ ...filterLabel, margin: 0 }}>Sklad</label>
                            <DropdownSelect
                                value={stockFilter}
                                onChange={(value) => setStockFilter(value as 'all' | 'in' | 'out')}
                                placeholder="Všetko"
                                neutralValues={['all']}
                                wrapperClassName="w-[11.5rem]"
                                options={[
                                    { value: 'all', label: 'Všetko' },
                                    { value: 'in', label: 'Len skladom' },
                                    { value: 'out', label: 'Len vypredané' },
                                ]}
                            />
                            <button type="button"
                                onClick={() => { setSearchTerm(''); setSortBy('-name'); setCategoryFilter('all'); setVisibleFilter('all'); setStockFilter('all'); }}
                                style={{ padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer' }}>
                                Reset
                            </button>
                        </div>
                    </div>
                    {totalPages > 1 && (
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                                Strana <strong style={{ color: '#0f172a' }}>{displayPage}</strong> z <strong style={{ color: '#0f172a' }}>{totalPages}</strong>
                            </p>
                            <div style={{ display: 'flex', gap: 6 }}>
                                <button onClick={goToPreviousPage} disabled={!canGoPrevious || isFetching} style={paginationBtn(canGoPrevious && !isFetching)}>← Predch.</button>
                                <button onClick={goToNextPage} disabled={!canGoNext || isFetching} style={paginationBtn(canGoNext && !isFetching)}>Ďalšia →</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Bulk bar ── */}
                {selectedIds.size > 0 && (
                    <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, background: '#0f172a', borderRadius: 10, padding: '10px 16px' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
                            Vybrané: {selectedIds.size}
                            {allPagesSelected && <span style={{ marginLeft: 6, fontWeight: 400, color: '#94a3b8' }}>(všetky)</span>}
                        </span>
                        <button onClick={() => bulkSetVisibleMutation.mutate({ ids: [...selectedIds], is_visible: true })} disabled={bulkSetVisibleMutation.isPending}
                            style={{ padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, background: '#10b981', color: '#fff', border: 'none', cursor: 'pointer', opacity: bulkSetVisibleMutation.isPending ? 0.5 : 1 }}>
                            Zobraziť
                        </button>
                        <button onClick={() => bulkSetVisibleMutation.mutate({ ids: [...selectedIds], is_visible: false })} disabled={bulkSetVisibleMutation.isPending}
                            style={{ padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, background: '#f59e0b', color: '#fff', border: 'none', cursor: 'pointer', opacity: bulkSetVisibleMutation.isPending ? 0.5 : 1 }}>
                            Skryť
                        </button>
                        <button onClick={handleBulkDelete} disabled={bulkDeleteMutation.isPending}
                            style={{ padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', opacity: bulkDeleteMutation.isPending ? 0.5 : 1 }}>
                            Odstrániť
                        </button>
                        <button onClick={() => setSelectedIds(new Set())}
                            style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}>
                            Zrušiť výber
                        </button>
                    </div>
                )}

                {/* ── Table ── */}
                {isLoading && !paginatedData ? (
                    <div style={{ ...C.card, padding: 48, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
                        Načítavam produkty...
                    </div>
                ) : (
                    <div style={{ ...C.card, overflow: 'hidden', opacity: isFetching ? 0.65 : 1, transition: 'opacity 0.15s' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <th style={{ ...thStyle, width: 44, paddingLeft: 16 }}>
                                            <input type="checkbox" checked={allPagesSelected}
                                                ref={(el) => { if (el) el.indeterminate = (someSelected && !allPagesSelected) || selectAllMutation.isPending; }}
                                                onChange={toggleSelectAll} disabled={selectAllMutation.isPending}
                                                title={`Vybrať všetkých ${totalCount} produktov`}
                                                style={{ width: 15, height: 15, cursor: selectAllMutation.isPending ? 'wait' : 'pointer' }}
                                            />
                                        </th>
                                        <th className="hidden sm:table-cell" style={{ ...thStyle, width: 52 }} />
                                        <th style={thStyle}>Produkt</th>
                                        <th style={thStyle}>Ref. číslo</th>
                                        <th className="hidden md:table-cell" style={thStyle}>Kategória</th>
                                        <th style={thStyle}>Cena bez DPH</th>
                                        <th style={thStyle}>DPH</th>
                                        <th style={thStyle}>Sklad</th>
                                        <th className="hidden lg:table-cell" style={thStyle}>Stav</th>
                                        <th style={{ ...thStyle, textAlign: 'right' }}><span className="sr-only">Akcie</span></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map((product, idx) => (
                                        <tr key={product.id}
                                            style={{
                                                borderBottom: idx < products.length - 1 ? '1px solid #f8fafc' : 'none',
                                                background: selectedIds.has(product.id) ? 'rgba(33,150,243,0.04)' : 'transparent',
                                                transition: 'background 0.1s',
                                            }}
                                            onMouseEnter={(e) => { if (!selectedIds.has(product.id)) (e.currentTarget as HTMLTableRowElement).style.background = '#f8fafc'; }}
                                            onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = selectedIds.has(product.id) ? 'rgba(33,150,243,0.04)' : 'transparent'; }}
                                        >
                                            <td style={{ padding: '11px 14px 11px 16px', width: 44 }}>
                                                <input type="checkbox" checked={selectedIds.has(product.id)} onChange={() => toggleSelect(product.id)}
                                                    style={{ width: 15, height: 15, cursor: 'pointer' }} />
                                            </td>
                                            <td className="hidden sm:table-cell" style={{ padding: '11px 8px', width: 52 }}>
                                                <div>
                                                    {product.image ? (
                                                        <img src={product.image} alt={product.name}
                                                            style={{ width: 38, height: 38, borderRadius: 8, objectFit: 'cover', border: '1px solid #e2e8f0', display: 'block' }} />
                                                    ) : (
                                                        <div style={{ width: 38, height: 38, borderRadius: 8, background: '#f1f5f9', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 16 }}>—</div>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ padding: '11px 14px', maxWidth: 260 }}>
                                                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a', lineHeight: 1.3 }}>{product.name}</div>
                                            </td>
                                            <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                                                <code style={{ fontSize: 11.5, fontFamily: "'JetBrains Mono', ui-monospace, monospace", color: '#475569', background: '#f1f5f9', padding: '2px 7px', borderRadius: 5 }}>
                                                    {product.reference || '—'}
                                                </code>
                                            </td>
                                            <td className="hidden md:table-cell" style={{ padding: '11px 14px', maxWidth: 200 }}>
                                                <span style={{ fontSize: 12.5, color: '#64748b', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}
                                                    title={getCategoryList(product).join(', ')}>
                                                    {getCategoryList(product).join(', ') || product.category}
                                                </span>
                                            </td>
                                            <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                                                <span style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a' }}>
                                                    {product.price ? `${product.price} €` : <span style={{ color: '#94a3b8' }}>—</span>}
                                                </span>
                                            </td>
                                            <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                                                <span style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a' }}>
                                                    {product.vat_rate} %
                                                </span>
                                            </td>
                                            <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', padding: '3px 9px',
                                                    borderRadius: 20, fontSize: 11.5, fontWeight: 600,
                                                    background: product.stock_quantity > 0 ? 'rgba(33,150,243,0.1)' : 'rgba(239,68,68,0.1)',
                                                    color: product.stock_quantity > 0 ? '#059669' : '#dc2626',
                                                }}>
                                                    {product.stock_quantity} ks
                                                </span>
                                            </td>
                                            <td className="hidden lg:table-cell" style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: 5,
                                                    padding: '3px 9px', borderRadius: 20, fontSize: 11.5, fontWeight: 600,
                                                    background: product.is_visible ? 'rgba(33,150,243,0.1)' : 'rgba(245,158,11,0.1)',
                                                    color: product.is_visible ? '#059669' : '#d97706',
                                                }}>
                                                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: product.is_visible ? '#10b981' : '#f59e0b', flexShrink: 0 }} />
                                                    {product.is_visible ? 'Viditeľný' : 'Skrytý'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '11px 16px 11px 14px', whiteSpace: 'nowrap' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                                                    <button onClick={() => { setReceiptProduct(product); setReceiptForm({ batch_number: '', quantity: 1, notes: '', variant_reference: '' }); }} title="Naskladniť"
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 5px', borderRadius: 6, color: '#10b981', lineHeight: 1 }}>
                                                        <ArchiveBoxArrowDownIcon style={{ width: 16, height: 16 }} />
                                                    </button>
                                                    <button onClick={() => handleEdit(product)} title="Upraviť"
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 5px', borderRadius: 6, color: '#2196f3', lineHeight: 1 }}>
                                                        <PencilIcon style={{ width: 16, height: 16 }} />
                                                    </button>
                                                    <button onClick={() => handleDelete(product)} title="Odstrániť"
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 5px', borderRadius: 6, color: '#ef4444', lineHeight: 1 }}>
                                                        <TrashIcon style={{ width: 16, height: 16 }} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {products.length === 0 && (
                                        <tr>
                                            <td colSpan={10} style={{ padding: '48px 24px', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
                                                Nenašli sa žiadne produkty pre zadané filtre.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── Bottom pagination ── */}
                {totalPages > 1 && !isLoading && (
                    <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <p style={{ fontSize: 13, color: '#64748b' }}>
                            Strana <strong style={{ color: '#0f172a' }}>{displayPage}</strong> z <strong style={{ color: '#0f172a' }}>{totalPages}</strong>
                            <span style={{ marginLeft: 8, color: '#94a3b8' }}>({totalCount} produktov)</span>
                        </p>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={goToPreviousPage} disabled={!canGoPrevious || isFetching} style={paginationBtn(canGoPrevious && !isFetching)}>← Predchádzajúca</button>
                            <button onClick={goToNextPage} disabled={!canGoNext || isFetching} style={paginationBtn(canGoNext && !isFetching)}>Ďalšia →</button>
                        </div>
                    </div>
                )}

                {/* ── Edit / Create modal ── */}
                {isModalOpen && (
                    <AdminEditModal
                        product={editingProduct}
                        onClose={() => setIsModalOpen(false)}
                        onSave={handleSave}
                        allCategories={categories}
                        allCompat={allCompat}
                        allRefs={allRefs.filter(r => r !== editingProduct?.reference)}
                        isPending={createMutation.isPending || updateMutation.isPending}
                    />
                )}
            </div>

            {/* ── Stock receipt modal ── */}
            {receiptProduct && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.55)', animation: 'modalIn 0.2s ease' }} onClick={() => setReceiptProduct(null)} />
                    <div style={{ position: 'relative', background: '#fff', borderRadius: 16, boxShadow: '0 24px 48px rgba(15,23,42,0.2)', width: '100%', maxWidth: 460, maxHeight: '90dvh', display: 'flex', flexDirection: 'column', zIndex: 10, animation: 'modalSlide 0.25s cubic-bezier(0.2,0.9,0.3,1)' }}>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const isWildcard = receiptProduct.parameters?.type === 'wildcard_group';
                            if (isWildcard && !receiptForm.variant_reference) {
                                toast.error('Vyberte konkrétny variant produktu.');
                                return;
                            }
                            receiveStockMutation.mutate({
                                product_id: receiptProduct.id,
                                batch_number: receiptForm.batch_number,
                                quantity: receiptForm.quantity,
                                notes: receiptForm.notes,
                                ...(receiptForm.variant_reference ? { variant_reference: receiptForm.variant_reference } : {}),
                            });
                        }} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
                                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>Naskladniť tovar</h3>
                                <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#64748b' }}>{receiptProduct.name}</p>
                            </div>
                            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {receiptProduct.parameters?.type === 'wildcard_group' && (
                                    <FieldGroup label="Variant (ref. číslo)">
                                        {receiptForm.variant_reference ? (
                                            <div style={{ padding: '8px 12px', borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: 13, fontFamily: "'JetBrains Mono', ui-monospace, monospace", color: '#475569' }}>
                                                {receiptForm.variant_reference}
                                            </div>
                                        ) : (
                                            <DropdownSelect
                                                value={receiptForm.variant_reference}
                                                onChange={(value) => setReceiptForm({ ...receiptForm, variant_reference: value })}
                                                placeholder="— Vyberte variant —"
                                                options={sortByFirstOptionTokenValue(receiptProduct.parameters.options || []).map((opt: { reference: string; label?: string; stock_quantity?: number }) => ({
                                                    value: opt.reference,
                                                    label: `${opt.reference}${opt.label ? ` · ${opt.label}` : ''} (teraz: ${opt.stock_quantity ?? 0} ks)`,
                                                }))}
                                            />
                                        )}
                                    </FieldGroup>
                                )}
                                <FieldGroup label="Číslo šarže *">
                                    <StyledInput type="text" required value={receiptForm.batch_number}
                                        onChange={(e) => setReceiptForm({ ...receiptForm, batch_number: e.target.value })}
                                        placeholder="napr. LOT-2026-001" />
                                </FieldGroup>
                                <FieldGroup label="Počet kusov *">
                                    <StyledInput type="number" required min={1} value={receiptForm.quantity}
                                        onChange={(e) => setReceiptForm({ ...receiptForm, quantity: parseInt(e.target.value) || 1 })} />
                                </FieldGroup>
                                <FieldGroup label="Poznámka (nepovinné)">
                                    <StyledTextarea value={receiptForm.notes}
                                        onChange={(e) => setReceiptForm({ ...receiptForm, notes: e.target.value })} rows={2} />
                                </FieldGroup>
                            </div>
                            <div style={{ padding: '14px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 10, background: '#fafafa', borderRadius: '0 0 16px 16px' }}>
                                <button type="button" onClick={() => setReceiptProduct(null)}
                                    style={{ padding: '9px 18px', borderRadius: 8, fontSize: 13.5, fontWeight: 500, border: '1px solid #e2e8f0', background: '#fff', color: '#374151', cursor: 'pointer' }}>
                                    Zrušiť
                                </button>
                                <button type="submit" disabled={receiveStockMutation.isPending}
                                    style={{ padding: '9px 20px', borderRadius: 8, fontSize: 13.5, fontWeight: 600, background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', cursor: receiveStockMutation.isPending ? 'not-allowed' : 'pointer', opacity: receiveStockMutation.isPending ? 0.7 : 1 }}>
                                    {receiveStockMutation.isPending ? 'Ukladám...' : 'Naskladniť'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                open={!!confirmDelete}
                title={confirmDelete?.mode === 'bulk' ? 'Odstrániť produkty' : 'Odstrániť produkt'}
                message={
                    confirmDelete?.mode === 'bulk'
                        ? `Naozaj chcete natrvalo odstrániť ${confirmDelete.count} produktov?`
                        : `Naozaj chcete natrvalo odstrániť produkt "${confirmDelete?.mode === 'single' ? confirmDelete.product.name : ''}"?`
                }
                confirmLabel="Odstrániť"
                isPending={deleteMutation.isPending || bulkDeleteMutation.isPending}
                onConfirm={() => {
                    if (!confirmDelete) return;
                    if (confirmDelete.mode === 'single') {
                        deleteMutation.mutate(confirmDelete.product.id, {
                            onSuccess: () => { toast.success('Produkt odstránený.'); setConfirmDelete(null); },
                            onError: () => toast.error('Chyba pri odstraňovaní produktu.')
                        });
                    } else {
                        bulkDeleteMutation.mutate(Array.from(selectedIds));
                        setConfirmDelete(null);
                    }
                }}
                onCancel={() => setConfirmDelete(null)}
            />
        </div>
    );
}
