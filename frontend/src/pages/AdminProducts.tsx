import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProducts, createProduct, updateProduct, deleteProduct, importProductsCsv, bulkDeleteProducts, bulkSetActiveProducts } from '../api/products';
import { receiveStock } from '../api/orders';
import { PencilIcon, TrashIcon, PlusIcon, ArrowUpTrayIcon, ArchiveBoxArrowDownIcon } from '@heroicons/react/24/outline';
import type { Product } from '../api/products';
import toast from 'react-hot-toast';

const PAGE_SIZE = 50;

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
    const imageInputRef = useRef<HTMLInputElement>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);

    const [receiptProduct, setReceiptProduct] = useState<Product | null>(null);
    const [receiptForm, setReceiptForm] = useState({ batch_number: '', quantity: 1, notes: '' });

    // Form states
    const [formData, setFormData] = useState<Partial<Product>>({ name: '', description: '', category: '', price: '0.00', stock_quantity: 0, is_active: true, is_visible: true });
    const [isUploadingCSV, setIsUploadingCSV] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [sortBy, setSortBy] = useState('-name');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [visibleFilter, setVisibleFilter] = useState<'all' | 'visible' | 'hidden'>('all');
    const [stockFilter, setStockFilter] = useState<'all' | 'in' | 'out'>('all');
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    useEffect(() => {
        const timeout = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 250);
        return () => clearTimeout(timeout);
    }, [searchTerm]);

    useEffect(() => {
        setCurrentPage(0);
        setSelectedIds(new Set());
    }, [debouncedSearch, sortBy, categoryFilter, activeFilter, visibleFilter, stockFilter]);

    const invalidateProductQueries = () => {
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['products-admin'] });
    };

    const { data: paginatedData, isLoading } = useQuery({
        queryKey: ['products-admin', debouncedSearch, sortBy, currentPage],
        queryFn: () => getProducts({ search: debouncedSearch, ordering: sortBy, limit: PAGE_SIZE, offset: currentPage * PAGE_SIZE }),
    });

    const products = useMemo(() => paginatedData?.results || [], [paginatedData]);
    const totalCount = paginatedData?.count || 0;
    const totalPages = totalCount > 0 ? Math.ceil(totalCount / PAGE_SIZE) : 0;

    useEffect(() => {
        if (totalPages > 0 && currentPage >= totalPages) {
            setCurrentPage(totalPages - 1);
        }
    }, [currentPage, totalPages]);

    const categories = useMemo(() => {
        if (!products) return [];
        return [...new Set(products.flatMap((product) => getCategoryList(product)))].sort((a, b) => a.localeCompare(b));
    }, [products]);

    const filteredProducts = useMemo(() => {
        if (!products) return [];

        return products.filter((product) => {
            if (categoryFilter !== 'all' && !getCategoryList(product).includes(categoryFilter)) return false;
            if (activeFilter === 'active' && !product.is_active) return false;
            if (activeFilter === 'inactive' && product.is_active) return false;
            if (visibleFilter === 'visible' && !product.is_visible) return false;
            if (visibleFilter === 'hidden' && product.is_visible) return false;
            if (stockFilter === 'in' && product.stock_quantity <= 0) return false;
            if (stockFilter === 'out' && product.stock_quantity > 0) return false;
            return true;
        });
    }, [products, categoryFilter, activeFilter, visibleFilter, stockFilter]);

    const receiveStockMutation = useMutation({
        mutationFn: receiveStock,
        onSuccess: (result) => {
            invalidateProductQueries();
            toast.success(result.message);
            setReceiptProduct(null);
            setReceiptForm({ batch_number: '', quantity: 1, notes: '' });
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

    const bulkSetActiveMutation = useMutation({
        mutationFn: ({ ids, is_active }: { ids: number[]; is_active: boolean }) => bulkSetActiveProducts(ids, is_active),
        onSuccess: (res) => {
            invalidateProductQueries();
            setSelectedIds(new Set());
            toast.success(`Aktualizovaných ${res.updated} produktov.`);
        },
        onError: () => toast.error('Chyba pri hromadnej aktualizácii.'),
    });

    const allFilteredSelected = filteredProducts.length > 0 && filteredProducts.every((p) => selectedIds.has(p.id));
    const someSelected = filteredProducts.some((p) => selectedIds.has(p.id));

    const toggleSelectAll = () => {
        if (allFilteredSelected) {
            setSelectedIds((prev) => {
                const next = new Set(prev);
                filteredProducts.forEach((p) => next.delete(p.id));
                return next;
            });
        } else {
            setSelectedIds((prev) => {
                const next = new Set(prev);
                filteredProducts.forEach((p) => next.add(p.id));
                return next;
            });
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
        const ids = Array.from(selectedIds);
        if (confirm(`Naozaj chcete natrvalo odstrániť ${ids.length} produktov?`)) {
            bulkDeleteMutation.mutate(ids);
        }
    };

    const handleBulkSetActive = (is_active: boolean) => {
        bulkSetActiveMutation.mutate({ ids: Array.from(selectedIds), is_active });
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setFormData(product);
        setImageFile(null);
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setEditingProduct(null);
        setFormData({ name: '', description: '', category: '', price: '0.00', stock_quantity: 0, is_active: true, is_visible: true });
        setImageFile(null);
        setIsModalOpen(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();

        const payload = new FormData();
        payload.append('name', formData.name || '');
        payload.append('description', formData.description || '');
        payload.append('category', formData.category || '');
        payload.append('stock_quantity', (formData.stock_quantity || 0).toString());

        const priceStr = formData.price?.toString().replace(',', '.');
        if (priceStr) {
            payload.append('price', priceStr);
        }

        if (imageFile) {
            payload.append('image', imageFile);
        }

        payload.append('is_active', (formData.is_active ?? true).toString());
        payload.append('is_visible', (formData.is_visible ?? true).toString());

        if (editingProduct) {
            updateMutation.mutate({ id: editingProduct.id, data: payload }, {
                onSuccess: () => toast.success('Produkt bol úspešne upravený!'),
                onError: () => toast.error('Chyba pri ukladaní produktu.')
            });
        } else {
            createMutation.mutate(payload, {
                onSuccess: () => toast.success('Nový produkt bol úspešne pridaný!'),
                onError: () => toast.error('Chyba pri vytváraní produktu.')
            });
        }
    };

    const handleDelete = (productId: number) => {
        if (confirm('Naozaj chcete natrvalo odstrániť tento produkt?')) {
            deleteMutation.mutate(productId, {
                onSuccess: () => toast.success('Produkt odstránený.'),
                onError: () => toast.error('Chyba pri odstraňovaní produktu.')
            });
        }
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

    const goToPreviousPage = () => {
        setCurrentPage((page) => Math.max(0, page - 1));
        setSelectedIds(new Set());
    };

    const goToNextPage = () => {
        setCurrentPage((page) => Math.min(Math.max(totalPages - 1, 0), page + 1));
        setSelectedIds(new Set());
    };

    const displayPage = totalPages === 0 ? 0 : currentPage + 1;
    const canGoPrevious = currentPage > 0;
    const canGoNext = totalPages > 0 && currentPage < totalPages - 1;

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="sm:flex sm:items-center sm:justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Správa produktov</h1>
                        <p className="mt-2 text-sm text-gray-700">Vytvárajte, importujte z CSV alebo inak spravujte tovar eshopu.</p>
                    </div>
                    <div className="mt-4 sm:mt-0 flex flex-wrap gap-2">
                        <input type="file" ref={fileInputRef} accept=".csv" className="hidden" onChange={handleFileUpload} />
                        <button onClick={() => fileInputRef.current?.click()} disabled={isUploadingCSV} className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition">
                            <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
                            {isUploadingCSV ? 'Importujem...' : 'Z CSV'}
                        </button>
                        <button onClick={handleAdd} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition">
                            <PlusIcon className="h-5 w-5 mr-2" /> Pridať produkt
                        </button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="text-center p-8 text-gray-500">Sťahujem katalóg...</div>
                ) : (
                    <>
                        <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
                                <div className="xl:col-span-2">
                                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Vyhľadávanie</label>
                                    <input
                                        type="search"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Názov, popis, kategória"
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Triedenie</label>
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    >
                                        <option value="-name">Názov Z-A</option>
                                        <option value="name">Názov A-Z</option>
                                        <option value="-price">Cena od najvyššej</option>
                                        <option value="price">Cena od najnižšej</option>
                                        <option value="-stock_quantity">Sklad najviac</option>
                                        <option value="stock_quantity">Sklad najmenej</option>
                                        <option value="category">Kategória A-Z</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Kategória</label>
                                    <select
                                        value={categoryFilter}
                                        onChange={(e) => setCategoryFilter(e.target.value)}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    >
                                        <option value="all">Všetky</option>
                                        {categories.map((category) => (
                                            <option key={category} value={category}>{category}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Aktívnosť</label>
                                    <select
                                        value={activeFilter}
                                        onChange={(e) => setActiveFilter(e.target.value as 'all' | 'active' | 'inactive')}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    >
                                        <option value="all">Všetky</option>
                                        <option value="active">Aktívne</option>
                                        <option value="inactive">Neaktívne</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Viditeľnosť</label>
                                    <select
                                        value={visibleFilter}
                                        onChange={(e) => setVisibleFilter(e.target.value as 'all' | 'visible' | 'hidden')}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    >
                                        <option value="all">Všetky</option>
                                        <option value="visible">Viditeľné</option>
                                        <option value="hidden">Skryté</option>
                                    </select>
                                </div>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                                <div className="text-sm text-gray-600">
                                    Zobrazené <span className="font-semibold text-gray-900">{filteredProducts.length}</span> z <span className="font-semibold text-gray-900">{products.length}</span> produktov na stránke
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sklad</label>
                                    <select
                                        value={stockFilter}
                                        onChange={(e) => setStockFilter(e.target.value as 'all' | 'in' | 'out')}
                                        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    >
                                        <option value="all">Všetko</option>
                                        <option value="in">Len skladom</option>
                                        <option value="out">Len vypredané</option>
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchTerm('');
                                            setSortBy('-name');
                                            setCategoryFilter('all');
                                            setActiveFilter('all');
                                            setVisibleFilter('all');
                                            setStockFilter('all');
                                        }}
                                        className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                    >
                                        Reset filtrov
                                    </button>
                                </div>
                            </div>
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-3">
                                <div className="text-sm text-gray-600">
                                    Stránka <span className="font-semibold text-gray-900">{displayPage}</span> z <span className="font-semibold text-gray-900">{totalPages}</span>
                                    <span className="ml-2 text-gray-400">({totalCount} produktov)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={goToPreviousPage}
                                        disabled={!canGoPrevious || isLoading}
                                        className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Predchádzajúca
                                    </button>
                                    <button
                                        type="button"
                                        onClick={goToNextPage}
                                        disabled={!canGoNext || isLoading}
                                        className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Ďalšia
                                    </button>
                                </div>
                            </div>
                        </div>

                        {selectedIds.size > 0 && (
                            <div className="mb-3 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2">
                                <span className="text-sm font-medium text-blue-800">Vybrané: {selectedIds.size}</span>
                                <button
                                    onClick={() => handleBulkSetActive(true)}
                                    disabled={bulkSetActiveMutation.isPending}
                                    className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    Nastaviť aktívne
                                </button>
                                <button
                                    onClick={() => handleBulkSetActive(false)}
                                    disabled={bulkSetActiveMutation.isPending}
                                    className="rounded-md bg-gray-600 px-3 py-1 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50"
                                >
                                    Nastaviť neaktívne
                                </button>
                                <button
                                    onClick={handleBulkDelete}
                                    disabled={bulkDeleteMutation.isPending}
                                    className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                                >
                                    Odstrániť vybrané
                                </button>
                                <button
                                    onClick={() => setSelectedIds(new Set())}
                                    className="ml-auto text-xs text-blue-600 hover:underline"
                                >
                                    Zrušiť výber
                                </button>
                            </div>
                        )}

                        <div className="bg-white shadow overflow-auto sm:rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3">
                                        <input
                                            type="checkbox"
                                            checked={allFilteredSelected}
                                            ref={(el) => { if (el) el.indeterminate = someSelected && !allFilteredSelected; }}
                                            onChange={toggleSelectAll}
                                            className="h-4 w-4 rounded border-gray-300 text-blue-600"
                                        />
                                    </th>
                                    <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Obrázok</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produkt</th>
                                    <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategória</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cena</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sklad</th>
                                    <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stav</th>
                                    <th className="relative px-4 py-3"><span className="sr-only">Akcie</span></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredProducts.map((product) => (
                                    <tr key={product.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.has(product.id) ? 'bg-blue-50' : ''}`}>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(product.id)}
                                                onChange={() => toggleSelect(product.id)}
                                                className="h-4 w-4 rounded border-gray-300 text-blue-600"
                                            />
                                        </td>
                                        <td className="hidden sm:table-cell px-4 py-3 whitespace-nowrap">
                                            {product.image ? (
                                                <img src={product.image} alt={product.name} className="h-10 w-10 rounded-md object-cover" />
                                            ) : (
                                                <div className="h-10 w-10 rounded-md bg-gray-200 flex items-center justify-center text-gray-400 text-xs text-center border">Žiadny</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div>
                                                <div className="text-sm font-bold text-gray-900">{product.name}</div>
                                                <div className="text-xs text-gray-500 max-w-[180px] truncate md:max-w-xs" title={product.description}>{product.description}</div>
                                            </div>
                                        </td>
                                        <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-600 max-w-xs">
                                            <span className="line-clamp-2" title={getCategoryList(product).join(', ')}>
                                                {getCategoryList(product).join(', ') || product.category}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">{product.price ? `${product.price} €` : '-'}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${product.stock_quantity > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {product.stock_quantity} ks
                                            </span>
                                        </td>
                                        <td className="hidden lg:table-cell px-4 py-3 whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${product.is_active ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'}`}>
                                                    {product.is_active ? 'Aktívny' : 'Neaktívny'}
                                                </span>
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${product.is_visible ? 'bg-emerald-100 text-emerald-800' : 'bg-yellow-100 text-yellow-700'}`}>
                                                    {product.is_visible ? 'Viditeľný' : 'Skrytý'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => { setReceiptProduct(product); setReceiptForm({ batch_number: '', quantity: 1, notes: '' }); }} className="text-emerald-600 hover:text-emerald-900 mr-3" title="Naskladniť">
                                                <ArchiveBoxArrowDownIcon className="h-5 w-5" />
                                            </button>
                                            <button onClick={() => handleEdit(product)} className="text-blue-600 hover:text-blue-900 mr-3">
                                                <PencilIcon className="h-5 w-5" />
                                            </button>
                                            <button onClick={() => handleDelete(product.id)} className="text-red-600 hover:text-red-900">
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredProducts.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                                            Nenašli sa žiadne produkty pre zadané filtre.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        </div>
                    </>
                )}

                {isModalOpen && (
                        <div className="fixed inset-0 z-10 overflow-y-auto">
                        <div className="flex items-end sm:items-center justify-center min-h-screen px-4 pb-0 pt-4 sm:pt-0 sm:p-0">
                            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsModalOpen(false)}></div>
                            <div className="relative bg-white rounded-t-2xl sm:rounded-lg shadow-xl text-left overflow-hidden transform transition-all sm:my-8 w-full sm:max-w-lg z-20 max-h-[90dvh] flex flex-col">
                                <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
                                    <div className="px-6 py-5 bg-white overflow-y-auto flex-1">
                                        <h3 className="text-lg font-bold text-gray-900 border-b pb-3 mb-4">
                                            {editingProduct ? 'Upraviť produkt' : 'Pridať nový produkt'}
                                        </h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Názov produktu *</label>
                                                <input type="text" required value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="mt-1 w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Popis</label>
                                                <textarea value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="mt-1 w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"></textarea>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Kategória *</label>
                                                    <input type="text" required value={formData.category || ''} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="mt-1 w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Cena (€) *</label>
                                                    <input type="number" step="0.01" min="0" required value={formData.price || ''} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="mt-1 w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Množstvo na sklade *</label>
                                                    <input type="number" required value={formData.stock_quantity || ''} onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) })} className="mt-1 w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Fotografia produktu</label>
                                                    <input type="file" ref={imageInputRef} accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="mt-1 w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                                                    {editingProduct?.image && !imageFile && (
                                                        <p className="mt-1 text-xs text-gray-400">Produkt už obsahuje obrázok. Nový ho prepíše.</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-6 pt-1">
                                                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.is_active ?? true}
                                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                                        className="h-4 w-4 text-blue-600 rounded border-gray-300"
                                                    />
                                                    Aktívny
                                                </label>
                                                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.is_visible ?? true}
                                                        onChange={(e) => setFormData({ ...formData, is_visible: e.target.checked })}
                                                        className="h-4 w-4 text-blue-600 rounded border-gray-300"
                                                    />
                                                    Viditeľný v katalógu
                                                </label>
                                            </div>
                                            {formData.group_name && (
                                                <p className="text-xs text-gray-500">Skupina: <span className="font-medium">{formData.group_name}</span></p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-100 transition">Zrušiť</button>
                                        <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition">
                                            {editingProduct ? 'Uložiť zmeny' : 'Vytvoriť'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {receiptProduct && (
                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setReceiptProduct(null)}></div>
                        <div className="relative bg-white rounded-lg shadow-xl w-full sm:max-w-md z-20">
                            <form onSubmit={(e) => { e.preventDefault(); receiveStockMutation.mutate({ product_id: receiptProduct.id, ...receiptForm }); }}>
                                <div className="px-6 py-5">
                                    <h3 className="text-lg font-bold text-gray-900 border-b pb-3 mb-4">Naskladniť tovar</h3>
                                    <p className="text-sm text-gray-700 mb-4 font-medium">{receiptProduct.name}</p>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Číslo šarže *</label>
                                            <input
                                                type="text"
                                                required
                                                value={receiptForm.batch_number}
                                                onChange={(e) => setReceiptForm({ ...receiptForm, batch_number: e.target.value })}
                                                placeholder="napr. LOT-2026-001"
                                                className="mt-1 w-full px-3 py-2 border rounded focus:ring-emerald-500 focus:border-emerald-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Počet kusov *</label>
                                            <input
                                                type="number"
                                                required
                                                min={1}
                                                value={receiptForm.quantity}
                                                onChange={(e) => setReceiptForm({ ...receiptForm, quantity: parseInt(e.target.value) || 1 })}
                                                className="mt-1 w-full px-3 py-2 border rounded focus:ring-emerald-500 focus:border-emerald-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Poznámka (nepovinné)</label>
                                            <textarea
                                                value={receiptForm.notes}
                                                onChange={(e) => setReceiptForm({ ...receiptForm, notes: e.target.value })}
                                                rows={2}
                                                className="mt-1 w-full px-3 py-2 border rounded focus:ring-emerald-500 focus:border-emerald-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 rounded-b-lg">
                                    <button type="button" onClick={() => setReceiptProduct(null)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-100 transition">Zrušiť</button>
                                    <button type="submit" disabled={receiveStockMutation.isPending} className="px-4 py-2 bg-emerald-600 text-white rounded font-medium hover:bg-emerald-700 transition">
                                        {receiveStockMutation.isPending ? 'Ukladám...' : 'Naskladniť'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
