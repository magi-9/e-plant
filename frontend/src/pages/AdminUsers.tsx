import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChartBarIcon, EyeIcon, KeyIcon, PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { getAdminUsers, createAdminUser, updateAdminUser, setAdminUserPassword, deleteAdminUser, type User } from '../api/users';
import AdminNav from '../components/AdminNav';
import ConfirmModal from '../components/ConfirmModal';
import { useAdminPageGuard } from '../hooks/useAdminPageGuard';

export default function AdminUsers() {
    const canAccess = useAdminPageGuard();
    const navigate = useNavigate();

    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [previewUser, setPreviewUser] = useState<User | null>(null);
    const [creatingRole, setCreatingRole] = useState<'admin' | 'client'>('client');
    const [formData, setFormData] = useState({ email: '', password: '', first_name: '', last_name: '', is_active: true, annual_discount_percent: '0' });
    const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
    const [passwordTarget, setPasswordTarget] = useState<User | null>(null);
    const [passwordData, setPasswordData] = useState({ password: '', confirmPassword: '' });

    const { data: users, isLoading } = useQuery({ queryKey: ['admin-users'], queryFn: getAdminUsers });

    const isPaginated = <T,>(value: unknown): value is { results: T[] } => {
        return typeof value === 'object' && value !== null && Array.isArray((value as { results?: unknown }).results);
    };

    const usersData: unknown = users;
    const usersList: User[] = Array.isArray(users)
        ? users
        : isPaginated<User>(usersData)
            ? usersData.results
            : [];

    const admins = usersList.filter(u => u.is_staff);
    const clients = usersList.filter(u => !u.is_staff);
    const fullName = (user: User) => [user.title, user.first_name, user.last_name].filter(Boolean).join(' ').trim();
    const formatCurrency = (value?: number) => new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(value ?? 0);
    const formatDiscount = (value?: string | number) => {
        const amount = Number(value ?? 0);
        return `${amount.toLocaleString('sk-SK', { maximumFractionDigits: 2 })} %`;
    };

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-users'], exact: false });

    const apiErrorMessage = (err: unknown): string => {
        const data = (err as { response?: { data?: unknown } })?.response?.data;
        if (!data || typeof data !== 'object') return 'Neznáma chyba.';
        const msgs = Object.entries(data as Record<string, unknown>)
            .flatMap(([, v]) => (Array.isArray(v) ? v : [v]))
            .filter(Boolean)
            .join(' ');
        return msgs || 'Neznáma chyba.';
    };

    const createMutation = useMutation({
        mutationFn: createAdminUser,
        onSuccess: () => { invalidate(); setIsModalOpen(false); toast.success('Používateľ bol vytvorený.'); },
        onError: (err) => toast.error(apiErrorMessage(err)),
    });
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<User> }) => updateAdminUser(id, data),
        onSuccess: () => { invalidate(); setIsModalOpen(false); toast.success('Používateľ bol aktualizovaný.'); },
        onError: (err) => toast.error(apiErrorMessage(err)),
    });
    const deleteMutation = useMutation({
        mutationFn: deleteAdminUser,
        onSuccess: () => { invalidate(); setDeleteTarget(null); toast.success('Používateľ bol odstránený.'); },
        onError: (err) => toast.error(apiErrorMessage(err)),
    });
    const setPasswordMutation = useMutation({
        mutationFn: ({ id, password }: { id: number; password: string }) => setAdminUserPassword(id, password),
        onSuccess: () => {
            setPasswordTarget(null);
            setPasswordData({ password: '', confirmPassword: '' });
            toast.success('Heslo bolo zmenené.');
        },
        onError: (err) => toast.error(apiErrorMessage(err)),
    });

    const handleAdd = (role: 'admin' | 'client') => {
        setEditingUser(null);
        setCreatingRole(role);
        setFormData({ email: '', password: '', first_name: '', last_name: '', is_active: true, annual_discount_percent: '0' });
        setIsModalOpen(true);
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setFormData({
            email: user.email,
            password: '',
            first_name: user.first_name ?? '',
            last_name: user.last_name ?? '',
            is_active: user.is_active,
            annual_discount_percent: String(user.annual_discount_percent ?? '0'),
        });
        setIsModalOpen(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingUser) {
            updateMutation.mutate({
                id: editingUser.id,
                data: {
                    is_active: formData.is_active,
                    annual_discount_percent: Number(formData.annual_discount_percent || 0),
                },
            });
        } else {
            createMutation.mutate({
                email: formData.email,
                password: formData.password,
                first_name: formData.first_name,
                last_name: formData.last_name,
                is_staff: creatingRole === 'admin',
                is_active: formData.is_active,
            });
        }
    };

    const handleOpenPasswordReset = (user: User) => {
        setPasswordTarget(user);
        setPasswordData({ password: '', confirmPassword: '' });
    };

    const handlePasswordReset = (e: React.FormEvent) => {
        e.preventDefault();
        if (!passwordTarget) return;
        if (passwordData.password !== passwordData.confirmPassword) {
            toast.error('Heslá sa nezhodujú.');
            return;
        }
        setPasswordMutation.mutate({ id: passwordTarget.id, password: passwordData.password });
    };

    useEffect(() => {
        if (!previewUser) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setPreviewUser(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [previewUser]);

    if (!canAccess) return null;

    if (isLoading) {
        return (
            <div className="min-h-screen" style={{ background: '#f6f8fb' }}>
                <AdminNav />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="mt-6 rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500" aria-live="polite">
                        Načítavam používateľov...
                    </div>
                </div>
            </div>
        );
    }

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    const renderTable = (list: User[], sectionTitle: string, role: 'admin' | 'client') => (
        <div className="mb-10">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-800">
                    {sectionTitle}
                    <span className="ml-2 text-sm font-normal text-gray-500">({list.length})</span>
                </h2>
                <button
                    onClick={() => handleAdd(role)}
                    className={`flex items-center text-white px-4 py-2 rounded-md font-medium shadow transition text-sm ${role === 'admin' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                    <PlusIcon className="w-4 h-4 mr-1.5" />
                    {role === 'admin' ? 'Pridať admina' : 'Pridať klienta'}
                </button>
            </div>
            <div className="bg-white shadow overflow-auto sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Meno</th>
                            <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Dátum registrácie</th>
                            <th className="relative px-4 py-3"><span className="sr-only">Akcie</span></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {list.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-400">
                                    Žiadni {role === 'admin' ? 'administrátori' : 'klienti'}
                                </td>
                            </tr>
                        )}
                        {list.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50 transition">
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${role === 'admin' ? 'bg-purple-100' : 'bg-blue-100'}`}>
                                            <span className={`font-bold text-base ${role === 'admin' ? 'text-purple-600' : 'text-blue-600'}`}>
                                                {(fullName(user) || user.email).charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="ml-3">
                                            <div className="font-medium text-gray-900 text-sm">{fullName(user) || '-'}</div>
                                            <div className="text-xs text-gray-500 sm:hidden">{user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="hidden sm:table-cell px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                    {user.email}
                                </td>
                                <td className="hidden md:table-cell px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                    {user.date_joined ? new Date(user.date_joined).toLocaleDateString('sk-SK') : '-'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => setPreviewUser(user)} className="text-slate-500 hover:text-slate-900 mr-3" title="Náhľad" aria-label={`Náhľad používateľa ${user.email}`}>
                                        <EyeIcon className="h-5 w-5" />
                                    </button>
                                    <button onClick={() => handleEdit(user)} className="text-blue-600 hover:text-blue-900 mr-3" title="Upraviť" aria-label={`Upraviť používateľa ${user.email}`}>
                                        <PencilIcon className="h-5 w-5" />
                                    </button>
                                    <button onClick={() => handleOpenPasswordReset(user)} className="text-amber-600 hover:text-amber-900 mr-3" title="Zmeniť heslo" aria-label={`Zmeniť heslo používateľa ${user.email}`}>
                                        <KeyIcon className="h-5 w-5" />
                                    </button>
                                    <button onClick={() => setDeleteTarget(user)} className="text-red-600 hover:text-red-900" title="Odstrániť" aria-label={`Odstrániť používateľa ${user.email}`}>
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const openCustomerOrders = (user: User) => {
        const query = fullName(user) || user.email;
        navigate(`/admin/orders?q=${encodeURIComponent(query)}`);
    };

    const renderTurnoverChart = (user: User) => {
        const monthly = user.turnover_monthly ?? [];
        const maxTurnover = Math.max(...monthly.map(item => item.turnover), 1);

        return (
            <div className="mt-5">
                <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Obrat po mesiacoch</span>
                    <ChartBarIcon className="h-4 w-4 text-[#2196f3]" />
                </div>
                <div className="flex h-28 items-end gap-1.5 rounded border border-gray-200 bg-gray-50 px-3 py-2">
                    {monthly.map((item) => (
                        <div key={item.month} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
                            <div
                                className="w-full rounded-t bg-[#eaf4fe]0"
                                style={{ height: `${Math.max((item.turnover / maxTurnover) * 100, item.turnover > 0 ? 8 : 2)}%` }}
                                title={`${item.month}: ${formatCurrency(item.turnover)}`}
                            />
                            <span className="text-[10px] text-gray-400">{item.month.slice(5)}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen" style={{ background: '#f6f8fb' }}>
            <AdminNav />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Správa používateľov</h1>
                    <p className="mt-2 text-sm text-gray-700">Administrátori a klienti sú spravovaní oddelene</p>
                </div>

                {renderTable(admins, 'Administrátori', 'admin')}
                {renderTable(clients, 'Klienti', 'client')}

                {isModalOpen && (
                    <div className="fixed inset-0 z-10 overflow-y-auto">
                        <div className="flex items-end sm:items-center justify-center min-h-screen px-4 pb-0 pt-4 sm:p-0">
                            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setIsModalOpen(false)}></div>
                            <div className="bg-white rounded-t-2xl sm:rounded-lg shadow-xl w-full max-w-md z-20 overflow-hidden transform transition-all flex flex-col max-h-[90dvh]">
                                <form onSubmit={handleSave} className="flex flex-col overflow-hidden">
                                    <div className="px-6 py-5 bg-white overflow-y-auto flex-1">
                                        <h3 className="text-lg font-bold text-gray-900 border-b pb-3 mb-4">
                                            {editingUser
                                                ? `Upraviť ${editingUser.is_staff ? 'admina' : 'klienta'}`
                                                : creatingRole === 'admin' ? 'Nový administrátor' : 'Nový klient'}
                                        </h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label htmlFor="admin-user-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                                <input
                                                    id="admin-user-email"
                                                    type="email"
                                                    required
                                                    value={formData.email}
                                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                                    disabled={!!editingUser}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label htmlFor="admin-user-first-name" className="block text-sm font-medium text-gray-700 mb-1">Meno</label>
                                                    <input
                                                        id="admin-user-first-name"
                                                        type="text"
                                                        required={!editingUser}
                                                        value={formData.first_name}
                                                        onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label htmlFor="admin-user-last-name" className="block text-sm font-medium text-gray-700 mb-1">Priezvisko</label>
                                                    <input
                                                        id="admin-user-last-name"
                                                        type="text"
                                                        required={!editingUser}
                                                        value={formData.last_name}
                                                        onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                </div>
                                            </div>
                                            {!editingUser && (
                                                <div>
                                                    <label htmlFor="admin-user-password" className="block text-sm font-medium text-gray-700 mb-1">Heslo</label>
                                                    <input
                                                        id="admin-user-password"
                                                        type="password"
                                                        required
                                                        value={formData.password}
                                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                </div>
                                            )}
                                            <div className="pt-2 border-t">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.is_active}
                                                        onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                                        className="text-blue-600 rounded"
                                                    />
                                                    <span className="text-sm text-gray-700">Aktívny účet</span>
                                                </label>
                                            </div>
                                            {editingUser && !editingUser.is_staff && (
                                                <div>
                                                    <label htmlFor="admin-user-discount" className="block text-sm font-medium text-gray-700 mb-1">
                                                        Zľava do konca roka
                                                    </label>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            id="admin-user-discount"
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            step="0.01"
                                                            value={formData.annual_discount_percent}
                                                            onChange={e => setFormData({ ...formData, annual_discount_percent: e.target.value })}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                                        />
                                                        <span className="text-sm text-gray-500">%</span>
                                                    </div>
                                                    <p className="mt-1 text-xs text-gray-500">
                                                        Uložením sa zľava nastaví pre aktuálny rok.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
                                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-100 transition">
                                            Zrušiť
                                        </button>
                                        <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition disabled:opacity-50">
                                            {isSubmitting ? 'Ukladám...' : editingUser ? 'Uložiť zmeny' : 'Vytvoriť'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {previewUser && (
                    <div className="fixed inset-0 z-[100] overflow-y-auto">
                        <div className="flex min-h-screen items-end justify-center px-4 pb-0 pt-4 sm:items-center sm:p-0">
                            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setPreviewUser(null)} />
                            <div
                                role="dialog"
                                aria-modal="true"
                                aria-labelledby="customer-preview-title"
                                className="z-[101] w-full max-w-2xl overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-lg"
                            >
                                <div className="px-6 py-5">
                                    <h3 id="customer-preview-title" className="text-lg font-bold text-gray-900">{fullName(previewUser) || previewUser.email}</h3>
                                    <p className="mt-1 text-sm text-gray-500">{previewUser.email}</p>
                                    {!previewUser.is_staff && (
                                        <div className="mt-5 rounded-lg border border-[rgba(33,150,243,0.15)] bg-[#eaf4fe]/60 p-4">
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                <div>
                                                    <dt className="text-xs font-semibold uppercase tracking-wide text-[#1565c0]">Obrat za 12 mesiacov</dt>
                                                    <dd className="mt-1 text-2xl font-bold text-gray-900">
                                                        {formatCurrency(previewUser.turnover_last_12_months)}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt className="text-xs font-semibold uppercase tracking-wide text-[#1565c0]">Aktuálna zľava</dt>
                                                    <dd className="mt-1 text-2xl font-bold text-gray-900">
                                                        {formatDiscount(previewUser.annual_discount_percent)}
                                                    </dd>
                                                    <p className="mt-1 text-xs text-gray-500">
                                                        {previewUser.annual_discount_valid_until
                                                            ? `Platí do ${new Date(previewUser.annual_discount_valid_until).toLocaleDateString('sk-SK')}`
                                                            : 'Bez aktívnej zľavy'}
                                                    </p>
                                                </div>
                                            </div>
                                            {renderTurnoverChart(previewUser)}
                                        </div>
                                    )}
                                    <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div>
                                            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Telefón</dt>
                                            <dd className="mt-1 text-sm text-gray-900">{previewUser.phone || '-'}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Registrácia</dt>
                                            <dd className="mt-1 text-sm text-gray-900">{previewUser.date_joined ? new Date(previewUser.date_joined).toLocaleDateString('sk-SK') : '-'}</dd>
                                        </div>
                                        <div className="sm:col-span-2">
                                            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Adresa</dt>
                                            <dd className="mt-1 text-sm text-gray-900">
                                                {[previewUser.street, [previewUser.postal_code, previewUser.city].filter(Boolean).join(' ')].filter(Boolean).join(', ') || '-'}
                                            </dd>
                                        </div>
                                        {previewUser.is_company && (
                                            <div className="sm:col-span-2">
                                                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Firma</dt>
                                                <dd className="mt-1 text-sm text-gray-900">
                                                    {[previewUser.company_name, previewUser.ico ? `IČO: ${previewUser.ico}` : '', previewUser.dic ? `DIČ: ${previewUser.dic}` : ''].filter(Boolean).join(' · ')}
                                                </dd>
                                            </div>
                                        )}
                                    </dl>
                                </div>
                                <div className="flex flex-wrap justify-end gap-2 bg-gray-50 px-6 py-4">
                                    <button type="button" onClick={() => setPreviewUser(null)} className="rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-100">
                                        Zavrieť
                                    </button>
                                    <button type="button" onClick={() => openCustomerOrders(previewUser)} className="rounded bg-[#2196f3] px-4 py-2 font-medium text-white hover:bg-[#1565c0]">
                                        Objednávky klienta
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {passwordTarget && (
                    <div className="fixed inset-0 z-[100] overflow-y-auto">
                        <div className="flex min-h-screen items-end justify-center px-4 pb-0 pt-4 sm:items-center sm:p-0">
                            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setPasswordTarget(null)} />
                            <div
                                role="dialog"
                                aria-modal="true"
                                aria-labelledby="password-reset-title"
                                className="z-[101] w-full max-w-md overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-lg"
                            >
                                <form onSubmit={handlePasswordReset}>
                                    <div className="px-6 py-5">
                                        <h3 id="password-reset-title" className="text-lg font-bold text-gray-900">Zmeniť heslo</h3>
                                        <p className="mt-1 text-sm text-gray-500">{passwordTarget.email}</p>
                                        <div className="mt-5 space-y-4">
                                            <div>
                                                <label htmlFor="admin-reset-password" className="block text-sm font-medium text-gray-700 mb-1">Nové heslo</label>
                                                <input
                                                    id="admin-reset-password"
                                                    type="password"
                                                    required
                                                    autoComplete="new-password"
                                                    value={passwordData.password}
                                                    onChange={e => setPasswordData({ ...passwordData, password: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="admin-reset-password-confirm" className="block text-sm font-medium text-gray-700 mb-1">Potvrdenie hesla</label>
                                                <input
                                                    id="admin-reset-password-confirm"
                                                    type="password"
                                                    required
                                                    autoComplete="new-password"
                                                    value={passwordData.confirmPassword}
                                                    onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3 bg-gray-50 px-6 py-4">
                                        <button type="button" onClick={() => setPasswordTarget(null)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-100 transition">
                                            Zrušiť
                                        </button>
                                        <button type="submit" disabled={setPasswordMutation.isPending} className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition disabled:opacity-50">
                                            {setPasswordMutation.isPending ? 'Ukladám...' : 'Uložiť heslo'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                <ConfirmModal
                    open={!!deleteTarget}
                    title="Odstrániť používateľa"
                    message={`Naozaj chcete odstrániť používateľa ${deleteTarget?.email}? Táto akcia je nevratná.`}
                    confirmLabel="Odstrániť"
                    onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
                    onCancel={() => setDeleteTarget(null)}
                    isPending={deleteMutation.isPending}
                />
            </div>
        </div>
    );
}
