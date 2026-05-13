import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCategoryVisibility, setCategoryVisibility } from '../api/products';
import type { CategoryVisibilityItem } from '../api/products';
import toast from 'react-hot-toast';
import AdminNav from '../components/AdminNav';
import { useAdminPageGuard } from '../hooks/useAdminPageGuard';

export default function AdminCategories() {
    const canAccess = useAdminPageGuard();
    const queryClient = useQueryClient();

    const [search, setSearch] = useState('');
    const [localState, setLocalState] = useState<Map<string, boolean> | null>(null);

    const { data: categories, isLoading } = useQuery<CategoryVisibilityItem[]>({
        queryKey: ['category-visibility'],
        queryFn: getCategoryVisibility,
    });

    useEffect(() => {
        if (categories) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLocalState(new Map(categories.map((c) => [c.name, c.visible])));
        }
    }, [categories]);

    const saveMutation = useMutation({
        mutationFn: (visible: string[]) => setCategoryVisibility(visible),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['category-visibility'] });
            queryClient.invalidateQueries({ queryKey: ['product-categories'] });
            toast.success('Viditeľnosť kategórií uložená.');
        },
        onError: () => toast.error('Chyba pri ukladaní.'),
    });

    const cats = categories ?? [];
    const effectiveState: Map<string, boolean> = localState ?? new Map(cats.map((c) => [c.name, c.visible]));

    const term = search.trim().toLowerCase();
    const filtered = term ? cats.filter((c) => c.name.toLowerCase().includes(term)) : cats;

    const visibleCount = [...effectiveState.values()].filter(Boolean).length;
    const totalCount = effectiveState.size;

    const toggle = (name: string) => {
        setLocalState((prev) => {
            const base: Map<string, boolean> = prev ?? new Map(cats.map((c) => [c.name, c.visible]));
            const next = new Map<string, boolean>(base);
            next.set(name, !next.get(name));
            return next;
        });
    };

    const setAll = (visible: boolean) => {
        setLocalState((prev) => {
            const base: Map<string, boolean> = prev ?? new Map(cats.map((c) => [c.name, c.visible]));
            const next = new Map<string, boolean>(base);
            for (const key of next.keys()) next.set(key, visible);
            return next;
        });
    };

    const handleSave = () => {
        const visible = [...effectiveState.entries()].filter(([, v]) => v).map(([k]) => k);
        saveMutation.mutate(visible);
    };

    const isDirty = localState !== null && cats.some((c) => effectiveState.get(c.name) !== c.visible);

    if (!canAccess) return null;

    return (
        <div className="min-h-screen" style={{ background: '#f6f8fb' }}>
            <AdminNav />
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Viditeľnosť kategórií</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Nastavte, ktoré kategórie sa zobrazujú v bočnom paneli obchodu.
                        </p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saveMutation.isPending || !isDirty}
                        className="rounded-lg px-5 py-2 text-sm font-semibold text-white transition-all disabled:opacity-50"
                        style={{ background: isDirty ? 'linear-gradient(135deg,#06b6d4,#3b82f6)' : '#94a3b8' }}
                    >
                        {saveMutation.isPending ? 'Ukladám...' : 'Uložiť zmeny'}
                    </button>
                </div>

                <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center gap-3">
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Hľadať kategóriu..."
                            className="flex-1 min-w-48 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                        />
                        <span className="text-sm text-slate-500">
                            <span className="font-semibold text-slate-900">{visibleCount}</span> / {totalCount} viditeľných
                        </span>
                        <button onClick={() => setAll(true)} className="text-xs text-cyan-600 hover:text-cyan-800 underline-offset-2 hover:underline">
                            Zobraziť všetky
                        </button>
                        <button onClick={() => setAll(false)} className="text-xs text-slate-500 hover:text-slate-800 underline-offset-2 hover:underline">
                            Skryť všetky
                        </button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 animate-pulse">
                        Načítavam kategórie...
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        {filtered.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-sm">Žiadne kategórie.</div>
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {filtered.map((cat) => {
                                    const visible = effectiveState.get(cat.name) ?? cat.visible;
                                    return (
                                        <li
                                            key={cat.name}
                                            className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors cursor-pointer"
                                            onClick={() => toggle(cat.name)}
                                        >
                                            <span className={`text-sm font-medium ${visible ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                                                {cat.name}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${visible ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: visible ? '#10b981' : '#94a3b8', flexShrink: 0, display: 'inline-block' }} />
                                                    {visible ? 'Viditeľná' : 'Skrytá'}
                                                </span>
                                                <input
                                                    type="checkbox"
                                                    checked={visible}
                                                    onChange={() => toggle(cat.name)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                                                />
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
