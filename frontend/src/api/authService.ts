import axios from 'axios';

const API_URL =
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? 'http://localhost:5002/api' : '/api');

const USER_META_KEY = 'user_meta';

export type UserMeta = { is_staff: boolean; email: string };

type PendingRefreshRequest = {
    resolve: () => void;
    reject: (reason?: unknown) => void;
};

export class AuthService {
    private isRefreshing = false;
    private pendingRefreshRequests: PendingRefreshRequest[] = [];

    getUserMeta(): UserMeta | null {
        try {
            const raw = localStorage.getItem(USER_META_KEY);
            return raw ? (JSON.parse(raw) as UserMeta) : null;
        } catch {
            return null;
        }
    }

    setUserMeta(meta: UserMeta): void {
        localStorage.setItem(USER_META_KEY, JSON.stringify(meta));
    }

    clearUserMeta(): void {
        localStorage.removeItem(USER_META_KEY);
    }

    isAuthenticated(): boolean {
        return this.getUserMeta() !== null;
    }

    redirectToLogin(path = '/login'): void {
        window.location.href = path;
    }

    async refreshAccessToken(): Promise<void> {
        if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
                this.pendingRefreshRequests.push({ resolve, reject });
            });
        }

        this.isRefreshing = true;

        try {
            await axios.post(
                `${API_URL}/auth/refresh/`,
                {},
                { withCredentials: true, _skipAuthRefresh: true } as object
            );
            this.resolvePendingQueue();
        } catch (error) {
            this.clearUserMeta();
            this.rejectPendingQueue(error);
            throw error;
        } finally {
            this.isRefreshing = false;
        }
    }

    async logout(): Promise<void> {
        try {
            await axios.post(`${API_URL}/auth/logout/`, {}, { withCredentials: true });
        } catch {
            // ignore errors — cookies will expire naturally
        }
        this.clearUserMeta();
    }

    private resolvePendingQueue(): void {
        this.pendingRefreshRequests.forEach(({ resolve }) => resolve());
        this.pendingRefreshRequests = [];
    }

    private rejectPendingQueue(error: unknown): void {
        this.pendingRefreshRequests.forEach(({ reject }) => reject(error));
        this.pendingRefreshRequests = [];
    }
}

export const authService = new AuthService();
