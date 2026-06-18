import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGlobalSettings, updateGlobalSettings } from '../api/settings';
import type { GlobalSettings } from '../api/settings';
import { exportProducts, fullImportProducts } from '../api/products';
import toast from 'react-hot-toast';
import AdminNav from '../components/AdminNav';
import { useAdminPageGuard } from '../hooks/useAdminPageGuard';

export default function AdminSettings() {
    const canAccess = useAdminPageGuard();

    const queryClient = useQueryClient();
    const { data: currentSettings, isLoading } = useQuery({ queryKey: ['global-settings'], queryFn: getGlobalSettings });
    const [activeSection, setActiveSection] = useState<'notifications' | 'inventory' | 'company' | 'catalog'>('notifications');
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const importFileRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState<GlobalSettings>({
        warehouse_email: 'info@ebringer.sk',
        low_stock_threshold: 5,
        currency: 'EUR (€)',
        shipping_cost: '5.00',
        vat_rate: '23.00',
        pickup_address: '',
        opening_hours: '',
        company_name: '',
        company_ico: '',
        company_dic: '',
        company_vat_id: '',
        company_street: '',
        company_city: '',
        company_postal_code: '',
        company_state: 'Slovensko',
        company_phone: '',
        company_email: 'info@ebringer.sk',
        iban: '',
        bank_name: '',
        bank_swift: '',
    });

    useEffect(() => {
        if (currentSettings) {
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

    const handleExport = async () => {
        setIsExporting(true);
        try {
            await exportProducts();
            toast.success('Export dokončený.');
        } catch {
            toast.error('Chyba pri exporte produktov.');
        } finally {
            setIsExporting(false);
        }
    };

    const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsImporting(true);
        try {
            const result = await fullImportProducts(file);
            toast.success(result.message);
        } catch {
            toast.error('Chyba pri importe produktov.');
        } finally {
            setIsImporting(false);
            if (importFileRef.current) importFileRef.current.value = '';
        }
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate(formData);
    };

    if (!canAccess) return null;
    if (isLoading) return <div className="p-8 text-center text-gray-500">Načítavam nastavenia...</div>;

    return (
        <div className="min-h-screen" style={{ background: '#f6f8fb' }}>
            <AdminNav />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                            <button
                                type="button"
                                onClick={() => setActiveSection('catalog')}
                                className={`w-full text-left px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                                    activeSection === 'catalog'
                                        ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                            >
                                Katalóg
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
                                        <div className="mt-4 grid grid-cols-1 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Predvolený limit nízkych zásob</label>
                                                <input type="number" value={formData.low_stock_threshold} onChange={e => setFormData({ ...formData, low_stock_threshold: Number(e.target.value) })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500" />
                                                <p className="mt-1 text-sm text-gray-500">Produkty s nižším počtom kusov budú označené ako "nízke zásoby".</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-2 border-b pb-2">Doprava a DPH</h3>
                                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Cena kuriéra (€)</label>
                                                <input type="number" step="0.01" value={formData.shipping_cost} onChange={e => setFormData({ ...formData, shipping_cost: e.target.value })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Sadzba DPH (%)</label>
                                                <input type="number" step="0.01" value={formData.vat_rate} onChange={e => setFormData({ ...formData, vat_rate: e.target.value })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500" />
                                                <p className="mt-1 text-sm text-gray-500">Napr. 23 pre 23% DPH.</p>
                                            </div>
                                        </div>
                                        <p className="mt-2 text-sm text-gray-500">Osobný odber je vždy zadarmo (0 €).</p>
                                        <div className="mt-4">
                                            <label className="block text-sm font-medium text-gray-700">Adresa osobného odberu</label>
                                            <input type="text" value={formData.pickup_address} onChange={e => setFormData({ ...formData, pickup_address: e.target.value })} placeholder="napr. Hlavná 1, 811 01 Bratislava" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500" />
                                        </div>
                                        <div className="mt-4">
                                            <label className="block text-sm font-medium text-gray-700">Otváracie hodiny</label>
                                            <input type="text" value={formData.opening_hours} onChange={e => setFormData({ ...formData, opening_hours: e.target.value })} placeholder="napr. Po–Pi 8:00–17:00" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500" />
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
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">IČ DPH</label>
                                            <input type="text" value={formData.company_vat_id} onChange={e => setFormData({ ...formData, company_vat_id: e.target.value })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500" />
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

                            {activeSection === 'catalog' && (
                                <div>
                                    <h3 className="text-lg font-medium leading-6 text-gray-900 mb-2 border-b pb-2">Export / Import katalógu</h3>
                                    <p className="text-sm text-gray-500 mb-6">
                                        Export stiahne JSON súbor so všetkými produktmi. Import aktualizuje existujúce produkty (podľa reference) a vytvorí nové.
                                    </p>
                                    <div className="flex flex-wrap gap-4">
                                        <button
                                            type="button"
                                            onClick={handleExport}
                                            disabled={isExporting}
                                            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
                                        >
                                            {isExporting ? 'Exportujem...' : 'Exportovať produkty (JSON)'}
                                        </button>
                                        <label className={`inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm cursor-pointer ${isImporting ? 'opacity-50 pointer-events-none' : ''}`}>
                                            <input
                                                ref={importFileRef}
                                                type="file"
                                                accept=".json"
                                                className="sr-only"
                                                onChange={handleImportFile}
                                                disabled={isImporting}
                                            />
                                            {isImporting ? 'Importujem...' : 'Importovať produkty (JSON)'}
                                        </label>
                                    </div>
                                </div>
                            )}

                            {activeSection !== 'catalog' && (
                            <div className="pt-5 border-t border-gray-200">
                                <div className="flex justify-end">
                                    <button type="submit" disabled={mutation.isPending} className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors">
                                        {mutation.isPending ? 'Ukladám...' : 'Uložiť nastavenia'}
                                    </button>
                                </div>
                            </div>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
