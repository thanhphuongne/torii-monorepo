import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api-client';
import type {
    StandardApiResponse,
    AcademyEnrollmentModel
} from '@workspace/schemas';
import { academyEnrollmentApi } from './academy-enrollment-api';

export const academyLearningProgressApi = {
    /**
     * Get current user's enrolled courses with progress
     * Re-routed to enrollments/me which now includes progress data in V2
     */
    getMyCourses: async (): Promise<AcademyEnrollmentModel[]> => {
        const response = await academyEnrollmentApi.getMyEnrollments({ page: 1, limit: 100 });
        return (response.data ?? []).filter(e => e.status !== 'CANCELLED');
    },

    /**
     * Đánh dấu hoàn thành bài (chỉ LIVE — `liveClassId` là UUID LiveClass).
     */
    trackProgress: async (payload: { lessonId: string; liveClassId: string }): Promise<any> => {
        const response = await apiClient.post<StandardApiResponse<any>>(
            `/api/academy/live-classes/${payload.liveClassId}/lessons/${payload.lessonId}/complete`
        );
        return response.data.data!;
    },

    /**
     * Get learning statistics for current user
     */
    getStats: async (): Promise<any> => {
        const response = await apiClient.get<StandardApiResponse<any>>('/api/academy/enrollments/stats');
        return response.data.data!;
    },

    /** Danh sách lesson id đã hoàn thành cho một LiveClass. */
    getLiveClassCompletedLessonIds: async (liveClassId: string): Promise<string[]> => {
        try {
            const response = await apiClient.get<StandardApiResponse<string[]>>(`/api/academy/live-classes/${liveClassId}/completed-lessons`);
            return response.data.data!;
        } catch {
            return [];
        }
    },

    /**
     * Alias LIVE — cùng endpoint completed-lessons theo LiveClass.
     */
    getCompletedLessonIds: async (liveClassId: string): Promise<string[]> => {
        return academyLearningProgressApi.getLiveClassCompletedLessonIds(liveClassId);
    },

    /**
     * Get user's learning history
     */
    getHistory: async (): Promise<any[]> => {
        // Redirection to gamification history as a fallback or if unified
        const response = await apiClient.get<StandardApiResponse<any>>('/api/gamification/history');
        return (response.data.data?.items ?? []).map((it: any) => ({
            id: it.id,
            userId: it.userId,
            deliveryScopeId:
                it.metadata?.deliveryScopeId ?? it.metadata?.targetId,
            lessonId: it.metadata?.lessonId,
            lessonTitle: it.description,
            courseTitle: it.metadata?.courseTitle ?? 'Khóa học',
            progressPercent: 100,
            timestamp: it.createdAt,
        }));
    }
}

/**
 * Hook: Get my enrolled courses
 */
export function useAcademyMyCourses() {
    return useQuery({
        queryKey: ['academy-learning', 'my-courses'],
        queryFn: academyLearningProgressApi.getMyCourses,
    });
}

/**
 * Hook: Get learning statistics
 */
export function useAcademyLearningStats() {
    return useQuery({
        queryKey: ['academy-learning', 'stats'],
        queryFn: academyLearningProgressApi.getStats,
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Hook: completed lesson IDs cho một LiveClass (UUID lớp LIVE).
 */
export function useAcademyCompletedLessonIds(
    liveClassId?: string,
    options?: { enabled?: boolean },
) {
    return useQuery({
        queryKey: ['academy-learning', 'completed-lessons', liveClassId],
        queryFn: () => academyLearningProgressApi.getCompletedLessonIds(liveClassId!),
        enabled: (options?.enabled ?? true) && !!liveClassId,
    });
}

/**
 * Hook: Get learning history
 */
export function useAcademyLearningHistory() {
    return useQuery({
        queryKey: ['academy-learning', 'history'],
        queryFn: academyLearningProgressApi.getHistory,
    });
}
