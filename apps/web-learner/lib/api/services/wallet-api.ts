import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api-client';
import type {
    StandardApiResponse,
    PaginatedApiResponse,
} from '@workspace/schemas';

export interface WalletTransaction {
    id: string;
    userId: string;
    type: 'REFUND' | 'PURCHASE' | 'BONUS';
    amount: number;
    description: string;
    metadata?: any;
    createdAt: string;
}

export const walletApi = {
    /**
     * Get wallet balance
     */
    async getBalance(): Promise<number> {
        const response = await apiClient.get<StandardApiResponse<number>>('/api/academy/wallet/balance');
        return response.data.data ?? 0;
    },

    /**
     * Get wallet transactions
     */
    async getTransactions(query?: { page?: number; limit?: number }): Promise<PaginatedApiResponse<WalletTransaction>> {
        const response = await apiClient.get<PaginatedApiResponse<WalletTransaction>>('/api/academy/wallet/transactions', {
            params: query,
        });
        return response.data;
    },
};

/**
 * Hook: Get wallet balance
 */
export function useWalletBalance() {
    return useQuery({
        queryKey: ['wallet', 'balance'],
        queryFn: () => walletApi.getBalance(),
    });
}

/**
 * Hook: Get wallet transactions
 */
export function useWalletTransactions(query?: { page?: number; limit?: number }) {
    return useQuery({
        queryKey: ['wallet', 'transactions', query],
        queryFn: () => walletApi.getTransactions(query),
    });
}
