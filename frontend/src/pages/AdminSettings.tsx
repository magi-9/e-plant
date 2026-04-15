import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGlobalSettings, updateGlobalSettings } from '../api/settings';
import type { GlobalSettings } from '../api/settings';
import toast from 'react-hot-toast';
import AdminNav from '../components/AdminNav';

export default function AdminSettings() {
    const queryClient = useQueryClient();
    const { data: currentSettings, isLoading } = useQuery({ queryKey: ['global-settings'], queryFn: getGlobalSettings });
    const [activeSection, setActiveSection] = useState<'notifications' | 'inventory' | 'company'>('notifications');

    const [formData, setFormData] = useState<GlobalSettings>({
        warehouse_email: 'warehouse@dentalshop.sk',
        low_stock_threshold: 5,
        currency: 'EUR (€)',
        shipping_cost: '5.00',
        company_name: '',
        company_ico: '',
        company_dic: '',
        company_street: '',
        company_city: '',
        company_postal_code: '',
        company_state: '',
        company_phone: '',
        company_email: '',
        iban: '',
        bank_name: '',
        bank_swift: '',
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
        <div className="min-h-screen bg-slate-50 py-8">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <AdminNav />
                <h1 className="text-3xl font-bold text-slate-900 mb-8">Globálne nastavenia obchodu</h1>

                <div className="bg-white shadow overflow-hidden sm:rounded-xl border border-slate-200">
                    <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-12">
                        <aside className="md:col-span-4 lg:col-span-3 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/70 p-4 space-y-2">
                            <button
                                type="button"
                                onClick={() => setActiveSection('notifications')}
                                className={`w-full text-left px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                                    activeSection === 'notifications'
                                        ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                            >
                                Notifikácie a emaily
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveSection('inventory')}
                                className={`w-full text-left px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                                    activeSection === 'inventory'
                                        ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                            >
                                Sklad
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveSection('company')}
                                className={`w-full text-left px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                                    activeSection === 'company'
                                        ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                            >
                                Informácie
                            </button>
                        </aside>

                        <div className="md:col-span-8 lg:col-span-9 p-6 space-y-6">
                            {activeSection === 'notifications' && (
                                <div>
                                    <h3 className="text-lg font-medium leading-6 text-gray-900 mb-2 border-b pb-2">Notifikácie a emaily</h3>
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-gray-700">Email skladu (kam chodia upozornenia & vyskladnenia)</label>
                                        <input type="email" value={formData.warehouse_email} onChange={e => setFormData({ ...formData, warehouse_email: e.target.value })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500" />
                                        <p className="mt-1 text-sm text-gray-500">Na túto adresu budú chodiť výkazy o nízkych zásobách a nové objednávky.</p>
                                    </div>
                                </div>
                            )}

                            {activeSection === 'inventory' && (
                                <>
                                    <div>
                                        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-2 border-b pb-2">Sklad a katalóg</h3>
                                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Predvolený 'Low Stock Threshold'</label>
                                                <input type="number" value={formData.low_stock_threshold} onChange={e => setFormData({ ...formData, low_stock_threshold: Number(e.target.value) })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Mena</label>
                                                <select value={formData.currency} onChange={e => setFormData({ ...formData, currency: e.target.value })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500">
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
                                            <input type="number" step="0.01" value={formData.shipping_cost} onChange={e => setFormData({ ...formData, shipping_cost: e.target.value })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500" />
                                        </div>
                                    </div>
                                </>
                            )}

                            {activeSection === 'company' && (
                                <div>
                                    <h3 className="text-lg font-medium leading-6 text-gray-900 mb-2 border-b pb-2">Naša spoločnosť (faktúry)</h3>
                                    <p className="text-sm text-gray-500 mb-4">Tieto údaje sa zobrazujú na automaticky generovaných PDF faktúrach.</p>
                                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700">Názov spoločnosti</label>
                                            <input type="text" value={formData.company_name} onChange={e => setFormData({ ...formData, company_name: e.target.value })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">IČO</label>
                                            <input type="text" value={formData.company_ico} onChange={e => setFormData({ ...formData, company_ico: e.target.value })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">DIČ</label>
                                            <input type="text" value={formData.company_dic} onChange={e => setFormData({ ...formData, company_dic: e.target.value })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700">Ulica a číslo</label>
                                            <input type="text" value={formData.company_street} onChange={e => setFormData({ ...formData, company_street: e.target.value })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Mesto</label>
                                            <input type="text" value={formData.company_city} onChange={e => setFormData({ ...formData, company_city: e.target.value })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">PSČ</label>
                                            <input type="text" value={formData.company_postal_code} onChange={e => setFormData({ ...formData, company_postal_code: e.target.value })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Štát</label>
                                            <input type="text" value={formData.company_state} onChange={e => setFormData({ ...formData, company_state: e.target.value })} placeholder="Slovensko" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Telefón</label>
                                            <input type="text" value={formData.company_phone} onChange={e => setFormData({ ...formData, company_phone: e.target.value })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Email spoločnosti</label>
                                            <input type="email" value={formData.company_email} onChange={e => setFormData({ ...formData, company_email: e.target.value })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500" />
                                        </div>
                                    </div>

                                    <h4 className="text-sm font-semibold text-gray-700 mt-5 mb-3">Bankové údaje</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700">IBAN</label>
                                            <input type="text" value={formData.iban} onChange={e => setFormData({ ...formData, iban: e.target.value })} placeholder="SK00 0000 0000 0000 0000 0000" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 font-mono" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Názov banky</label>
                                            <input type="text" value={formData.bank_name} onChange={e => setFormData({ ...formData, bank_name: e.target.value })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">SWIFT / BIC</label>
                                            <input type="text" value={formData.bank_swift} onChange={e => setFormData({ ...formData, bank_swift: e.target.value })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 font-mono" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="pt-5 border-t border-gray-200">
                                <div className="flex justify-end">
                                    <button type="submit" disabled={mutation.isPending} className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors">
                                        {mutation.isPending ? 'Ukladám...' : 'Uložiť nastavenia'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
