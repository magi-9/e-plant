import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGlobalSettings, updateGlobalSettings } from '../api/settings';
import type { GlobalSettings } from '../api/settings';
import toast from 'react-hot-toast';

export default function AdminSettings() {
    const queryClient = useQueryClient();
    const { data: currentSettings, isLoading } = useQuery({ queryKey: ['global-settings'], queryFn: getGlobalSettings });

    const [formData, setFormData] = useState<GlobalSettings>({
        warehouse_email: 'warehouse@dentalshop.sk',
        low_stock_threshold: 5,
        currency: 'EUR (€)',
        shipping_cost: '5.00'
    });

    useEffect(() => {
        if (currentSettings) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setFormData(currentSettings);
        }
    }, [currentSettings]);

    const mutation = useMutation({
        mutationFn: updateGlobalSettings,
        onSuccess: (data) => {
            queryClient.setQueryData(['global-settings'], data);
            toast.success('Nastavenia boli úspešne uložené.');
        },
        onError: () => {
            toast.error('Chyba pri ukladaní nastavení.');
        }
    });

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate(formData);
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500">Načítavam nastavenia...</div>;

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Globálne nastavenia obchodu</h1>

                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                    <form onSubmit={handleSave} className="p-6 space-y-6">
                        <div>
                            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-2 border-b pb-2">Notifikácie a emaily</h3>
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700">Email skladu (kam chodia upozornenia & vyskladnenia)</label>
                                <input type="email" value={formData.warehouse_email} onChange={e => setFormData({ ...formData, warehouse_email: e.target.value })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                                <p className="mt-1 text-sm text-gray-500">Na túto adresu budú chodiť výkazy o nízkych zásobách a nové objednávky.</p>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-2 border-b pb-2">Katalóg tovaru</h3>
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Predvolený 'Low Stock Threshold'</label>
                                    <input type="number" value={formData.low_stock_threshold} onChange={e => setFormData({ ...formData, low_stock_threshold: Number(e.target.value) })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Mena</label>
                                    <select value={formData.currency} onChange={e => setFormData({ ...formData, currency: e.target.value })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                                        <option>EUR (€)</option>
                                        <option>CZK (Kč)</option>
                                        <option>USD ($)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-2 border-b pb-2">Doprava</h3>
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700">Cena dopravy</label>
                                <input type="number" step="0.01" value={formData.shipping_cost} onChange={e => setFormData({ ...formData, shipping_cost: e.target.value })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                        </div>

                        <div className="pt-5 border-t border-gray-200">
                            <div className="flex justify-end">
                                <button type="submit" disabled={mutation.isPending} className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
                                    {mutation.isPending ? 'Ukladám...' : 'Uložiť nastavenia'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
