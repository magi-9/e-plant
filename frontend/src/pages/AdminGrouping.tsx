import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getGroupingSettings, updateGroupingSettings,
    getWildcardGroups, updateWildcardGroup, syncWildcardGroups,
    getWildcardGroupProducts, addProductsToWildcardGroup, removeProductsFromWildcardGroup,
    getProducts,
} from '../api/products';
import type { WildcardGroup } from '../api/products';
import {
    PlusIcon, PencilIcon, UsersIcon, CheckIcon, XMarkIcon, ArrowPathIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import AdminNav from '../components/AdminNav';

export default function AdminGrouping() {
    const queryClient = useQueryClient();

    const fetchAllAdminProductsForGrouping = async (search: string) => {
        const limit = 200;
        let offset = 0;
        let totalCount = 0;
        const results: Awaited<ReturnType<typeof getProducts>>['results'] = [];

        do {
            const page = await getProducts({
                search: search || undefined,
                admin_view: '1',
                limit,
                offset,
            });
            totalCount = page.count;
            results.push(...page.results);
            offset += limit;
        } while (offset < totalCount);

        return results;
    };

    // ── Grouping settings ───────────────────────────────────────────────────
    const { data: settings, isLoading: settingsLoading } = useQuery({
        queryKey: ['grouping-settings'],
        queryFn: getGroupingSettings,
    });

    const settingsMutation = useMutation({
        mutationFn: updateGroupingSettings,
        onSuccess: (data) => {
            queryClient.setQueryData(['grouping-settings'], data);
            toast.success('Nastavenia uložené.');
        },
        onError: () => toast.error('Chyba pri ukladaní nastavení.'),
    });

    // ── Wildcard groups ─────────────────────────────────────────────────────
    const { data: wildcardGroups = [], isLoading: wcGroupsLoading } = useQuery({
        queryKey: ['wildcard-groups'],
        queryFn: getWildcardGroups,
    });

    const [syncResult, setSyncResult] = useState<{ created: number; updated: number; deleted: number } | null>(null);
    const [editingWcGroup, setEditingWcGroup] = useState<WildcardGroup | null>(null);
    const [editWcForm, setEditWcForm] = useState({ name: '', is_enabled: true });
    const [managingWcGroup, setManagingWcGroup] = useState<WildcardGroup | null>(null);
    const [wcProductSearch, setWcProductSearch] = useState('');

    const { data: wcGroupProducts = [] } = useQuery({
        queryKey: ['wildcard-group-products', managingWcGroup?.id],
        queryFn: () => getWildcardGroupProducts(managingWcGroup!.id),
        enabled: !!managingWcGroup,
    });

    const { data: wcAllProductsData } = useQuery({
        queryKey: ['products-for-wc-grouping', managingWcGroup?.id, wcProductSearch],
        queryFn: () => fetchAllAdminProductsForGrouping(wcProductSearch),
        enabled: !!managingWcGroup,
    });
    const wcAllProducts = wcAllProductsData ?? [];
    const wcGroupProductIds = new Set(wcGroupProducts.map((p) => p.id));
    const wcCandidateProducts = wcAllProducts.filter((p) => !wcGroupProductIds.has(p.id));

    const syncMutation = useMutation({
        mutationFn: syncWildcardGroups,
        onSuccess: (data) => {
            setSyncResult(data);
            queryClient.invalidateQueries({ queryKey: ['wildcard-groups'] });
            toast.success(`Synchronizácia dokončená (nové: ${data.created}, aktualizované: ${data.updated}, zmazané: ${data.deleted}).`);
        },
        onError: () => toast.error('Chyba pri synchronizácii skupín.'),
    });

    const updateWcMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<WildcardGroup> }) => updateWildcardGroup(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wildcard-groups'] });
            setEditingWcGroup(null);
            toast.success('Skupina upravená.');
        },
        onError: () => toast.error('Chyba pri úprave skupiny.'),
    });

    const addWcProductsMutation = useMutation({
        mutationFn: ({ groupId, ids }: { groupId: number; ids: number[] }) =>
            addProductsToWildcardGroup(groupId, ids),
        onSuccess: (_, { groupId }) => {
            queryClient.invalidateQueries({ queryKey: ['wildcard-group-products', groupId] });
            queryClient.invalidateQueries({ queryKey: ['wildcard-groups'] });
            toast.success('Produkty pridané do skupiny.');
        },
        onError: () => toast.error('Chyba pri pridávaní produktov.'),
    });

    const removeWcProductsMutation = useMutation({
        mutationFn: ({ groupId, ids }: { groupId: number; ids: number[] }) =>
            removeProductsFromWildcardGroup(groupId, ids),
        onSuccess: (_, { groupId }) => {
            queryClient.invalidateQueries({ queryKey: ['wildcard-group-products', groupId] });
            queryClient.invalidateQueries({ queryKey: ['wildcard-groups'] });
            toast.success('Produkt odobraný zo skupiny.');
        },
        onError: () => toast.error('Chyba pri odoberaní produktu.'),
    });

    const openEditWc = (group: WildcardGroup) => {
        setEditingWcGroup(group);
        setEditWcForm({ name: group.name, is_enabled: group.is_enabled });
    };

    if (settingsLoading) {
        return <div className="p-8 text-center text-gray-500">Načítavam...</div>;
    }

    return (
        <div className="min-h-screen bg-slate-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <AdminNav />
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Správa groupingu</h1>
                <p className="text-sm text-slate-500 mb-6">
                    Nastavte wildcard grouping a spravujte skupiny produktov.
                </p>

                <div className="space-y-6">
                    {/* Settings card */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-800">Wildcard grouping</h2>
                                <p className="text-sm text-slate-500 mt-1">
                                    Produkty s rovnakým názvom (bez označenia variantu) a cenou sa
                                    automaticky zobrazia ako jedna karta s výberom variantu.
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={settings?.wildcard_grouping_enabled ?? true}
                                    onChange={(e) => settingsMutation.mutate({ wildcard_grouping_enabled: e.target.checked })}
                                    disabled={settingsMutation.isPending}
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-cyan-300 rounded-full peer peer-checked:bg-cyan-600 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                                <span className="ml-3 text-sm font-medium text-slate-700">
                                    {settings?.wildcard_grouping_enabled ? 'Zapnutý' : 'Vypnutý'}
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* Sync card */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="font-semibold text-slate-800">Automatická synchronizácia</h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    Analyzuje všetky viditeľné produkty a automaticky vytvorí skupiny
                                    podľa&nbsp;<span className="font-mono text-xs bg-slate-100 px-1 rounded">(názov, cena, kategória)</span>.
                                    Manuálne upravené skupiny nie sú prepísané.
                                </p>
                                {syncResult && (
                                    <p className="mt-2 text-sm text-slate-600">
                                        Posledná sync:&nbsp;
                                        <span className="text-emerald-600 font-medium">{syncResult.created} nových</span>,&nbsp;
                                        <span className="text-blue-600 font-medium">{syncResult.updated} aktualizovaných</span>,&nbsp;
                                        <span className="text-red-500 font-medium">{syncResult.deleted} zmazaných</span>
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => syncMutation.mutate()}
                                disabled={syncMutation.isPending}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-cyan-600 text-white text-sm font-medium rounded-lg hover:bg-cyan-700 disabled:opacity-60 transition-colors flex-shrink-0"
                            >
                                <ArrowPathIcon className={`h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                                Synchronizovať
                            </button>
                        </div>
                    </div>

                    {/* Groups list */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                        <div className="px-6 py-4 border-b border-slate-200">
                            <h3 className="font-semibold text-slate-800">
                                Skupiny
                                <span className="ml-2 text-xs font-normal text-slate-500">({wildcardGroups.length})</span>
                            </h3>
                        </div>

                        {wcGroupsLoading ? (
                            <div className="p-8 text-center text-slate-400">Načítavam skupiny...</div>
                        ) : wildcardGroups.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">
                                Žiadne skupiny. Spustite synchronizáciu vyššie.
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {wildcardGroups.map((group) => (
                                    <div key={group.id} className="px-6 py-4">
                                        {editingWcGroup?.id === group.id ? (
                                            <div className="space-y-3">
                                                <input
                                                    type="text"
                                                    value={editWcForm.name}
                                                    onChange={(e) => setEditWcForm({ ...editWcForm, name: e.target.value })}
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500"
                                                    placeholder="Názov skupiny"
                                                />
                                                <div className="flex items-center gap-3">
                                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={editWcForm.is_enabled}
                                                            onChange={(e) => setEditWcForm({ ...editWcForm, is_enabled: e.target.checked })}
                                                            className="h-4 w-4 rounded border-slate-300 text-cyan-600"
                                                        />
                                                        Aktívna
                                                    </label>
                                                    <div className="ml-auto flex gap-2">
                                                        <button onClick={() => setEditingWcGroup(null)} className="p-1.5 text-slate-400 hover:text-slate-700">
                                                            <XMarkIcon className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => updateWcMutation.mutate({ id: group.id, data: editWcForm })}
                                                            disabled={updateWcMutation.isPending}
                                                            className="p-1.5 text-cyan-600 hover:text-cyan-800"
                                                        >
                                                            <CheckIcon className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-semibold text-slate-800 truncate">{group.name}</span>
                                                        {group.is_enabled ? (
                                                            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700 rounded">AKTÍVNA</span>
                                                        ) : (
                                                            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-500 rounded">NEAKTÍVNA</span>
                                                        )}
                                                        {group.is_auto_generated ? (
                                                            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-600 rounded">AUTO</span>
                                                        ) : (
                                                            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 rounded">MANUÁLNA</span>
                                                        )}
                                                    </div>
                                                    <div className="mt-1 text-xs text-slate-500">
                                                        {group.product_count} produktov
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                    <button
                                                        onClick={() => { setManagingWcGroup(group); setWcProductSearch(''); }}
                                                        title="Spravovať produkty"
                                                        className="p-2 text-slate-400 hover:text-cyan-600 transition-colors"
                                                    >
                                                        <UsersIcon className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => openEditWc(group)}
                                                        title="Upraviť skupinu"
                                                        className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                                                    >
                                                        <PencilIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Wildcard manage products panel ── */}
            {managingWcGroup && (
                <div className="fixed inset-0 z-20 flex">
                    <div className="fixed inset-0 bg-black/40" onClick={() => setManagingWcGroup(null)} />
                    <div className="relative ml-auto h-full w-full max-w-2xl bg-white shadow-2xl flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <div>
                                <h2 className="font-semibold text-slate-800">Produkty v skupine</h2>
                                <p className="text-sm text-slate-500">{managingWcGroup.name}</p>
                            </div>
                            <button onClick={() => setManagingWcGroup(null)} className="p-2 text-slate-400 hover:text-slate-700">
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-700 mb-2">
                                    V skupine ({wcGroupProducts.length})
                                </h3>
                                {wcGroupProducts.length === 0 ? (
                                    <p className="text-sm text-slate-400">Žiadne produkty.</p>
                                ) : (
                                    <ul className="space-y-1">
                                        {wcGroupProducts.map((p) => (
                                            <li key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                                                <span className="flex-1 text-sm font-medium text-slate-800 truncate">{p.name}</span>
                                                <span className="text-xs font-mono text-slate-400 flex-shrink-0">{p.reference || '—'}</span>
                                                <button
                                                    onClick={() => removeWcProductsMutation.mutate({ groupId: managingWcGroup.id, ids: [p.id] })}
                                                    disabled={removeWcProductsMutation.isPending}
                                                    className="p-1 text-slate-400 hover:text-red-600 flex-shrink-0"
                                                    title="Odobrať zo skupiny"
                                                >
                                                    <XMarkIcon className="h-4 w-4" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <div>
                                <h3 className="text-sm font-semibold text-slate-700 mb-2">Pridať produkty</h3>
                                <input
                                    type="search"
                                    placeholder="Hľadať produkt..."
                                    value={wcProductSearch}
                                    onChange={(e) => setWcProductSearch(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm mb-3 focus:ring-2 focus:ring-cyan-500"
                                />
                                {wcCandidateProducts.length === 0 ? (
                                    <p className="text-sm text-slate-400">
                                        {wcProductSearch ? 'Žiadne výsledky.' : 'Všetky viditeľné produkty sú už v tejto skupine.'}
                                    </p>
                                ) : (
                                    <ul className="space-y-1 max-h-80 overflow-y-auto">
                                        {wcCandidateProducts.map((p) => (
                                            <li key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-slate-200 hover:border-cyan-300 hover:bg-cyan-50 transition-colors">
                                                <span className="flex-1 text-sm text-slate-800 truncate">{p.name}</span>
                                                <span className="text-xs font-mono text-slate-400 flex-shrink-0">{p.reference || '—'}</span>
                                                <button
                                                    onClick={() => addWcProductsMutation.mutate({ groupId: managingWcGroup.id, ids: [p.id] })}
                                                    disabled={addWcProductsMutation.isPending}
                                                    className="p-1 text-slate-400 hover:text-cyan-600 flex-shrink-0"
                                                    title="Pridať do skupiny"
                                                >
                                                    <PlusIcon className="h-4 w-4" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
