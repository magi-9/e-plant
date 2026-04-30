import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from './authService';

vi.mock('axios', () => ({
    default: {
        post: vi.fn(),
    },
}));

type Deferred<T> = {
    promise: Promise<T>;
    resolve: (value: T) => void;
    reject: (reason?: unknown) => void;
};

const createDeferred = <T>(): Deferred<T> => {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
};

describe('AuthService', () => {
    const mockedAxios = vi.mocked(axios, { deep: true });

    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('queues concurrent refresh calls and performs a single refresh request', async () => {
        const deferred = createDeferred<{ data: object }>();
        mockedAxios.post.mockReturnValueOnce(deferred.promise);

        const service = new AuthService();

        const firstCall = service.refreshAccessToken();
        const secondCall = service.refreshAccessToken();

        expect(mockedAxios.post).toHaveBeenCalledTimes(1);

        deferred.resolve({ data: {} });

        await expect(firstCall).resolves.toBeUndefined();
        await expect(secondCall).resolves.toBeUndefined();
    });

    it('rejects queued requests and clears user_meta when refresh fails', async () => {
        const deferred = createDeferred<never>();
        mockedAxios.post.mockReturnValueOnce(deferred.promise);

        localStorage.setItem('user_meta', JSON.stringify({ is_staff: false, email: 'test@test.com' }));
        const service = new AuthService();

        const firstCall = service.refreshAccessToken();
        const secondCall = service.refreshAccessToken();

        const refreshError = new Error('refresh failed');
        deferred.reject(refreshError);

        await expect(firstCall).rejects.toThrow('refresh failed');
        await expect(secondCall).rejects.toThrow('refresh failed');
        expect(localStorage.getItem('user_meta')).toBeNull();
    });

    it('returns user meta from localStorage', () => {
        const service = new AuthService();
        service.setUserMeta({ is_staff: true, email: 'admin@test.com' });
        expect(service.getUserMeta()).toEqual({ is_staff: true, email: 'admin@test.com' });
        expect(service.isAuthenticated()).toBe(true);
    });

    it('clearUserMeta removes user_meta from localStorage', () => {
        const service = new AuthService();
        service.setUserMeta({ is_staff: false, email: 'user@test.com' });
        service.clearUserMeta();
        expect(service.getUserMeta()).toBeNull();
        expect(service.isAuthenticated()).toBe(false);
    });
});
