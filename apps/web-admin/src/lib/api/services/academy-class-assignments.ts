import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/api-client"
import type {
  AcademyLiveClassAssignmentCreateDTO,
  AcademyLiveClassAssignmentUpdateDTO,
  StandardApiResponse,
} from "@workspace/schemas"

export type AcademyAssignment = {
  id: string
  title: string
  instructions: string
  createdAt: string
  updatedAt: string
}

export type AcademyClassAssignment = {
  id: string
  liveClassId: string | null
  vodPackageId?: string | null
  assignmentId: string
  titleOverride?: string | null
  openAt?: string | null
  deadline?: string | null
  createdAt: string
  updatedAt: string
  assignment?: AcademyAssignment
  _count?: { submissions: number }
}

export const academyClassAssignmentsApi = {
  async findById(id: string) {
    const res = await apiClient.get<
      StandardApiResponse<{ item: AcademyClassAssignment }>
    >(`/api/academy/live-class-assignments/${id}`)
    return res.data.data!.item
  },

  async findByLiveClassId(liveClassId: string) {
    const res = await apiClient.get<
      StandardApiResponse<{ items: AcademyClassAssignment[] }>
    >(`/api/academy/live-classes/${liveClassId}/assignments`)
    return res.data.data!.items
  },

  async add(liveClassId: string, input: AcademyLiveClassAssignmentCreateDTO) {
    const res = await apiClient.post<
      StandardApiResponse<{ item: AcademyClassAssignment }>
    >(`/api/academy/live-classes/${liveClassId}/assignments`, input)
    return res.data.data!.item
  },

  async update(id: string, input: AcademyLiveClassAssignmentUpdateDTO) {
    const res = await apiClient.put<
      StandardApiResponse<{ item: AcademyClassAssignment }>
    >(`/api/academy/live-class-assignments/${id}`, input)
    return res.data.data!.item
  },

  async remove(id: string) {
    const res = await apiClient.delete<StandardApiResponse<{ ok: boolean }>>(
      `/api/academy/live-class-assignments/${id}`,
    )
    return res.data
  },
}

export function useAcademyClassAssignment(id: string | undefined) {
  return useQuery({
    enabled: !!id,
    queryKey: ["academy-class-assignment", id],
    queryFn: () => academyClassAssignmentsApi.findById(id!),
  })
}

export function useAcademyClassAssignments(liveClassId: string) {
  return useQuery({
    enabled: !!liveClassId,
    queryKey: ["academy-class-assignments", liveClassId],
    queryFn: () => academyClassAssignmentsApi.findByLiveClassId(liveClassId),
  })
}

export function useAddAcademyClassAssignment(liveClassId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: AcademyLiveClassAssignmentCreateDTO) =>
      academyClassAssignmentsApi.add(liveClassId, input),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["academy-class-assignments", liveClassId] }),
  })
}

export function useUpdateAcademyClassAssignment(liveClassId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: AcademyLiveClassAssignmentUpdateDTO
    }) => academyClassAssignmentsApi.update(id, input),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["academy-class-assignments", liveClassId] }),
  })
}

export function useRemoveAcademyClassAssignment(liveClassId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => academyClassAssignmentsApi.remove(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["academy-class-assignments", liveClassId] }),
  })
}
