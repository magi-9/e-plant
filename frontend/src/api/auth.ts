import client from './client';

export interface LoginResponse {
    access: string;
    refresh: string;
}

export const login = async (username: string, password: string): Promise<LoginResponse> => {
    const response = await client.post<LoginResponse>('/auth/login/', { username, password });
    return response.data;
};

export const register = async (userData: any) => {
    const response = await client.post('/auth/register/', userData);
    return response.data;
};

export const getMe = async () => {
    const response = await client.get('/auth/me/');
    return response.data;
}
