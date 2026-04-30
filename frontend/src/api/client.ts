import axios from 'axios';
import type { AxiosError, AxiosInstance } from 'axios';
import { authService, AuthService } from './authService';

const API_URL =
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? 'http://localhost:5002/api' : '/api');

const client = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

type ErrorWithConfig = AxiosError & {
    config?: {
        url?: string;
        _retry?: boolean;
        _skipAuthRefresh?: boolean;
    };
};

type RefreshService = Pick<AuthService, 'refreshAccessToken' | 'redirectToLogin'>;

export const shouldAttemptTokenRefresh = (error: ErrorWithConfig): boolean => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const requestUrl = originalRequest?.url || '';

    if (status !== 401) {
        return false;
    }

    if (!originalRequest || originalRequest._retry || originalRequest._skipAuthRefresh) {
        return false;
    }

    if (requestUrl.includes('/auth/refresh/') || requestUrl.includes('/auth/login/')) {
        return false;
    }

    return true;
};

export const createAuthRefreshErrorHandler = (
    apiClient: AxiosInstance,
    refreshService: RefreshService
) => async (error: ErrorWithConfig) => {
    const originalRequest = error.config;

    if (!shouldAttemptTokenRefresh(error) || !originalRequest) {
        return Promise.reject(error);
    }

    try {
        originalRequest._retry = true;
        await refreshService.refreshAccessToken();
        return apiClient(originalRequest);
    } catch (refreshError) {
        refreshService.redirectToLogin('/login');
        return Promise.reject(refreshError);
    }
};

client.interceptors.response.use(
    (response) => response,
    createAuthRefreshErrorHandler(client, authService)
);

export default client;
