import client from './client';

export interface LoginResponse {
    is_staff: boolean;
    email: string;
}

export const login = async (email: string, password: string): Promise<LoginResponse> => {
    const response = await client.post<LoginResponse>('/auth/login/', { email, password });
    return response.data;
};

export interface RegisterData {
    email: string;
    password: string;
    title?: string;
    first_name: string;
    last_name: string;
}

export const register = async (userData: RegisterData) => {
    const response = await client.post('/auth/register/', userData);
    return response.data;
};

export const verifyEmail = async (uid: string, token: string) => {
    const response = await client.post('/auth/verify-email/', { uid, token });
    return response.data;
};

export const resendVerification = async (email: string) => {
    const response = await client.post('/auth/resend-verification/', { email });
    return response.data;
};

export const requestPasswordReset = async (email: string) => {
    const response = await client.post('/auth/password-reset/request/', { email });
    return response.data;
};

export const confirmPasswordReset = async (uid: string, token: string, newPassword: string) => {
    const response = await client.post('/auth/password-reset/confirm/', { uid, token, new_password: newPassword });
    return response.data;
};

export interface MeResponse {
    id: number;
    email: string;
    title?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    street?: string;
    city?: string;
    postal_code?: string;
    country?: string;
    is_company?: boolean;
    company_name?: string;
    ico?: string;
    dic?: string;
    dic_dph?: string;
}

export const getMe = async (): Promise<MeResponse> => {
    const response = await client.get<MeResponse>('/auth/me/');
    return response.data;
}
export const deleteMe = async () => {
    const response = await client.delete('/auth/me/');
    return response.data;
}

export const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    await client.post('/auth/change-password/', { current_password: currentPassword, new_password: newPassword });
};

export const isAdmin = (): boolean => {
    try {
        const raw = localStorage.getItem('user_meta');
        if (!raw) return false;
        return (JSON.parse(raw) as { is_staff?: boolean }).is_staff === true;
    } catch {
        return false;
    }
}
