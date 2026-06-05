import { useMutation, useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/api-client"
import type {
  AcademyLiveScheduleSessionModel,
  AcademyLiveSessionQueryDTO,
  StandardApiResponse,
} from "@workspace/schemas"

export type AcademyLiveSessionJoinResponse = {
  token: string
  roomId: string
  roomTitle: string
  userId?: string
}

export const academyLiveSessionsApi = {
  async joinAsLecturer(sessionId: string) {
    const res = await apiClient.post<
      StandardApiResponse<AcademyLiveSessionJoinResponse>
    >(`/api/live-sessions/${sessionId}/join/lecturer`)
    return res.data.data!
  },

  async joinAsStudent(sessionId: string) {
    const res = await apiClient.post<
      StandardApiResponse<AcademyLiveSessionJoinResponse>
    >(`/api/live-sessions/${sessionId}/join/student`)
    return res.data.data!
  },

  async findAll(params: AcademyLiveSessionQueryDTO) {
    const res = await apiClient.get<
      StandardApiResponse<{ items: AcademyLiveScheduleSessionModel[] }>
    >("/api/academy/live-sessions", { params })
    return res.data.data!.items
  },
}

export function useJoinAcademyLiveSessionAsLecturer() {
  return useMutation({
    mutationFn: (sessionId: string) =>
      academyLiveSessionsApi.joinAsLecturer(sessionId),
  })
}

export function useJoinAcademyLiveSessionAsStudent() {
  return useMutation({
    mutationFn: (sessionId: string) =>
      academyLiveSessionsApi.joinAsStudent(sessionId),
  })
}

export function useAcademyLiveSessions(
  params: AcademyLiveSessionQueryDTO,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ["academy-live-sessions", params],
    queryFn: () => academyLiveSessionsApi.findAll(params),
    enabled: options?.enabled ?? true,
  })
}
