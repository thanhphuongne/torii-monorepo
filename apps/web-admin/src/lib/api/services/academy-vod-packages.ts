import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/api-client"
import type {
  AcademyVodPackageCreateDTO,
  AcademyVodPackageQueryDTO,
  AcademyVodPackageUpdateDTO,
  StandardApiResponse,
} from "@workspace/schemas"

export type AcademyVodPackage = {
  id: string
  courseProfileId: string
  code: string
  title: string
  thumbnailUrl?: string | null
  description?: string | null
  price: number
  discountPrice?: number | null
  status: string
  submittedForApprovalAt?: string | null
  rejectionReason?: string | null
  instructorId?: string | null
  instructor?: { id: string; displayName: string; avatarUrl?: string | null } | null
  courseProfile?: { id: string; title: string; level: string; thumbnailUrl?: string | null }
  createdAt: string
  updatedAt: string
}

type AcademyVodPackageListPayload =
  | AcademyVodPackage[]
  | { items?: AcademyVodPackage[] }
  | null
  | undefined

export const academyVodPackagesApi = {
  async findAll(params: AcademyVodPackageQueryDTO) {
    const res = await apiClient.get<StandardApiResponse<AcademyVodPackageListPayload>>(
      "/api/academy/vod-packages",
      { params },
    )
    const payload = res.data.data
    if (Array.isArray(payload)) return payload
    if (Array.isArray(payload?.items)) return payload.items
    return []
  },

  async findById(id: string) {
    const res = await apiClient.get<StandardApiResponse<AcademyVodPackage>>(
      `/api/academy/vod-packages/${id}`,
    )
    return res.data.data!
  },

  async findMyAssigned(params: AcademyVodPackageQueryDTO) {
    const res = await apiClient.get<StandardApiResponse<AcademyVodPackageListPayload>>(
      "/api/academy/vod-packages/my-assigned",
      { params },
    )
    const payload = res.data.data
    if (Array.isArray(payload)) return payload
    if (Array.isArray(payload?.items)) return payload.items
    return []
  },

  async findMyAssignedDiscussionContext(id: string) {
    const res = await apiClient.get<StandardApiResponse<AcademyVodPackage>>(
      `/api/academy/vod-packages/my-assigned/${id}/discussion`,
    )
    return res.data.data!
  },

  async create(input: AcademyVodPackageCreateDTO) {
    const res = await apiClient.post<StandardApiResponse<AcademyVodPackage>>(
      "/api/academy/vod-packages",
      input,
    )
    return res.data.data!
  },

  async update(id: string, input: AcademyVodPackageUpdateDTO) {
    const res = await apiClient.put<StandardApiResponse<AcademyVodPackage>>(
      `/api/academy/vod-packages/${id}`,
      input,
    )
    return res.data.data!
  },

  async delete(id: string) {
    const res = await apiClient.delete<StandardApiResponse<{ ok: boolean }>>(
      `/api/academy/vod-packages/${id}`,
    )
    return res.data
  },

  async publishDirectly(id: string) {
    const res = await apiClient.put<StandardApiResponse<AcademyVodPackage>>(
      `/api/academy/vod-packages/${id}`,
      { status: 'PUBLISHED' }
    )
    return res.data.data!
  },

  async approve(id: string) {
    const res = await apiClient.post<StandardApiResponse<AcademyVodPackage>>(
      `/api/academy/vod-packages/${id}/approve`,
    )
    return res.data.data!
  },

  async reject(id: string, reason: string) {
    const res = await apiClient.post<StandardApiResponse<AcademyVodPackage>>(
      `/api/academy/vod-packages/${id}/reject`,
      { reason },
    )
    return res.data.data!
  },

  async submitForApproval(id: string) {
    const res = await apiClient.post<StandardApiResponse<AcademyVodPackage>>(
      `/api/academy/vod-packages/${id}/submit-for-approval`,
    )
    return res.data.data!
  },
}

export function useAcademyVodPackages(params: AcademyVodPackageQueryDTO) {
  return useQuery({
    queryKey: ["academy-vod-packages", params],
    queryFn: () => academyVodPackagesApi.findAll(params),
  })
}

export function useAcademyVodPackage(id?: string) {
  return useQuery({
    enabled: !!id,
    queryKey: ["academy-vod-package", id],
    queryFn: () => academyVodPackagesApi.findById(id!),
  })
}

export function useMyAssignedAcademyVodPackages(params: AcademyVodPackageQueryDTO) {
  return useQuery({
    queryKey: ["academy-vod-packages", "my-assigned", params],
    queryFn: () => academyVodPackagesApi.findMyAssigned(params),
  })
}

export function useMyAssignedAcademyVodPackageDiscussionContext(id?: string) {
  return useQuery({
    enabled: !!id,
    queryKey: ["academy-vod-package", "my-assigned-discussion", id],
    queryFn: () => academyVodPackagesApi.findMyAssignedDiscussionContext(id!),
  })
}

export function useCreateAcademyVodPackage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: academyVodPackagesApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["academy-vod-packages"] }),
  })
}

export function useUpdateAcademyVodPackage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AcademyVodPackageUpdateDTO }) =>
      academyVodPackagesApi.update(id, input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["academy-vod-packages"] })
      // Detail page dùng key ["academy-vod-package", id], cần invalidate để UI đổi trạng thái/nút ngay
      qc.invalidateQueries({ queryKey: ["academy-vod-package", variables.id] })
      // Fallback: invalidate theo prefix nếu có nơi dùng key không kèm id
      qc.invalidateQueries({ queryKey: ["academy-vod-package"] })
    },
  })
}

export function useDeleteAcademyVodPackage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => academyVodPackagesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["academy-vod-packages"] }),
  })
}

export function usePublishVodPackageDirectly() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: academyVodPackagesApi.publishDirectly,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["academy-vod-packages"] })
      qc.invalidateQueries({ queryKey: ["academy-vod-package"] })
    },
  })
}

export function useApproveVodPackage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => academyVodPackagesApi.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["academy-vod-packages"] })
      qc.invalidateQueries({ queryKey: ["academy-vod-package"] })
    },
  })
}

export function useRejectVodPackage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      academyVodPackagesApi.reject(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["academy-vod-packages"] })
      qc.invalidateQueries({ queryKey: ["academy-vod-package"] })
    },
  })
}

export function useSubmitVodPackageForApproval() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => academyVodPackagesApi.submitForApproval(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["academy-vod-packages"] })
      qc.invalidateQueries({ queryKey: ["academy-vod-package"] })
    },
  })
}
