import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/api-client"
import type { StandardApiResponse } from "@workspace/schemas"

export type AcademyCourseModule = {
  id: string
  courseProfileId: string
  title: string
  orderIndex: number
  createdAt: string
  updatedAt: string
  lessons?: any[]
}

export type AcademyCourseModuleCreateDTO = {
  title: string
  orderIndex?: number
}

export type AcademyCourseModuleUpdateDTO = {
  title?: string
  orderIndex?: number
}

export const academyCourseModulesApi = {
  async create(courseProfileId: string, input: AcademyCourseModuleCreateDTO) {
    const res = await apiClient.post<StandardApiResponse<{ item: AcademyCourseModule }>>(
      `/api/academy/course-profiles/${courseProfileId}/modules`,
      input,
    )

    return res.data.data!.item
  },

  async update(courseProfileId: string, moduleId: string, input: AcademyCourseModuleUpdateDTO) {
    const res = await apiClient.put<StandardApiResponse<{ item: AcademyCourseModule }>>(
      `/api/academy/course-profiles/${courseProfileId}/modules/${moduleId}`,
      input,
    )

    return res.data.data!.item
  },
  async delete(courseProfileId: string, moduleId: string) {
    const res = await apiClient.delete<StandardApiResponse<{ ok: boolean }>>(
      `/api/academy/course-profiles/${courseProfileId}/modules/${moduleId}`,
    )

    return res.data.data
  },

  async reorder(courseProfileId: string, moduleIds: string[]) {
    const res = await apiClient.post<StandardApiResponse<{ ok: boolean }>>(
      `/api/academy/course-profiles/${courseProfileId}/modules/reorder`,
      { moduleIds },
    )

    return res.data.data
  },
}

export function useCreateAcademyCourseModule() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ courseProfileId, input }: { courseProfileId: string; input: AcademyCourseModuleCreateDTO }) =>
      academyCourseModulesApi.create(courseProfileId, input),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["academy-course-profile", variables.courseProfileId] })
    },
  })
}

export function useUpdateAcademyCourseModule() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ courseProfileId, moduleId, input }: { courseProfileId: string; moduleId: string; input: AcademyCourseModuleUpdateDTO }) =>
      academyCourseModulesApi.update(courseProfileId, moduleId, input),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["academy-course-profile", variables.courseProfileId] })
    },
  })
}

export function useDeleteAcademyCourseModule() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ courseProfileId, moduleId }: { courseProfileId: string; moduleId: string }) =>
      academyCourseModulesApi.delete(courseProfileId, moduleId),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["academy-course-profile", variables.courseProfileId] })
    },
  })
}

export function useReorderAcademyCourseModules() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ courseProfileId, moduleIds }: { courseProfileId: string; moduleIds: string[] }) =>
      academyCourseModulesApi.reorder(courseProfileId, moduleIds),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["academy-course-profile", variables.courseProfileId] })
    },
  })
}

