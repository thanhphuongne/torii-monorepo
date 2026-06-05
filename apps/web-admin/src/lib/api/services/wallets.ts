import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/api-client.ts';
import type {
    PaginatedApiResponse,
    StandardApiResponse,
} from '@workspace/schemas';

export interface WalletTransaction {
    id: string;
    userId: string;
    amount: number;
    type: 'DEPOSIT' | 'WITHDRAWAL' | 'PAYMENT' | 'REFUND';
    description?: string;
    createdAt: string;
}

export const walletsApi = {
    // GET /api/academy/wallet/:userId/balance
    async getUserBalance(userId: string): Promise<number> {
        const response = await apiClient.get<StandardApiResponse<number>>(`/api/academy/wallet/${userId}/balance`);
        if (response.data.success && response.data.data !== undefined) {
            return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to fetch wallet balance');
    },

    // GET /api/academy/wallet/:userId/transactions
    async getUserTransactions(userId: string, params: { page?: number; limit?: number }): Promise<PaginatedApiResponse<WalletTransaction>> {
        const response = await apiClient.get<PaginatedApiResponse<WalletTransaction>>(`/api/academy/wallet/${userId}/transactions`, { params });
        if (!response.data.success || !response.data.data) {
            throw new Error(response.data.message || 'Failed to fetch wallet transactions');
        }
        return response.data;
    },
};

export function useUserWalletBalance(userId: string) {
    return useQuery({
        queryKey: ['wallets', userId, 'balance'],
        queryFn: () => walletsApi.getUserBalance(userId),
        enabled: !!userId,
    });
}

export function useUserWalletTransactions(userId: string, params: { page?: number; limit?: number } = { page: 1, limit: 10 }) {
    return useQuery({
        queryKey: ['wallets', userId, 'transactions', params],
        queryFn: () => walletsApi.getUserTransactions(userId, params),
        enabled: !!userId,
    });
}
