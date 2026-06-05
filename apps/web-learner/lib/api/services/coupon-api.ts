import { CouponValidateRequestDTO, CouponValidateResponseDTO } from '@workspace/schemas'
import { apiClient } from '../api-client'

export const couponApi = {
    /**
     * Validate a coupon code
     */
    validateCoupon: async (data: CouponValidateRequestDTO): Promise<CouponValidateResponseDTO> => {
        const response = await apiClient.post<any>('/api/academy/coupons/validate', data)
        return response.data.data
    },

    /**
     * Get user's owned coupons (from rewards redemption)
     */
    getMyCoupons: async (): Promise<any[]> => {
        const response = await apiClient.get<any>('/api/academy/coupons/my-coupons')
        return response.data?.data || []
    }
}

import { useQuery } from '@tanstack/react-query'

/**
 * Hook: Get user's coupons
 */
export const useMyCoupons = (enabled: boolean = true) => {
    return useQuery({
        queryKey: ['my-coupons'],
        queryFn: () => couponApi.getMyCoupons(),
        enabled,
        staleTime: 30000, // 30 seconds
    })
}

