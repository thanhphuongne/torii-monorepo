import { apiClient } from '../api-client';
import type { StandardApiResponse } from '@workspace/schemas';

function normalizeLinkedProviderIds(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((item) => {
            if (typeof item === 'string') return item;
            if (item && typeof item === 'object' && 'provider' in item) {
                const p = (item as { provider: unknown }).provider;
                return typeof p === 'string' ? p : '';
            }
            return '';
        })
        .filter((s): s is string => s.length > 0);
}

export const authApi = {
    /**
     * Resend verification email
     */
    async resendVerification(email: string): Promise<{ success: boolean; message: string }> {
        const response = await apiClient.post<StandardApiResponse<null>>('/api/auth/resend-verification', { email });
        return {
            success: response.data.success,
            message: response.data.message || '',
        };
    },

    async logout(): Promise<void> {
        await apiClient.post('/api/auth/logout');
    },

    async verifyResetToken(token: string): Promise<{ success: boolean; message?: string }> {
        const response = await apiClient.post<StandardApiResponse<{ email: string }>>('/api/auth/verify-reset-token', { token });
        return {
            success: response.data.success,
            message: response.data.message,
        };
    },

    async resetPassword(data: { token: string; password: string }): Promise<{ success: boolean; message?: string }> {
        const response = await apiClient.post<StandardApiResponse<null>>('/api/auth/reset-password', data);
        return {
            success: response.data.success,
            message: response.data.message,
        };
    },

    async changePassword(data: { oldPassword: string; newPassword: string }): Promise<{ success: boolean; message?: string }> {
        const response = await apiClient.post<StandardApiResponse<null>>('/api/auth/change-password', data);
        return {
            success: response.data.success,
            message: response.data.message,
        };
    },

    async forgotPassword(email: string): Promise<{ success: boolean; message?: string }> {
        const response = await apiClient.post<StandardApiResponse<null>>('/api/auth/forgot-password', { email });
        return {
            success: response.data.success,
            message: response.data.message,
        };
    },

    async verifyEmail(token: string): Promise<{ success: boolean; message?: string }> {
        const response = await apiClient.post<StandardApiResponse<{ email: string }>>('/api/auth/verify-email', { token });
        return {
            success: response.data.success,
            message: response.data.message,
        };
    },

    async googleAuth(idToken: string): Promise<{ user: any; accessToken?: string }> {
        const response = await apiClient.post<StandardApiResponse<{ user: any; access_token?: string }>>('/api/auth/google', { idToken });
        if (response.data.success && response.data.data) {
            return {
                user: response.data.data.user,
                accessToken: response.data.data.access_token,
            };
        }
        throw new Error(response.data.message || 'Google authentication failed');
    },

    /**
     * Facebook OAuth login/register
     */
    async facebookAuth(accessToken: string): Promise<{ user: any; accessToken?: string }> {
        const response = await apiClient.post<StandardApiResponse<{ user: any; access_token?: string }>>('/api/auth/facebook', { accessToken });
        if (response.data.success && response.data.data) {
            return {
                user: response.data.data.user,
                accessToken: response.data.data.access_token,
            };
        }
        throw new Error(response.data.message || 'Facebook authentication failed');
    },

    async verify2FA(data: { tempToken: string; code: string; backupCode?: boolean }): Promise<{ user: any }> {
        const response = await apiClient.post<StandardApiResponse<{ user: any }>>('/api/auth/login/verify-2fa', data);
        if (response.data.success && response.data.data?.user) {
            return { user: response.data.data.user };
        }
        throw new Error(response.data.message || 'Validation failed');
    },

    async getLinkedProviders(): Promise<{ providers: string[]; hasPassword: boolean }> {
        const response = await apiClient.get<StandardApiResponse<{ providers: unknown; hasPassword: boolean }>>('/api/auth/linked-providers');
        if (!response.data.success || !response.data.data) {
            throw new Error(response.data.message || 'Failed to load linked providers');
        }
        return {
            providers: normalizeLinkedProviderIds(response.data.data.providers),
            hasPassword: response.data.data.hasPassword || false,
        };
    },

    async unlinkProvider(provider: 'google' | 'facebook'): Promise<{ success: boolean; message?: string }> {
        const response = await apiClient.delete<StandardApiResponse<null>>(`/api/auth/link/${provider}`);
        return {
            success: response.data.success,
            message: response.data.message,
        };
    },

    async linkGoogle(idToken: string): Promise<{ success: boolean; message?: string }> {
        const response = await apiClient.post<StandardApiResponse<null>>('/api/auth/link/google', { idToken });
        return {
            success: response.data.success,
            message: response.data.message,
        };
    },

    async linkFacebook(accessToken: string): Promise<{ success: boolean; message?: string }> {
        const response = await apiClient.post<StandardApiResponse<null>>('/api/auth/link/facebook', { accessToken });
        return {
            success: response.data.success,
            message: response.data.message,
        };
    },
};

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * Hook: Logout
 */
export function useLogout() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => authApi.logout(),
        onSuccess: () => {
            queryClient.clear();
            // Additional cleanup if needed
        },
    });
}

/**
 * Hook: Resend Verification Email
 */
export function useResendVerification() {
    return useMutation({
        mutationFn: (email: string) => authApi.resendVerification(email),
    });
}

/**
 * Hook: Verify Reset Token
 */
export function useVerifyResetToken() {
    return useMutation({
        mutationFn: (token: string) => authApi.verifyResetToken(token),
    });
}

/**
 * Hook: Reset Password
 */
export function useResetPassword() {
    return useMutation({
        mutationFn: (data: { token: string; password: string }) => authApi.resetPassword(data),
    });
}

/**
 * Hook: Change Password (authenticated)
 */
export function useChangePassword() {
    return useMutation({
        mutationFn: (data: { oldPassword: string; newPassword: string }) => authApi.changePassword(data),
    });
}

/**
 * Hook: Forgot Password
 */
export function useForgotPassword() {
    return useMutation({
        mutationFn: (email: string) => authApi.forgotPassword(email),
    });
}

/**
 * Hook: Verify Email
 */
export function useVerifyEmail() {
    return useMutation({
        mutationFn: (token: string) => authApi.verifyEmail(token),
    });
}

/**
 * Hook: Google OAuth
 */
export function useGoogleAuth() {
    return useMutation({
        mutationFn: (idToken: string) => authApi.googleAuth(idToken),
    });
}

/**
 * Hook: Facebook OAuth
 */
export function useFacebookAuth() {
    return useMutation({
        mutationFn: (accessToken: string) => authApi.facebookAuth(accessToken),
    });
}

export function useLinkedProviders() {
    return useQuery({
        queryKey: ['linked-providers'],
        queryFn: () => authApi.getLinkedProviders(),
    });
}

export function useUnlinkProvider() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (provider: 'google' | 'facebook') => authApi.unlinkProvider(provider),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['linked-providers'] });
        },
    });
}

export function useLinkGoogle() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (idToken: string) => authApi.linkGoogle(idToken),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['linked-providers'] });
        },
    });
}

export function useLinkFacebook() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (accessToken: string) => authApi.linkFacebook(accessToken),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['linked-providers'] });
        },
    });
}
