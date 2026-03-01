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
        const deferred = createDeferred<{ data: { access: string } }>();
        mockedAxios.post.mockReturnValueOnce(deferred.promise);

        localStorage.setItem('refresh_token', 'refresh-token-1');
        const service = new AuthService();

        const firstCall = service.refreshAccessToken();
        const secondCall = service.refreshAccessToken();

        expect(mockedAxios.post).toHaveBeenCalledTimes(1);

        deferred.resolve({ data: { access: 'new-access-token' } });

        await expect(firstCall).resolves.toBe('new-access-token');
        await expect(secondCall).resolves.toBe('new-access-token');
        expect(localStorage.getItem('access_token')).toBe('new-access-token');
    });

    it('rejects queued requests and clears tokens when refresh fails', async () => {
        const deferred = createDeferred<never>();
        mockedAxios.post.mockReturnValueOnce(deferred.promise);

        localStorage.setItem('refresh_token', 'refresh-token-2');
        localStorage.setItem('access_token', 'old-access-token');
        const service = new AuthService();

        const firstCall = service.refreshAccessToken();
        const secondCall = service.refreshAccessToken();

        const refreshError = new Error('refresh failed');
        deferred.reject(refreshError);

        await expect(firstCall).rejects.toThrow('refresh failed');
        await expect(secondCall).rejects.toThrow('refresh failed');
        expect(localStorage.getItem('access_token')).toBeNull();
        expect(localStorage.getItem('refresh_token')).toBeNull();
    });
});