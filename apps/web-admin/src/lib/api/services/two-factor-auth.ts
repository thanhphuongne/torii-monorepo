import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/api-client.ts';
import type {
    StandardApiResponse,
    TwoFactorAuthStatus,
    TotpSetupResponse,
    EnableTotpResponse,
    EnableTotpDTO,
    Disable2FADTO,
} from '@workspace/schemas';

// ============================================================================
// API Functions
// ============================================================================

export const twoFactorAuthApi = {
    // GET /api/auth/2fa/status
    async getStatus(): Promise<TwoFactorAuthStatus> {
        const response = await apiClient.get<StandardApiResponse<TwoFactorAuthStatus>>('/api/auth/2fa/status');
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to fetch 2FA status');
    },

    // POST /api/auth/2fa/totp/generate
    async generateTotpSecret(): Promise<TotpSetupResponse> {
        const response = await apiClient.post<StandardApiResponse<TotpSetupResponse>>('/api/auth/2fa/totp/generate');
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to generate TOTP secret');
    },

    // POST /api/auth/2fa/totp/enable
    async enableTotp(dto: EnableTotpDTO): Promise<EnableTotpResponse> {
        const response = await apiClient.post<StandardApiResponse<EnableTotpResponse>>('/api/auth/2fa/totp/enable', dto);
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to enable 2FA');
    },

    // POST /api/auth/2fa/totp/disable
    async disableTotp(dto: Disable2FADTO): Promise<void> {
        const response = await apiClient.post<StandardApiResponse<void>>('/api/auth/2fa/totp/disable', dto);
        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to disable 2FA');
        }
    },

    // POST /api/auth/2fa/backup-codes/regenerate
    async regenerateBackupCodes(): Promise<string[]> {
        const response = await apiClient.post<StandardApiResponse<{ backupCodes: string[] }>>('/api/auth/2fa/backup-codes/regenerate');
        if (response.data.success && response.data.data) {
            return response.data.data.backupCodes;
        }
        throw new Error(response.data.message || 'Failed to regenerate backup codes');
    },

    // POST /api/auth/2fa/totp/verify (for login flow)
    async verifyTotp(code: string): Promise<boolean> {
        const response = await apiClient.post<StandardApiResponse<{ valid: boolean }>>('/api/auth/2fa/totp/verify', { code });
        if (response.data.success && response.data.data) {
            return response.data.data.valid;
        }
        return false;
    },
};

// ============================================================================
// React Query Hooks
// ============================================================================

/**
 * Hook: Get 2FA status
 */
export function use2FAStatus() {
    return useQuery({
        queryKey: ['2fa', 'status'],
        queryFn: () => twoFactorAuthApi.getStatus(),
        staleTime: 60000, // 1 minute
    });
}

/**
 * Hook: Generate TOTP secret
 */
export function useGenerateTotpSecret() {
    return useMutation({
        mutationFn: () => twoFactorAuthApi.generateTotpSecret(),
    });
}

/**
 * Hook: Enable TOTP 2FA
 */
export function useEnableTotp() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (dto: EnableTotpDTO) => twoFactorAuthApi.enableTotp(dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['2fa', 'status'] });
        },
    });
}

/**
 * Hook: Disable 2FA
 */
export function useDisableTotp() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (dto: Disable2FADTO) => twoFactorAuthApi.disableTotp(dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['2fa', 'status'] });
        },
    });
}

/**
 * Hook: Regenerate backup codes
 */
export function useRegenerateBackupCodes() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => twoFactorAuthApi.regenerateBackupCodes(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['2fa', 'status'] });
        },
    });
}

/**
 * Hook: Verify TOTP code (for login)
 */
export function useVerifyTotp() {
    return useMutation({
        mutationFn: (code: string) => twoFactorAuthApi.verifyTotp(code),
    });
}
