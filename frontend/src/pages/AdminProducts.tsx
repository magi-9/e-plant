import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProducts, createProduct, updateProduct, deleteProduct, importProductsCsv } from '../api/products';
import { PencilIcon, TrashIcon, PlusIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import type { Product } from '../api/products';

export default function AdminProducts() {
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    // Form states
    const [formData, setFormData] = useState<Partial<Product>>({ name: '', description: '', category: '', price: '0.00', stock_quantity: 0 });
    const [isUploadingCSV, setIsUploadingCSV] = useState(false);

    const { data: products, isLoading } = useQuery({ queryKey: ['products'], queryFn: getProducts });

    const mutationOptions = {
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            setIsModalOpen(false);
        }
    };

    const createMutation = useMutation({ mutationFn: createProduct, ...mutationOptions });
    const updateMutation = useMutation({ mutationFn: ({ id, data }: { id: number, data: Partial<Product> }) => updateProduct(id, data), ...mutationOptions });
    const deleteMutation = useMutation({ mutationFn: deleteProduct, onSuccess: mutationOptions.onSuccess });

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setFormData(product);
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setEditingProduct(null);
        setFormData({ name: '', description: '', category: '', price: '0.00', stock_quantity: 0 });
        setIsModalOpen(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = { ...formData, price: formData.price?.toString().replace(',', '.') };
        if (editingProduct) {
            updateMutation.mutate({ id: editingProduct.id, data: payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const handleDelete = (productId: number) => {
        if (confirm('Naozaj chcete natrvalo odstrániť tento produkt?')) {
            deleteMutation.mutate(productId);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingCSV(true);
        try {
            const res = await importProductsCsv(file);
            alert(res.message || 'Import úspešný');
            queryClient.invalidateQueries({ queryKey: ['products'] });
        } catch (error: any) {
            alert(error.response?.data?.error || 'Chyba importu CSV');
        } finally {
            setIsUploadingCSV(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

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
                    <div className="text-center p-8">Sťahujem katalóg...</div>
                ) : (
                    <div className="bg-white shadow overflow-auto sm:rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produkt</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategória</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cena</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sklad</th>
                                    <th className="relative px-6 py-3"><span className="sr-only">Akcie</span></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {products?.map((product) => (
                                    <tr key={product.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="ml-4">
                                                    <div className="text-sm font-bold text-gray-900">{product.name}</div>
                                                    <div className="text-xs text-gray-500 max-w-xs truncate" title={product.description}>{product.description}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{product.category}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{product.price} €</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${product.stock_quantity > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {product.stock_quantity} ks
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => handleEdit(product)} className="text-blue-600 hover:text-blue-900 mr-4">
                                                <PencilIcon className="h-5 w-5" />
                                            </button>
                                            <button onClick={() => handleDelete(product.id)} className="text-red-600 hover:text-red-900">
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {isModalOpen && (
                    <div className="fixed inset-0 z-10 overflow-y-auto">
                        <div className="flex items-center justify-center min-h-screen px-4">
                            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setIsModalOpen(false)}></div>
                            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg z-20 overflow-hidden">
                                <form onSubmit={handleSave}>
                                    <div className="px-6 py-5 bg-white">
                                        <h3 className="text-lg font-bold text-gray-900 border-b pb-3 mb-4">
                                            {editingProduct ? 'Upraviť produkt' : 'Pridať nový produkt'}
                                        </h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Názov produktu</label>
                                                <input type="text" required value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="mt-1 w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Popis</label>
                                                <textarea value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="mt-1 w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"></textarea>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Kategória</label>
                                                    <input type="text" required value={formData.category || ''} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="mt-1 w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Cena (€)</label>
                                                    <input type="number" step="0.01" min="0" required value={formData.price || ''} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="mt-1 w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Množstvo na sklade</label>
                                                    <input type="number" required value={formData.stock_quantity || ''} onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) })} className="mt-1 w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-100">Zrušiť</button>
                                        <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700">
                                            {editingProduct ? 'Uložiť zmeny' : 'Vytvoriť'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
