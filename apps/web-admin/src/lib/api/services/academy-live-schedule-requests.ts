import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/api-client"
import type {
  AcademyLiveScheduleRequestApproveDTO,
  AcademyLiveScheduleRequestCreateDTO,
  AcademyLiveScheduleRequestQueryDTO,
  AcademyLiveScheduleRequestRejectDTO,
  AcademyLiveScheduleConflictPreviewDTO,
  StandardApiResponse,
} from "@workspace/schemas"

export type AcademyLiveScheduleRequest = {
  id: string
  sessionId: string
  liveClassId?: string | null
  requestedBy: string
  type: "RESCHEDULE"
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED"
  reason?: string | null
  requestedDate?: string | null
  proposedDate?: string | null
  proposedStartTime?: string | null
  proposedEndTime?: string | null
  reviewNote?: string | null
  reviewedBy?: string | null
  reviewedAt?: string | null
  createdAt: string
  updatedAt: string
  session?: {
    id: string
    liveClassId: string
    sessionDate: string
    startTime: string
    endTime: string
  }
  requester?: {
    id: string
    displayName: string
    email: string
  }
  reviewer?: {
    id: string
    displayName: string
    email: string
  }
}


export const academyLiveScheduleRequestsApi = {
  async findAll(params: AcademyLiveScheduleRequestQueryDTO) {
    const res = await apiClient.get<
      StandardApiResponse<{ items: AcademyLiveScheduleRequest[] }>
    >("/api/academy/live-sessions/requests", { params })
    return res.data.data!.items
  },

  async previewConflict(input: AcademyLiveScheduleConflictPreviewDTO) {
    const res = await apiClient.post<
      StandardApiResponse<{
        hasConflict: boolean
        inClassConflicts: Array<{ id: string; startTime: string; endTime: string }>
        teacherConflicts: Array<{
          id: string
          classCode: string
          className: string
          startTime: string
          endTime: string
        }>
      }>
    >("/api/academy/live-sessions/requests/preview-conflict", input)
    return res.data.data!
  },

  async create(input: AcademyLiveScheduleRequestCreateDTO) {
    const res = await apiClient.post<
      StandardApiResponse<{ item: AcademyLiveScheduleRequest }>
    >("/api/academy/live-sessions/requests", input)
    return res.data.data!.item
  },

  async cancel(id: string) {
    const res = await apiClient.post<
      StandardApiResponse<{ item: AcademyLiveScheduleRequest }>
    >(`/api/academy/live-sessions/requests/${id}/cancel`)
    return res.data.data!.item
  },

  async approve(id: string, input: AcademyLiveScheduleRequestApproveDTO) {
    const res = await apiClient.post<
      StandardApiResponse<{ item: AcademyLiveScheduleRequest }>
    >(`/api/academy/live-sessions/requests/${id}/approve`, input)
    return res.data.data!.item
  },

  async reject(id: string, input: AcademyLiveScheduleRequestRejectDTO) {
    const res = await apiClient.post<
      StandardApiResponse<{ item: AcademyLiveScheduleRequest }>
    >(`/api/academy/live-sessions/requests/${id}/reject`, input)
    return res.data.data!.item
  },
}

export function useAcademyLiveScheduleRequests(
  params: AcademyLiveScheduleRequestQueryDTO,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ["academy-live-schedule-requests", params],
    queryFn: () => academyLiveScheduleRequestsApi.findAll(params),
    enabled: options?.enabled ?? true,
  })
}

export function useCreateAcademyLiveScheduleRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: academyLiveScheduleRequestsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["academy-live-schedule-requests"] })
      qc.invalidateQueries({ queryKey: ["academy-live-sessions"] })
    },
  })
}

export function useCancelAcademyLiveScheduleRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: academyLiveScheduleRequestsApi.cancel,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["academy-live-schedule-requests"] })
    },
  })
}

export function useApproveAcademyLiveScheduleRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AcademyLiveScheduleRequestApproveDTO }) =>
      academyLiveScheduleRequestsApi.approve(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["academy-live-schedule-requests"] })
      qc.invalidateQueries({ queryKey: ["academy-live-sessions"] })
    },
  })
}

export function useRejectAcademyLiveScheduleRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AcademyLiveScheduleRequestRejectDTO }) =>
      academyLiveScheduleRequestsApi.reject(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["academy-live-schedule-requests"] })
    },
  })
}

export function usePreviewAcademyLiveSessionConflict() {
  return useMutation({
    mutationFn: (input: AcademyLiveScheduleConflictPreviewDTO) =>
      academyLiveScheduleRequestsApi.previewConflict(input),
  })
}
