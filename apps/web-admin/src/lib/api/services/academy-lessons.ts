import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/api-client"
import type {
  AcademyLessonCreateDTO,
  AcademyLessonQueryDTO,
  AcademyLessonUpdateDTO,
  StandardApiResponse,
} from "@workspace/schemas"

export type AcademyLesson = {
  id: string
  moduleId: string
  title: string
  type: "VIDEO" | "READING"
  orderIndex: number
  videoUrl?: string | null
  content?: string | null
  createdAt: string
  updatedAt: string
}

export const academyLessonsApi = {
  async findAll(params: AcademyLessonQueryDTO) {
    const res = await apiClient.get<StandardApiResponse<{ items: AcademyLesson[] }>>(
      "/api/academy/lessons",
      { params },
    )
    return res.data.data!.items
  },

  async findById(id: string) {
    const res = await apiClient.get<StandardApiResponse<{ item: AcademyLesson }>>(
      `/api/academy/lessons/${id}`,
    )
    return res.data.data!.item
  },

  async create(input: AcademyLessonCreateDTO) {
    const res = await apiClient.post<StandardApiResponse<{ item: AcademyLesson }>>(
      "/api/academy/lessons",
      input,
    )
    return res.data.data!.item
  },

  async update(id: string, input: AcademyLessonUpdateDTO) {
    const res = await apiClient.put<StandardApiResponse<{ item: AcademyLesson }>>(
      `/api/academy/lessons/${id}`,
      input,
    )
    return res.data.data!.item
  },
  async delete(id: string) {
    const res = await apiClient.delete<StandardApiResponse<{ ok: boolean }>>(
      `/api/academy/lessons/${id}`,
    )
    return res.data
  },

  async reorder(moduleId: string, lessonIds: string[]) {
    const res = await apiClient.post<StandardApiResponse<{ ok: boolean }>>(
      "/api/academy/lessons/reorder",
      { moduleId, lessonIds },
    )
    return res.data.data
  },
}

export function useAcademyLessons(params: AcademyLessonQueryDTO) {
  return useQuery({
    queryKey: ["academy-lessons", params],
    queryFn: () => academyLessonsApi.findAll(params),
  })
}

export function useAcademyLesson(id?: string, options?: { enabled?: boolean }) {
  return useQuery({
    enabled: options?.enabled ?? !!id,
    queryKey: ["academy-lesson", id],
    queryFn: () => academyLessonsApi.findById(id!),
  })
}

export function useCreateAcademyLesson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: academyLessonsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["academy-lessons"] }),
  })
}

export function useUpdateAcademyLesson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AcademyLessonUpdateDTO }) =>
      academyLessonsApi.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["academy-lessons"] }),
  })
}

export function useDeleteAcademyLesson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => academyLessonsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["academy-lessons"] }),
  })
}

export function useReorderAcademyLessons() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ moduleId, lessonIds }: { moduleId: string; lessonIds: string[] }) =>
      academyLessonsApi.reorder(moduleId, lessonIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["academy-course-profile"] })
      qc.invalidateQueries({ queryKey: ["academy-lessons"] })
    },
  })
}
