import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/api-client"
import type {
  AcademyAssignmentSubmissionCreateDTO,
  AcademyAssignmentSubmissionQueryDTO,
  AcademyAssignmentSubmissionUpdateDTO,
  StandardApiResponse,
} from "@workspace/schemas"

export type AcademyAssignmentSubmission = {
  id: string
  liveClassId?: string | null
  classAssessmentId?: string
  assignmentTemplateId?: string
  userId: string
  status: string
  score?: number | null
  grade?: number | string | null
  submittedAt?: string | null
  gradedAt?: string | null
  content?: unknown | null
  fileUrls?: string[] | null
  feedback?: string | null
  createdAt: string
  updatedAt: string
  user?: { id: string; displayName?: string | null; email?: string | null } | null
}

export const academyAssignmentSubmissionsApi = {
  async findAll(params: AcademyAssignmentSubmissionQueryDTO) {
    const res = await apiClient.get<
      StandardApiResponse<{ items: AcademyAssignmentSubmission[] }>
    >("/api/academy/assignment-submissions", {
      params,
    })
    return res.data.data!.items
  },

  async findById(id: string) {
    const res = await apiClient.get<
      StandardApiResponse<{ item: AcademyAssignmentSubmission }>
    >(`/api/academy/assignment-submissions/${id}`)
    return res.data.data!.item
  },

  async create(input: AcademyAssignmentSubmissionCreateDTO) {
    const res = await apiClient.post<
      StandardApiResponse<{ item: AcademyAssignmentSubmission }>
    >("/api/academy/assignment-submissions", input)
    return res.data.data!.item
  },

  async update(id: string, input: AcademyAssignmentSubmissionUpdateDTO) {
    const res = await apiClient.put<
      StandardApiResponse<{ item: AcademyAssignmentSubmission }>
    >(`/api/academy/assignment-submissions/${id}`, input)
    return res.data.data!.item
  },

  async delete(id: string) {
    const res = await apiClient.delete<StandardApiResponse<{ ok: boolean }>>(
      `/api/academy/assignment-submissions/${id}`,
    )
    return res.data
  },
}

export function useAcademyAssignmentSubmissions(
  params: AcademyAssignmentSubmissionQueryDTO,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ["academy-assignment-submissions", params],
    queryFn: () => academyAssignmentSubmissionsApi.findAll(params),
    enabled: options?.enabled ?? true,
  })
}

export function useAcademyAssignmentSubmission(id?: string) {
  return useQuery({
    enabled: !!id,
    queryKey: ["academy-assignment-submission", id],
    queryFn: () => academyAssignmentSubmissionsApi.findById(id!),
  })
}

export function useCreateAcademyAssignmentSubmission() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: academyAssignmentSubmissionsApi.create,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["academy-assignment-submissions"] }),
  })
}

export function useUpdateAcademyAssignmentSubmission() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: AcademyAssignmentSubmissionUpdateDTO
    }) => academyAssignmentSubmissionsApi.update(id, input),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["academy-assignment-submissions"] }),
  })
}

export function useDeleteAcademyAssignmentSubmission() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => academyAssignmentSubmissionsApi.delete(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["academy-assignment-submissions"] }),
  })
}

