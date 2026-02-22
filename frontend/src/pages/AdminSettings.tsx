import React, { useState } from 'react';

export default function AdminSettings() {
    const [email, setEmail] = useState('warehouse@dentalshop.sk');
    const [threshold, setThreshold] = useState(5);
    const [currency, setCurrency] = useState('EUR (€)');

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        alert('Nastavenia boli úspešne uložené (Simulácia). Tieto údaje sa dajú neskôr previazat na globálne env alebo databázu cez backendové API.');
    };

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
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                                <p className="mt-1 text-sm text-gray-500">Na túto adresu budú chodiť výkazy o nízkych zásobách a nové objednávky.</p>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-2 border-b pb-2">Katalóg tovaru</h3>
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Predvolený 'Low Stock Threshold'</label>
                                    <input type="number" value={threshold} onChange={e => setThreshold(Number(e.target.value))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Mena</label>
                                    <select value={currency} onChange={e => setCurrency(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                                        <option>EUR (€)</option>
                                        <option>CZK (Kč)</option>
                                        <option>USD ($)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="pt-5 border-t border-gray-200">
                            <div className="flex justify-end">
                                <button type="submit" className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                    Uložiť nastavenia
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
