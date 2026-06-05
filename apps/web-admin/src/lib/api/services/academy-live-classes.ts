import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/api-client"
import type {
  AcademyLiveClassCreateDTO,
  AcademyLiveClassDuplicateDTO,
  AcademyLiveClassQueryDTO,
  AcademyLiveClassUpdateDTO,
  StandardApiResponse,
} from "@workspace/schemas"

export type AcademyLiveClass = {
  id: string
  cohortId?: string | null
  code: string
  name: string
  status: string
  price?: string | number | null
  discountPrice?: string | number | null
  instructorId?: string | null
  instructor?: {
    id: string
    displayName: string
    avatarUrl?: string | null
  } | null
  maxStudents?: number | null
  thumbnailUrl?: string | null
  startDate?: string | null
  endDate?: string | null
  createdAt: string
  updatedAt: string
  mode: "LIVE" | "VOD"
  _count?: {
    liveSchedules?: number
    enrollments?: number
  }
  liveSchedules?: Array<{
    id: string
    weekday: number
    startTime: string
    endTime: string
    roomId?: string | null
  }> | null
  submittedForApprovalAt?: string | null
  rejectionReason?: string | null
  cohort?: {
    id: string
    name: string
    status: string
    courseProfileId: string
    startDate?: string | null
    endDate?: string | null
    enrollmentOpenAt?: string | null
    enrollmentCloseAt?: string | null
    courseProfile?: {
      id: string
      title: string
      thumbnailUrl?: string | null
      level?: string | null
    } | null
  } | null
}

type AcademyLiveClassListPayload =
  | AcademyLiveClass[]
  | { items?: AcademyLiveClass[] }
  | null
  | undefined

export const academyLiveClassesApi = {
  async findAll(params: AcademyLiveClassQueryDTO) {
    const res = await apiClient.get<StandardApiResponse<AcademyLiveClassListPayload>>(
      "/api/academy/live-classes",
      { params },
    )
    const payload = res.data.data
    if (Array.isArray(payload)) return payload
    if (Array.isArray(payload?.items)) return payload.items
    return []
  },

  async findById(id: string) {
    const res = await apiClient.get<StandardApiResponse<{ item: AcademyLiveClass }>>(
      `/api/academy/live-classes/${id}`,
    )
    return res.data.data?.item ?? (res.data.data as any)
  },

  async create(input: AcademyLiveClassCreateDTO) {
    const res = await apiClient.post<StandardApiResponse<AcademyLiveClass>>(
      "/api/academy/live-classes",
      input,
    )
    return res.data.data!
  },

  async update(id: string, input: AcademyLiveClassUpdateDTO) {
    const res = await apiClient.put<StandardApiResponse<AcademyLiveClass>>(
      `/api/academy/live-classes/${id}`,
      input,
    )
    return res.data.data!
  },

  async delete(id: string) {
    const res = await apiClient.delete<StandardApiResponse<{ ok: boolean }>>(
      `/api/academy/live-classes/${id}`,
    )
    return res.data
  },

  async publishDirectly(id: string) {
    return this.update(id, { status: "OPENING" })
  },

  async duplicate(id: string, input: AcademyLiveClassDuplicateDTO) {
    const res = await apiClient.post<StandardApiResponse<AcademyLiveClass>>(
      `/api/academy/live-classes/${id}/duplicate`,
      input,
    )
    return res.data.data!
  },
}

export function useAcademyLiveClasses(params: AcademyLiveClassQueryDTO) {
  return useQuery({
    queryKey: ["academy-live-classes", params],
    queryFn: () => academyLiveClassesApi.findAll(params),
  })
}

export function useAcademyLiveClass(id?: string) {
  return useQuery({
    enabled: !!id,
    queryKey: ["academy-live-class", id],
    queryFn: () => academyLiveClassesApi.findById(id!),
  })
}

export function useCreateAcademyLiveClass() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: academyLiveClassesApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["academy-live-classes"] }),
  })
}

export function useUpdateAcademyLiveClass() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AcademyLiveClassUpdateDTO }) =>
      academyLiveClassesApi.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["academy-live-classes"] }),
  })
}

export function useDeleteAcademyLiveClass() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => academyLiveClassesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["academy-live-classes"] }),
  })
}

export function usePublishClassDirectly() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => academyLiveClassesApi.publishDirectly(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["academy-live-classes"] })
      qc.invalidateQueries({ queryKey: ["academy-live-class", id] })
    },
  })
}

export function useDuplicateAcademyClass() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AcademyLiveClassDuplicateDTO }) =>
      academyLiveClassesApi.duplicate(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["academy-live-classes"] }),
  })
}

