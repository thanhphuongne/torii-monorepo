import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { apiClient } from '../api-client';
import type {
    AcademyLessonModel,
    StandardApiResponse
} from '@workspace/schemas';

export const academyLessonApi = {
    /**
     * Get lesson details by ID
     */
    async findById(lessonId: string): Promise<AcademyLessonModel> {
        const response = await apiClient.get<StandardApiResponse<{ item: AcademyLessonModel }>>(`/api/academy/lessons/${lessonId}`);
        const item = response.data.data!.item as any;
        return {
            ...item,
            contentType: typeof item?.contentType === 'string'
                ? item.contentType.toLowerCase()
                : item?.contentType,
        };
    },
};

/**
 * Hook: Get single academy lesson detail
 */
export function useAcademyLesson(
    lessonId: string,
    options?: Omit<UseQueryOptions<AcademyLessonModel>, 'queryKey' | 'queryFn'>,
) {
    return useQuery({
        queryKey: ['academy-lessons', lessonId],
        queryFn: () => academyLessonApi.findById(lessonId),
        enabled: !!lessonId && (options?.enabled ?? true),
        ...options,
    });
}
