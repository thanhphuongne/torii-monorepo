import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/api-client.ts';
import type { StandardApiResponse } from '@workspace/schemas';

export const aiSubscriptionsApi = {
    // GET /api/agents/admin/subscriptions/plans
    async getPlans(): Promise<any[]> {
        const response = await apiClient.get<StandardApiResponse<any[]>>('/api/agents/admin/subscriptions/plans');
        return response.data.data || [];
    },

    // PATCH /api/agents/admin/subscriptions/plans/:id
    async updatePlan(id: string, data: any): Promise<any> {
        const response = await apiClient.patch<StandardApiResponse<any>>(`/api/agents/admin/subscriptions/plans/${id}`, data);
        return response.data;
    },

    // GET /api/agents/admin/subscriptions/user-subscriptions
    async getUserSubscriptions(params: {
        page: number;
        limit: number;
        search?: string;
        planCode?: string;
    }): Promise<any> {
        const response = await apiClient.get<StandardApiResponse<any>>('/api/agents/admin/subscriptions/user-subscriptions', { params });
        return response.data.data;
    },
};

// ============================================================================
// React Query Hooks
// ============================================================================

export function useAiSubscriptionPlans() {
    return useQuery({
        queryKey: ['ai-subscription-plans'],
        queryFn: () => aiSubscriptionsApi.getPlans(),
    });
}

export function useUpdateAiSubscriptionPlan() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            aiSubscriptionsApi.updatePlan(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ai-subscription-plans'] });
        },
    });
}

export function useAiUserSubscriptions(params: {
    page: number;
    limit: number;
    search?: string;
    planCode?: string;
}) {
    return useQuery({
        queryKey: ['ai-user-subscriptions', params],
        queryFn: () => aiSubscriptionsApi.getUserSubscriptions(params),
    });
}
