import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PencilIcon, TrashIcon, ShieldCheckIcon, PlusIcon } from '@heroicons/react/24/outline';
import { getAdminUsers, toggleUserStaff, createAdminUser, updateAdminUser, deleteAdminUser, type User } from '../api/users';

export default function AdminUsers() {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formData, setFormData] = useState({ email: '', password: '', is_staff: false, is_active: true });

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

    const mutationOptions = {
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            setIsModalOpen(false);
        }
    };

    const toggleStaffMutation = useMutation({ mutationFn: toggleUserStaff, onSuccess: mutationOptions.onSuccess });
    const createMutation = useMutation({ mutationFn: createAdminUser, ...mutationOptions });
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number, data: Partial<User> }) => updateAdminUser(id, data),
        ...mutationOptions
    });
    const deleteMutation = useMutation({ mutationFn: deleteAdminUser, onSuccess: mutationOptions.onSuccess });

    const handleAdd = () => {
        setEditingUser(null);
        setFormData({ email: '', password: '', is_staff: false, is_active: true });
        setIsModalOpen(true);
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setFormData({ email: user.email, password: '', is_staff: user.is_staff, is_active: user.is_active });
        setIsModalOpen(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingUser) {
            updateMutation.mutate({ id: editingUser.id, data: { ...formData, id: editingUser.id } as Partial<User> });
        } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            createMutation.mutate(formData as any);
        }
    };

    const handleDelete = (userId: number) => {
        if (confirm('Naozaj chcete odstrániť tohto používateľa? Akcia je nevratná!')) {
            deleteMutation.mutate(userId);
        }
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500">Načítavam používateľov...</div>;

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="sm:flex sm:items-center sm:justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Správa používateľov</h1>
                        <p className="mt-2 text-sm text-gray-700">Zoznam všetkých používateľov systému</p>
                    </div>
                    <button onClick={handleAdd} className="mt-4 sm:mt-0 flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium shadow transition">
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Pridať
                    </button>
                </div>

                <div className="bg-white shadow overflow-auto sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rola</th>
                                <th scope="col" className="hidden sm:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th scope="col" className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Dátum reg.</th>
                                <th scope="col" className="relative px-4 py-3"><span className="sr-only">Akcie</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {usersList.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50 transition">
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                                <span className="text-blue-600 font-bold text-base sm:text-lg">{user.email.charAt(0).toUpperCase()}</span>
                                            </div>
                                            <div className="ml-3 font-medium text-gray-900 text-sm truncate max-w-[120px] sm:max-w-none">{user.email}</div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.is_staff ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {user.is_staff ? <><ShieldCheckIcon className="h-4 w-4 mr-1" /> Admin</> : "Používateľ"}
                                        </span>
                                    </td>
                                    <td className="hidden sm:table-cell px-4 py-3 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {user.is_active ? 'Aktívny' : 'Neaktívny'}
                                        </span>
                                    </td>
                                    <td className="hidden md:table-cell px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                        {user.date_joined ? new Date(user.date_joined).toLocaleDateString('sk-SK') : '-'}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => toggleStaffMutation.mutate(user.id)} className="text-purple-600 hover:text-purple-900 mr-3" title="Prepínač role">
                                            <ShieldCheckIcon className="h-5 w-5" />
                                        </button>
                                        <button onClick={() => handleEdit(user)} className="text-blue-600 hover:text-blue-900 mr-3" title="Upraviť">
                                            <PencilIcon className="h-5 w-5" />
                                        </button>
                                        <button onClick={() => handleDelete(user.id)} className="text-red-600 hover:text-red-900" title="Odstrániť">
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {isModalOpen && (
                    <div className="fixed inset-0 z-10 overflow-y-auto">
                        <div className="flex items-end sm:items-center justify-center min-h-screen px-4 pb-0 pt-4 sm:p-0">
                            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setIsModalOpen(false)}></div>
                            <div className="bg-white rounded-t-2xl sm:rounded-lg shadow-xl w-full max-w-md z-20 overflow-hidden transform transition-all flex flex-col max-h-[90dvh]">
                            <form onSubmit={handleSave} className="flex flex-col overflow-hidden">
                                    <div className="px-6 py-5 bg-white overflow-y-auto flex-1">
                                        <h3 className="text-lg font-bold text-gray-900 border-b pb-3 mb-4">
                                            {editingUser ? 'Upraviť používateľa' : 'Pridať používateľa'}
                                        </h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                                <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" disabled={!!editingUser} />
                                            </div>
                                            {!editingUser && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Heslo</label>
                                                    <input type="password" required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" />
                                                </div>
                                            )}
                                            <div className="flex items-center space-x-4 pt-2 border-t">
                                                <label className="flex items-center gap-2">
                                                    <input type="checkbox" checked={formData.is_staff} onChange={e => setFormData({ ...formData, is_staff: e.target.checked })} className="text-blue-600 rounded" />
                                                    <span className="text-sm text-gray-700">Je Administrátor</span>
                                                </label>
                                                <label className="flex items-center gap-2">
                                                    <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} className="text-blue-600 rounded" />
                                                    <span className="text-sm text-gray-700">Aktívny účet</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
                                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-100 transition">Zrušiť</button>
                                        <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition">
                                            {editingUser ? 'Uložiť zmeny' : 'Vytvoriť'}
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
