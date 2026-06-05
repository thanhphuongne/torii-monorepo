import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api-client';
import type { StandardApiResponse } from '@workspace/schemas';
import type { CurriculumModule, CurriculumLesson, AcademyClassModel } from './academy-classes';

export const academyVodApi = {
    /**
     * Get VOD package by ID
     */
    findById: async (id: string): Promise<AcademyClassModel> => {
        const response = await apiClient.get<StandardApiResponse<AcademyClassModel>>(
            `/api/academy/vod-packages/${id}`,
        );
        return response.data.data!;
    },

    /**
     * Get curriculum for a VOD package (extracted from profile)
     */
    getCurriculum: async (id: string): Promise<{ courseId: string; modules: CurriculumModule[] } | null> => {
        const item = await academyVodApi.findById(id);
        if (!item) return null;

        const profile = item.courseProfile;
        if (!profile) return null;

        return {
            courseId: profile.id,
            modules: (profile.modules ?? [])
                .sort((a: any, b: any) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
                .map((m: any): CurriculumModule => ({
                    id: m.id,
                    title: m.title,
                    order: m.orderIndex,
                    durationMinutes: m.durationMinutes,
                    lessons: (m.lessons ?? [])
                        .sort((a: any, b: any) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
                        .map((it: any): CurriculumLesson => ({
                            id: it.id,
                            title: it.title,
                            kind: it.type,
                            isUnlocked: true,
                            isPreview: false,
                            order: it.orderIndex,
                            videoDuration: it.videoDurationSeconds,
                            referenceId: it.id,
                            status: null,
                            availableFrom: null,
                            deadline: null,
                            isPrerequisite: false,
                        })),
                })),
        };
    },
};

/**
 * Hook: Get VOD package by ID
 */
export function useAcademyVodPackage(packageId?: string, options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: ['academy-vod-package', 'id', packageId],
        queryFn: () => academyVodApi.findById(packageId!),
        enabled: (options?.enabled ?? true) && !!packageId,
    });
}

/**
 * Hook: Get curriculum for a VOD package
 */
export function useAcademyVodCurriculum(packageId?: string, options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: ['academy-vod-curriculum', packageId],
        queryFn: () => academyVodApi.getCurriculum(packageId!),
        enabled: (options?.enabled ?? true) && !!packageId,
    });
}

/**
 * Hook: Check enrollment status for VOD package
 */
export function useAcademyVodEnrollmentCheck(packageId: string, options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: ['academy-vod-enrollments', 'check', packageId],
        queryFn: async () => {
            const response = await apiClient.get<StandardApiResponse<{ items: any[] }>>(
                '/api/academy/enrollments/me',
            );
            const enrollment = response.data.data?.items?.find(e => e.vodPackageId === packageId);
            const isValid = enrollment && (enrollment.status === 'ACTIVE' || enrollment.status === 'COMPLETED');
            return {
                isEnrolled: !!isValid,
                enrollment: isValid ? enrollment : undefined
            };
        },
        enabled: (options?.enabled ?? true) && !!packageId,
    });
}

/**
 * Hook: Get completed lesson IDs for a VOD package
 */
export function useAcademyVodCompletedLessonIds(packageId?: string, options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: ['academy-vod-learning', 'completed-lessons', packageId],
        queryFn: async (): Promise<string[]> => {
            const response = await apiClient.get<StandardApiResponse<string[]>>(
                `/api/academy/vod-packages/${packageId}/completed-lessons`,
            );
            return response.data.data ?? [];
        },
        enabled: (options?.enabled ?? true) && !!packageId,
    });
}

export const academyVodLearningProgressApi = {
    trackProgress: async (payload: { lessonId: string; packageId: string }): Promise<any> => {
        const response = await apiClient.post<StandardApiResponse<any>>(
            `/api/academy/vod-packages/${payload.packageId}/lessons/${payload.lessonId}/complete`
        );
        return response.data.data!;
    }
};
