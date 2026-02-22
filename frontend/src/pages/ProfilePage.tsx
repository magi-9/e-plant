import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMe } from '../api/auth';
import client from '../api/client';
import toast from 'react-hot-toast';

export default function ProfilePage() {
    const queryClient = useQueryClient();

    const { data: userProfile, isLoading } = useQuery({
        queryKey: ['me'],
        queryFn: getMe,
    });

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        phone: '',
        street: '',
        city: '',
        postal_code: '',
        is_company: false,
        company_name: '',
        ico: '',
        dic: '',
    });

    useEffect(() => {
        if (userProfile) {
            setFormData({
                first_name: userProfile.first_name || '',
                last_name: userProfile.last_name || '',
                phone: userProfile.phone || '',
                street: userProfile.street || '',
                city: userProfile.city || '',
                postal_code: userProfile.postal_code || '',
                is_company: userProfile.is_company || false,
                company_name: userProfile.company_name || '',
                ico: userProfile.ico || '',
                dic: userProfile.dic || '',
            });
        }
    }, [userProfile]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const updateProfile = async (data: typeof formData) => {
        const response = await client.patch('/auth/me/', data);
        return response.data;
    };

    const mutation = useMutation({
        mutationFn: updateProfile,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['me'] });
            toast.success('Profil bol úspešne uložený!');
        },
        onError: () => {
            toast.error('Chyba pri ukladaní profilu.');
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate(formData);
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500">Načítavam dáta...</div>;

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Môj Profil</h1>

                <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
                    <h3 className="text-lg font-medium leading-6 text-gray-900 border-b pb-2">Osobné údaje</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Meno</label>
                            <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Priezvisko</label>
                            <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Telefón</label>
                            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md" />
                        </div>
                    </div>

                    <h3 className="text-lg font-medium leading-6 text-gray-900 border-b pb-2 mt-8">Adresa dodania / Fakturačná adresa</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Ulica a číslo</label>
                            <input type="text" name="street" value={formData.street} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Mesto</label>
                                <input type="text" name="city" value={formData.city} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">PSČ</label>
                                <input type="text" name="postal_code" value={formData.postal_code} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md" />
                            </div>
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <label className="flex items-center gap-2">
                            <input type="checkbox" name="is_company" checked={formData.is_company} onChange={handleChange} className="rounded text-blue-600 focus:ring-blue-500" />
                            <span className="text-sm text-gray-900 font-medium">Nakupujem na firmu</span>
                        </label>
                    </div>

                    {formData.is_company && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Názov firmy</label>
                                <input type="text" name="company_name" value={formData.company_name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">IČO</label>
                                    <input type="text" name="ico" value={formData.ico} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">DIČ / IČ DPH</label>
                                    <input type="text" name="dic" value={formData.dic} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md" />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end pt-4 border-t">
                        <button type="submit" disabled={mutation.isPending} className="px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition">
                            {mutation.isPending ? 'Ukladám...' : 'Uložiť profil'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
