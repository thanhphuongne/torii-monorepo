import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
    AcademyCourseReviewAdminQueryDTO,
    AcademyCourseReviewModerateDTO,
    StandardApiResponse,
} from '@workspace/schemas';
import { apiClient } from '../api-client';

const API_ROOT = '/api/academy/reviews/admin';

export type AcademyCourseReviewAdminItem = {
    id: string;
    rating: number;
    title?: string | null;
    content?: string | null;
    status: string;
    isAnonymous: boolean;
    createdAt: string;
    user: {
        id: string;
        displayName: string;
        avatarUrl?: string | null;
    };
    liveClassId?: string | null;
    vodPackageId?: string | null;
}

export const academyCourseReviewsAdminClient = {
    /** Admin: List reviews with filters */
    listReviews: async (query?: AcademyCourseReviewAdminQueryDTO) => {
        const res = await apiClient.get<StandardApiResponse<{
            items: AcademyCourseReviewAdminItem[];
            total: number;
            limit: number;
            offset: number;
        }>>(API_ROOT, {
            params: query,
        });
        return res.data.data!;
    },

    /** Admin: Moderate a review (publish, hide, reject) */
    moderateReview: async (id: string, dto: AcademyCourseReviewModerateDTO) => {
        const res = await apiClient.post<StandardApiResponse<AcademyCourseReviewAdminItem>>(
            `${API_ROOT}/${id}/moderate`,
            dto,
        );
        return res.data.data!;
    },
};

export const academyCourseReviewsAdminHooks = {
    useListReviews: (query?: AcademyCourseReviewAdminQueryDTO) => {
        return useQuery({
            queryKey: ['admin-course-reviews', query],
            queryFn: () => academyCourseReviewsAdminClient.listReviews(query),
        });
    },

    useModerateReview: () => {
        const qc = useQueryClient();
        return useMutation({
            mutationFn: ({ id, dto }: { id: string; dto: AcademyCourseReviewModerateDTO }) =>
                academyCourseReviewsAdminClient.moderateReview(id, dto),
            onSuccess: () => {
                qc.invalidateQueries({ queryKey: ['admin-course-reviews'] });
            },
        });
    },
};
