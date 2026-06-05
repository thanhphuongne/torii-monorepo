import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/api-client"
import type {
  AcademyCohortCreateDTO,
  AcademyCohortQueryDTO,
  AcademyCohortUpdateDTO,
  StandardApiResponse,
} from "@workspace/schemas"

export type AcademyCohort = {
  id: string
  courseProfileId: string
  code: string
  name: string
  description?: string | null
  status: string
  enrollmentOpenAt?: string | null
  enrollmentCloseAt?: string | null
  startDate?: string | null
  endDate?: string | null
  submittedForApprovalAt?: string | null
  rejectionReason?: string | null
  createdAt: string
  updatedAt: string
  _count?: {
    liveClasses?: number
  }
}

type AcademyCohortListPayload =
  | AcademyCohort[]
  | { items?: AcademyCohort[] }
  | null
  | undefined

export const academyCohortsApi = {
  async findAll(params: AcademyCohortQueryDTO) {
    const res = await apiClient.get<StandardApiResponse<AcademyCohortListPayload>>(
      "/api/academy/cohorts",
      { params },
    )
    const payload = res.data.data
    if (Array.isArray(payload)) return payload
    if (Array.isArray(payload?.items)) return payload.items
    return []
  },

  async findById(id: string) {
    const res = await apiClient.get<StandardApiResponse<AcademyCohort>>(
      `/api/academy/cohorts/${id}`,
    )
    return res.data.data!
  },

  async create(input: AcademyCohortCreateDTO) {
    const res = await apiClient.post<StandardApiResponse<AcademyCohort>>(
      "/api/academy/cohorts",
      input,
    )
    return res.data.data!
  },

  async update(id: string, input: AcademyCohortUpdateDTO) {
    const res = await apiClient.put<StandardApiResponse<AcademyCohort>>(
      `/api/academy/cohorts/${id}`,
      input,
    )
    return res.data.data!
  },

  async delete(id: string) {
    const res = await apiClient.delete<StandardApiResponse<{ ok: boolean }>>(
      `/api/academy/cohorts/${id}`,
    )
    return res.data
  },

  async approve(id: string) {
    const res = await apiClient.post<StandardApiResponse<AcademyCohort>>(
      `/api/academy/cohorts/${id}/approve`,
    )
    return res.data.data!
  },

  async reject(id: string, reason: string) {
    const res = await apiClient.post<StandardApiResponse<AcademyCohort>>(
      `/api/academy/cohorts/${id}/reject`,
      { reason },
    )
    return res.data.data!
  },

  async submitForApproval(id: string) {
    const res = await apiClient.post<StandardApiResponse<AcademyCohort>>(
      `/api/academy/cohorts/${id}/submit-for-approval`,
    )
    return res.data.data!
  },
}

export function useAcademyCohorts(params: AcademyCohortQueryDTO) {
  return useQuery({
    queryKey: ["academy-cohorts", params],
    queryFn: () => academyCohortsApi.findAll(params),
  })
}

export function useAcademyCohort(id?: string) {
  return useQuery({
    enabled: !!id,
    queryKey: ["academy-cohort", id],
    queryFn: () => academyCohortsApi.findById(id!),
  })
}

export function useCreateAcademyCohort() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: academyCohortsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["academy-cohorts"] }),
  })
}

export function useUpdateAcademyCohort() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AcademyCohortUpdateDTO }) =>
      academyCohortsApi.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["academy-cohorts"] }),
  })
}

export function useDeleteAcademyCohort() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => academyCohortsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["academy-cohorts"] }),
  })
}

export function useApproveCohort() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => academyCohortsApi.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["academy-cohorts"] })
      qc.invalidateQueries({ queryKey: ["academy-cohort"] })
    },
  })
}

export function useRejectCohort() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      academyCohortsApi.reject(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["academy-cohorts"] })
      qc.invalidateQueries({ queryKey: ["academy-cohort"] })
    },
  })
}

export function useSubmitCohortForApproval() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => academyCohortsApi.submitForApproval(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["academy-cohorts"] })
      qc.invalidateQueries({ queryKey: ["academy-cohort"] })
    },
  })
}

export function usePublishCohortDirectly() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      academyCohortsApi.update(id, { status: "OPENING" } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["academy-cohorts"] })
      qc.invalidateQueries({ queryKey: ["academy-cohort"] })
    },
  })
}
