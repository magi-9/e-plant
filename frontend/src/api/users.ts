import client from './client';

export interface User {
    id: number;
    email: string;
    title?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    street?: string;
    city?: string;
    postal_code?: string;
    is_company?: boolean;
    company_name?: string;
    ico?: string;
    dic?: string;
    is_staff: boolean;
    is_active: boolean;
    date_joined: string;
}

export const getAdminUsers = async (): Promise<User[]> => {
    const response = await client.get<User[]>('/auth/admin/users/');
    return response.data;
};

export const toggleUserStaff = async (userId: number): Promise<User> => {
    const response = await client.patch<User>(`/auth/admin/users/${userId}/toggle-staff/`, {});
    return response.data;
};

export const createAdminUser = async (data: Partial<User> & { password?: string }): Promise<User> => {
    const response = await client.post<User>('/auth/admin/users/create/', data);
    return response.data;
};

export const updateAdminUser = async (id: number, data: Partial<User>): Promise<User> => {
    const response = await client.patch<User>(`/auth/admin/users/${id}/`, data);
    return response.data;
};

export const deleteAdminUser = async (id: number): Promise<void> => {
    await client.delete(`/auth/admin/users/${id}/delete/`);
};
