import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api-client';
import type {
    AcademyEnrollmentModel,
    AcademyEnrollmentQueryDTO,
    StandardApiResponse,
    PaginatedApiResponse,
} from '@workspace/schemas';

export const academyEnrollmentApi = {
    /**
     * Get current user's enrollments
     */
    async getMyEnrollments(query?: AcademyEnrollmentQueryDTO): Promise<PaginatedApiResponse<AcademyEnrollmentModel>> {
        const response = await apiClient.get<StandardApiResponse<{ items: AcademyEnrollmentModel[]; total: number; page: number; limit: number; totalPages: number }>>(
            '/api/academy/enrollments/me',
            { params: query }
        );
        const data = response.data.data!;
        return {
            success: response.data.success,
            data: data.items,
            total: data.total,
            page: data.page,
            limit: data.limit,
            totalPages: data.totalPages
        };
    },

    /**
     * Get enrollment by ID
     */
    async findById(id: string): Promise<AcademyEnrollmentModel> {
        const response = await apiClient.get<StandardApiResponse<{ item: AcademyEnrollmentModel }>>(`/api/academy/enrollments/${id}`);
        return response.data.data!.item;
    },

    /**
     * Kiểm tra enrollment theo UUID của LiveClass hoặc VodPackage (không phải courseProfileId).
     * Với trang marketing theo profile, dùng getMyEnrollments + lọc courseProfileId.
     */
    async checkEnrollment(deliveryTargetId: string): Promise<{ isEnrolled: boolean; enrollment?: AcademyEnrollmentModel }> {
        const response = await apiClient.get<StandardApiResponse<{ items: AcademyEnrollmentModel[] }>>(
            '/api/academy/enrollments/me',
            { params: { deliveryTargetId, limit: 1 } }
        );
        const enrollment = response.data.data?.items?.[0];

        // Ensure the enrollment is active or completed, not CANCELLED or EXPIRED
        const isValid = enrollment && (enrollment.status === 'ACTIVE' || enrollment.status === 'COMPLETED');

        return {
            isEnrolled: !!isValid,
            enrollment: isValid ? enrollment : undefined
        };
    },

    /**
     * Check if a recipient is eligible for a gift (registered but not enrolled)
     */
    async checkGiftRecipient(recipientEmail: string, courseId: string): Promise<{ isEnrolled: boolean; isRegistered: boolean; recipientName?: string }> {
        const response = await apiClient.get<StandardApiResponse<{ isEnrolled: boolean; isRegistered: boolean; recipientName?: string }>>(
            '/api/academy/enrollments/check-gift-recipient',
            { params: { recipientEmail, courseId } }
        );
        return response.data.data!;
    },
};

/**
 * Hook: Get paginated enrollments for current user
 */
export function useMyEnrollments(query?: AcademyEnrollmentQueryDTO) {
    return useQuery({
        queryKey: ['academy-enrollments', 'me', query],
        queryFn: () => academyEnrollmentApi.getMyEnrollments(query),
    });
}

/**
 * Hook: Get academy enrollment by ID
 */
export function useAcademyEnrollment(id?: string) {
    return useQuery({
        queryKey: ['academy-enrollments', 'id', id],
        queryFn: () => academyEnrollmentApi.findById(id!),
        enabled: !!id,
    });
}

/**
 * Hook: Check enrollment status for a class
 */
export function useAcademyEnrollmentCheck(deliveryTargetId: string) {
    return useQuery({
        queryKey: ['academy-enrollments', 'check', deliveryTargetId],
        queryFn: () => academyEnrollmentApi.checkEnrollment(deliveryTargetId),
        enabled: !!deliveryTargetId,
    });
}
