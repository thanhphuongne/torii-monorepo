import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
    AcademyCourseReviewCreateDTO,
    AcademyCourseReviewUpdateDTO,
    AcademyCourseReviewQueryDTO,
} from '@workspace/schemas';
import { apiClient } from '../api-client';

export interface ClassReview {
    id: string;
    rating: number;
    title?: string;
    content?: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    publishedAt?: string;
    liveClassId?: string | null;
    vodPackageId?: string | null;
    enrollmentId?: string | null;
    user: {
        id: string | null;
        displayName: string;
        avatarUrl: string | null;
    };
    class?: {
        id: string;
        name: string;
        courseProfile?: {
            id: string;
            title: string;
            thumbnailUrl?: string;
        };
    };
}

interface ClassReviewListResponse {
    data: {
        items: ClassReview[];
        total: number;
        limit: number;
        offset: number;
    };
}

interface ClassReviewMyListResponse {
    data: ClassReview[];
}

export const academyClassReviewsClient = {
    /** Public: List reviews for a specific LIVE class */
    listByLiveClass: async (
        liveClassId: string,
        query?: AcademyCourseReviewQueryDTO,
    ) => {
        return apiClient.get<ClassReviewListResponse>(
            `/api/academy/reviews/live-classes/${liveClassId}`,
            { params: query },
        );
    },

    /** Public: List reviews for a VOD package */
    listByVodPackage: async (
        vodPackageId: string,
        query?: AcademyCourseReviewQueryDTO,
    ) => {
        return apiClient.get<ClassReviewListResponse>(
            `/api/academy/reviews/vod-packages/${vodPackageId}`,
            { params: query },
        );
    },

    /** Auth: List current user's reviews */
    listMine: async () => {
        return apiClient.get<ClassReviewMyListResponse>(
            '/api/academy/reviews/me',
        );
    },

    /** Auth: Create review */
    create: async (liveClassId: string, dto: AcademyCourseReviewCreateDTO) => {
        return apiClient.post<{ data: ClassReview }>(
            `/api/academy/live-classes/${liveClassId}/reviews`,
            dto,
        );
    },

    /** Auth: Update review */
    update: async (id: string, dto: AcademyCourseReviewUpdateDTO) => {
        return apiClient.patch<{ data: ClassReview }>(
            `/api/academy/reviews/${id}`,
            dto,
        );
    },

    /** Auth: Hide review */
    hide: async (id: string) => {
        // Prefer POST alias to avoid DELETE restrictions in some proxies/environments.
        return apiClient.post<{ data: ClassReview }>(
            `/api/academy/reviews/${id}/hide`,
        );
    },

    /** Auth: Hard delete review */
    delete: async (id: string) => {
        // Use POST alias to avoid DELETE restrictions in some proxies/environments.
        return apiClient.post<{ data: ClassReview }>(
            `/api/academy/reviews/${id}/delete`,
        );
    },
};

export const academyClassReviewHooks = {
    useListByLiveClass: (liveClassId: string, query?: AcademyCourseReviewQueryDTO) => {
        return useQuery({
            queryKey: ['class-reviews', liveClassId, query],
            queryFn: () => academyClassReviewsClient.listByLiveClass(liveClassId, query),
            enabled: !!liveClassId,
        });
    },

    useListByVodPackage: (vodId: string, query?: AcademyCourseReviewQueryDTO) => {
        return useQuery({
            queryKey: ['vod-reviews', vodId, query],
            queryFn: () => academyClassReviewsClient.listByVodPackage(vodId, query),
            enabled: !!vodId,
        });
    },

    useListMine: () => {
        return useQuery({
            queryKey: ['my-class-reviews'],
            queryFn: () => academyClassReviewsClient.listMine(),
        });
    },

    useCreateReview: () => {
        const qc = useQueryClient();
        return useMutation({
            mutationFn: ({ targetId, dto }: { targetId: string; dto: AcademyCourseReviewCreateDTO }) => {
                return apiClient.post<{ data: ClassReview }>('/api/academy/reviews', dto);
            },
            onSuccess: (_, variables) => {
                qc.invalidateQueries({ queryKey: ['class-reviews', variables.targetId] });
                qc.invalidateQueries({ queryKey: ['my-class-reviews'] });
            },
        });
    },

    useUpdateReview: () => {
        const qc = useQueryClient();
        return useMutation({
            mutationFn: ({ id, dto }: { id: string; dto: AcademyCourseReviewUpdateDTO }) =>
                academyClassReviewsClient.update(id, dto),
            onSuccess: () => {
                qc.invalidateQueries({ queryKey: ['class-reviews'] });
                qc.invalidateQueries({ queryKey: ['my-class-reviews'] });
            },
        });
    },

    useHideReview: () => {
        const qc = useQueryClient();
        return useMutation({
            mutationFn: (id: string) => academyClassReviewsClient.hide(id),
            onSuccess: () => {
                qc.invalidateQueries({ queryKey: ['class-reviews'] });
                qc.invalidateQueries({ queryKey: ['my-class-reviews'] });
            },
        });
    },

    useDeleteReview: () => {
        const qc = useQueryClient();
        return useMutation({
            mutationFn: (id: string) => academyClassReviewsClient.delete(id),
            onSuccess: () => {
                qc.invalidateQueries({ queryKey: ['class-reviews'] });
                qc.invalidateQueries({ queryKey: ['my-class-reviews'] });
            },
        });
    },
};
