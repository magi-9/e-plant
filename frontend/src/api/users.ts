import client from './client';

export interface User {
    id: number;
    username: string;
    email: string;
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
