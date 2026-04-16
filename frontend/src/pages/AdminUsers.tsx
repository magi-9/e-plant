import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import { getAdminUsers, createAdminUser, updateAdminUser, deleteAdminUser, type User } from '../api/users';
import AdminNav from '../components/AdminNav';
import ConfirmModal from '../components/ConfirmModal';

export default function AdminUsers() {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [creatingRole, setCreatingRole] = useState<'admin' | 'client'>('client');
    const [formData, setFormData] = useState({ email: '', password: '', is_active: true });
    const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

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

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-users'], exact: false });

    const createMutation = useMutation({
        mutationFn: createAdminUser,
        onSuccess: () => { invalidate(); setIsModalOpen(false); }
    });
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<User> }) => updateAdminUser(id, data),
        onSuccess: () => { invalidate(); setIsModalOpen(false); }
    });
    const deleteMutation = useMutation({
        mutationFn: deleteAdminUser,
        onSuccess: () => { invalidate(); setDeleteTarget(null); }
    });

    const handleAdd = (role: 'admin' | 'client') => {
        setEditingUser(null);
        setCreatingRole(role);
        setFormData({ email: '', password: '', is_active: true });
        setIsModalOpen(true);
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setFormData({ email: user.email, password: '', is_active: user.is_active });
        setIsModalOpen(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingUser) {
            updateMutation.mutate({ id: editingUser.id, data: { is_active: formData.is_active } });
        } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            createMutation.mutate({ email: formData.email, password: formData.password, is_staff: creatingRole === 'admin', is_active: formData.is_active } as any);
        }
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500">Načítavam používateľov...</div>;

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
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Dátum registrácie</th>
                            <th className="relative px-4 py-3"><span className="sr-only">Akcie</span></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {list.length === 0 && (
                            <tr>
                                <td colSpan={3} className="px-4 py-6 text-center text-sm text-gray-400">
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
                                                {user.email.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="ml-3 font-medium text-gray-900 text-sm">{user.email}</div>
                                    </div>
                                </td>
                                <td className="hidden md:table-cell px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                    {user.date_joined ? new Date(user.date_joined).toLocaleDateString('sk-SK') : '-'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => handleEdit(user)} className="text-blue-600 hover:text-blue-900 mr-3" title="Upraviť">
                                        <PencilIcon className="h-5 w-5" />
                                    </button>
                                    <button onClick={() => setDeleteTarget(user)} className="text-red-600 hover:text-red-900" title="Odstrániť">
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

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <AdminNav />
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
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                                <input
                                                    type="email"
                                                    required
                                                    value={formData.email}
                                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                                    disabled={!!editingUser}
                                                />
                                            </div>
                                            {!editingUser && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Heslo</label>
                                                    <input
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
                                        </div>
                                    </div>
                                    <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
                                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-100 transition">
                                            Zrušiť
                                        </button>
                                        <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition disabled:opacity-50">
                                            {editingUser ? 'Uložiť zmeny' : 'Vytvoriť'}
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
