import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/api-client"
import type {
  AcademyLiveScheduleConflictPreviewDTO,
  AcademyLiveScheduleCreateDTO,
  AcademyLiveScheduleQueryDTO,
  AcademyLiveScheduleUpdateDTO,
  StandardApiResponse,
} from "@workspace/schemas"

export type AcademyLiveSchedule = {
  id: string
  liveClassId: string
  class?: {
    id: string
  }
  weekday: number
  startTime: string
  endTime: string
  location?: string | null
  note?: string | null
  excludedDates?: any | null
  roomId?: string | null
}

export const academyLiveSchedulesApi = {
  async findAll(params: AcademyLiveScheduleQueryDTO) {
    const res = await apiClient.get<
      StandardApiResponse<{ items: AcademyLiveSchedule[] }>
    >("/api/academy/live-schedules", {
      params,
    })
    return res.data.data!.items
  },

  async findById(id: string) {
    const res = await apiClient.get<
      StandardApiResponse<{ item: AcademyLiveSchedule }>
    >(`/api/academy/live-schedules/${id}`)
    return res.data.data!.item
  },

  async create(input: AcademyLiveScheduleCreateDTO) {
    const res = await apiClient.post<
      StandardApiResponse<{ item: AcademyLiveSchedule }>
    >("/api/academy/live-schedules", input)
    return res.data.data!.item
  },

  async update(id: string, input: AcademyLiveScheduleUpdateDTO) {
    const res = await apiClient.put<
      StandardApiResponse<{ item: AcademyLiveSchedule }>
    >(`/api/academy/live-schedules/${id}`, input)
    return res.data.data!.item
  },

  async delete(id: string) {
    const res = await apiClient.delete<StandardApiResponse<{ ok: boolean }>>(
      `/api/academy/live-schedules/${id}`,
    )
    return res.data
  },

  async previewConflict(input: AcademyLiveScheduleConflictPreviewDTO) {
    const res = await apiClient.post<
      StandardApiResponse<{
        hasConflict: boolean
        inClassConflicts: Array<{ id: string; startTime: string; endTime: string }>
        teacherConflicts: Array<{ id: string; classCode: string; className: string; startTime: string; endTime: string }>
      }>
    >("/api/academy/live-schedules/preview-conflict", input)
    return res.data.data!
  },
}

export function useAcademyLiveSchedules(
  params: AcademyLiveScheduleQueryDTO,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ["academy-live-schedules", params],
    queryFn: () => academyLiveSchedulesApi.findAll(params),
    enabled: options?.enabled ?? true,
  })
}

export function useAcademyLiveSchedule(id?: string) {
  return useQuery({
    enabled: !!id,
    queryKey: ["academy-live-schedule", id],
    queryFn: () => academyLiveSchedulesApi.findById(id!),
  })
}

export function useCreateAcademyLiveSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: academyLiveSchedulesApi.create,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["academy-live-schedules"] }),
  })
}

export function useUpdateAcademyLiveSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: AcademyLiveScheduleUpdateDTO
    }) => academyLiveSchedulesApi.update(id, input),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["academy-live-schedules"] }),
  })
}

export function useDeleteAcademyLiveSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => academyLiveSchedulesApi.delete(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["academy-live-schedules"] }),
  })
}

export function usePreviewAcademyLiveScheduleConflict() {
  return useMutation({
    mutationFn: (input: AcademyLiveScheduleConflictPreviewDTO) =>
      academyLiveSchedulesApi.previewConflict(input),
  })
}
