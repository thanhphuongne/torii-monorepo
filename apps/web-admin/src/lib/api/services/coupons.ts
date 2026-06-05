import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/api-client.ts';
import type {
    StandardApiResponse,
    CouponResponseDTO,
    CouponCreateDTO,
    CouponUpdateDTO,
} from '@workspace/schemas';

export const couponsApi = {
    // GET /api/academy/coupons/admin
    async findAll(query?: any): Promise<any> {
        const response = await apiClient.get<StandardApiResponse<any>>('/api/academy/coupons/admin', { params: query });
        return response.data;
    },

    // GET /api/academy/coupons/admin/:id
    async findById(id: string): Promise<CouponResponseDTO> {
        const response = await apiClient.get<StandardApiResponse<CouponResponseDTO>>(`/api/academy/coupons/admin/${id}`);
        return response.data.data!;
    },

    // POST /api/academy/coupons/admin
    async create(data: CouponCreateDTO): Promise<CouponResponseDTO> {
        const response = await apiClient.post<StandardApiResponse<CouponResponseDTO>>('/api/academy/coupons/admin', data);
        return response.data.data!;
    },

    // PATCH /api/academy/coupons/admin/:id
    async update(id: string, data: CouponUpdateDTO): Promise<CouponResponseDTO> {
        const response = await apiClient.patch<StandardApiResponse<CouponResponseDTO>>(`/api/academy/coupons/admin/${id}`, data);
        return response.data.data!;
    },

    // DELETE /api/academy/coupons/admin/:id
    async delete(id: string): Promise<boolean> {
        const response = await apiClient.delete<StandardApiResponse<any>>(`/api/academy/coupons/admin/${id}`);
        return response.data.success;
    },

    // GET /api/coupons/statistics
    async getStatistics(): Promise<any> {
        const response = await apiClient.get<StandardApiResponse<{ statistics: any }>>('/api/coupons/statistics');
        return response.data.data!.statistics;
    }
};

// ============================================================================
// React Query Hooks
// ============================================================================

/**
 * Hook: Get coupons list with pagination and filters
 */
export function useCoupons(query?: any) {
    return useQuery({
        queryKey: ['coupons', query],
        queryFn: () => couponsApi.findAll(query),
        staleTime: 30000,
    });
}

/**
 * Hook: Get single coupon by ID
 */
export function useCoupon(id: string) {
    return useQuery({
        queryKey: ['coupons', id],
        queryFn: () => couponsApi.findById(id),
        enabled: !!id,
    });
}

/**
 * Hook: Create new coupon
 */
export function useCreateCoupon() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CouponCreateDTO) => couponsApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['coupons'] });
            queryClient.invalidateQueries({ queryKey: ['coupons-stats'] });
        },
    });
}

/**
 * Hook: Update coupon
 */
export function useUpdateCoupon() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: CouponUpdateDTO }) =>
            couponsApi.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['coupons', variables.id] });
            queryClient.invalidateQueries({ queryKey: ['coupons'] });
            queryClient.invalidateQueries({ queryKey: ['coupons-stats'] });
        },
    });
}

/**
 * Hook: Delete coupon
 */
export function useDeleteCoupon() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => couponsApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['coupons'] });
            queryClient.invalidateQueries({ queryKey: ['coupons-stats'] });
        },
    });
}

/**
 * Hook: Get coupon statistics
 */
export function useCouponStatistics() {
    return useQuery({
        queryKey: ['coupons-stats'],
        queryFn: () => couponsApi.getStatistics(),
        staleTime: 60000,
    });
}
