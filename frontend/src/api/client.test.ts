import type { AxiosError } from 'axios';
import { describe, expect, it, vi } from 'vitest';

import { createAuthRefreshErrorHandler, shouldAttemptTokenRefresh } from './client';

type MockRefreshService = {
    refreshAccessToken: ReturnType<typeof vi.fn>;
    redirectToLogin: ReturnType<typeof vi.fn>;
};

const createError = (overrides?: {
    status?: number;
    url?: string;
    retry?: boolean;
    skip?: boolean;
}): AxiosError & {
    config: {
        url: string;
        _retry?: boolean;
        _skipAuthRefresh?: boolean;
        headers: Record<string, string>;
    };
} => {
    const status = overrides?.status ?? 401;
    return {
        response: { status },
        config: {
            url: overrides?.url ?? '/orders/',
            _retry: overrides?.retry,
            _skipAuthRefresh: overrides?.skip,
            headers: {},
        },
    } as AxiosError & {
        config: {
            url: string;
            _retry?: boolean;
            _skipAuthRefresh?: boolean;
            headers: Record<string, string>;
        };
    };
};

describe('API refresh interceptor', () => {
    it('prevents refresh retry for refresh endpoint requests', () => {
        const refreshError = createError({ url: '/auth/refresh/' });
        expect(shouldAttemptTokenRefresh(refreshError)).toBe(false);
    });

    it('prevents refresh retry when _skipAuthRefresh flag is set', () => {
        const skipError = createError({ skip: true });
        expect(shouldAttemptTokenRefresh(skipError)).toBe(false);
    });

    it('refreshes token and retries original request once', async () => {
        const apiClient = vi.fn().mockResolvedValue({ data: { ok: true } });
        const refreshService: MockRefreshService = {
            refreshAccessToken: vi.fn().mockResolvedValue('token-after-refresh'),
            redirectToLogin: vi.fn(),
        };
        const handler = createAuthRefreshErrorHandler(
            apiClient as never,
            refreshService as never
        );

        const error = createError({ url: '/products/' });
        const response = await handler(error);

        expect(refreshService.refreshAccessToken).toHaveBeenCalledTimes(1);
        expect(error.config._retry).toBe(true);
        expect(error.config.headers.Authorization).toBe('Bearer token-after-refresh');
        expect(apiClient).toHaveBeenCalledWith(error.config);
        expect(response).toEqual({ data: { ok: true } });
    });

    it('redirects to login when refresh fails', async () => {
        const apiClient = vi.fn();
        const refreshService: MockRefreshService = {
            refreshAccessToken: vi.fn().mockRejectedValue(new Error('expired refresh')),
            redirectToLogin: vi.fn(),
        };
        const handler = createAuthRefreshErrorHandler(
            apiClient as never,
            refreshService as never
        );

        await expect(handler(createError({ url: '/orders/' }))).rejects.toThrow(
            'expired refresh'
        );
        expect(refreshService.redirectToLogin).toHaveBeenCalledWith('/login');
        expect(apiClient).not.toHaveBeenCalled();
    });
});