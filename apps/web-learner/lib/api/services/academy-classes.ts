import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api-client';
import type {
  StandardApiResponse,
  PaginatedApiResponse
} from '@workspace/schemas';

export type AcademyClassModel = {
  id: string;
  code?: string;
  name?: string;
  status?: string;
  [key: string]: any;
};

export type AcademyClassQueryDTO = {
  cohortId?: string;
  instructorId?: string;
  status?: string;
  q?: string;
  page?: number;
  limit?: number;
};

export interface CurriculumLesson {
  id: string; // class_content_items.id
  title: string;
  kind: string; // 'VIDEO' | 'READING'
  isUnlocked: boolean;
  isPreview: boolean;
  order: number;
  videoDuration?: number;
  referenceId?: string | null; // ID của LessonBank / Exam / Assignment
  status?: string | null;
  availableFrom?: string | null;
  deadline?: string | null;
  isPrerequisite?: boolean;
}

export interface CurriculumModule {
  id: string; // class_modules.id
  title: string;
  order: number;
  durationMinutes?: number;
  lessons: CurriculumLesson[];
}

export const academyClassesApi = {
  /**
   * Get all classes with pagination and filters
   */
  findAll: async (params: AcademyClassQueryDTO): Promise<PaginatedApiResponse<AcademyClassModel>> => {
    const response = await apiClient.get<StandardApiResponse<{ items: AcademyClassModel[]; total: number; page: number; limit: number; totalPages: number }>>(
      '/api/academy/live-classes',
      { params }
    );
    const data = response.data.data!;
    return {
      success: response.data.success,
      data: data.items,
      total: data.total,
      page: data.page,
      limit: data.limit,
      totalPages: data.totalPages,
    };
  },

  /**
   * Get class by ID
   */
  findById: async (id: string): Promise<AcademyClassModel> => {
    const response = await apiClient.get<StandardApiResponse<{ item: AcademyClassModel }>>(
      `/api/academy/live-classes/${id}`,
    );
    return response.data.data!.item;
  },

  /**
   * Get curriculum for a class (from CourseProfile → Modules → Lessons)
   */
  getCurriculum: async (id: string): Promise<{ courseId: string; modules: CurriculumModule[] } | null> => {
    const response = await apiClient.get<StandardApiResponse<{ curriculum: any }>>(
      `/api/academy/live-classes/${id}/curriculum`
    );
    const data = response.data.data?.curriculum;
    if (!data) return null;

    return {
      courseId: data.id,
      modules: (data.modules ?? [])
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
              kind: it.type, // Map 'type' to 'kind'
              isUnlocked: true, // Lessons from course profile are unlocked by default
              isPreview: false,
              order: it.orderIndex,
              videoDuration: it.videoDurationSeconds,
              referenceId: it.id, // In V2, the lesson itself is the reference
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
 * Hook: Get all classes with filters
 */
export function useAcademyClasses(params: AcademyClassQueryDTO) {
  return useQuery({
    queryKey: ['academy-classes', params],
    queryFn: () => academyClassesApi.findAll(params),
  });
}

/**
 * Hook: Get academy class by ID
 */
export function useAcademyClass(id?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['academy-classes', 'id', id],
    queryFn: () => academyClassesApi.findById(id!),
    enabled: (options?.enabled ?? true) && !!id,
  });
}

/**
 * Hook: Get curriculum for a class
 */
export function useCurriculum(courseId?: string, options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: ['curriculum', courseId],
        queryFn: () => academyClassesApi.getCurriculum(courseId!),
        enabled: (options?.enabled ?? true) && !!courseId,
  });
}
