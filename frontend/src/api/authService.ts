import axios from 'axios';

const API_URL =
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? 'http://localhost:5002/api' : '/api');

type PendingRefreshRequest = {
    resolve: (token: string) => void;
    reject: (reason?: unknown) => void;
};

export class AuthService {
    private isRefreshing = false;
    private pendingRefreshRequests: PendingRefreshRequest[] = [];

    getAccessToken(): string | null {
        return localStorage.getItem('access_token');
    }

    getRefreshToken(): string | null {
        return localStorage.getItem('refresh_token');
    }

    setAccessToken(token: string): void {
        localStorage.setItem('access_token', token);
    }

    clearTokens(): void {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
    }

    redirectToLogin(path = '/login'): void {
        window.location.href = path;
    }

    async refreshAccessToken(): Promise<string> {
        const refreshToken = this.getRefreshToken();

        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
                this.pendingRefreshRequests.push({ resolve, reject });
            });
        }

        this.isRefreshing = true;

        try {
            const response = await axios.post(
                `${API_URL}/auth/refresh/`,
                { refresh: refreshToken },
                { _skipAuthRefresh: true }
            );

            const accessToken = response.data?.access;
            if (!accessToken) {
                throw new Error('Refresh endpoint did not return access token');
            }

            this.setAccessToken(accessToken);
            this.resolvePendingQueue(accessToken);
            return accessToken;
        } catch (error) {
            this.clearTokens();
            this.rejectPendingQueue(error);
            throw error;
        } finally {
            this.isRefreshing = false;
        }
    }

    private resolvePendingQueue(token: string): void {
        this.pendingRefreshRequests.forEach(({ resolve }) => resolve(token));
        this.pendingRefreshRequests = [];
    }

    private rejectPendingQueue(error: unknown): void {
        this.pendingRefreshRequests.forEach(({ reject }) => reject(error));
        this.pendingRefreshRequests = [];
    }
}

export const authService = new AuthService();