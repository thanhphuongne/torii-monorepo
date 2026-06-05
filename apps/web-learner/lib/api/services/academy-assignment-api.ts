import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "../api-client"
import type {
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
  content?: any
  fileUrls?: string[]
  feedback?: string | null
  createdAt: string
  updatedAt: string
}

export const academyAssignmentApi = {
  async findAssignmentsByLiveClassId(liveClassId: string) {
    const res = await apiClient.get<
      StandardApiResponse<{ items: AcademyClassAssignment[] }>
    >(`/api/academy/live-classes/${liveClassId}/assignments`)
    return res.data.data!.items
  },

  async findMySubmissions(liveClassId: string) {
    const res = await apiClient.get<
      StandardApiResponse<{ items: AcademyAssignmentSubmission[] }>
    >("/api/academy/assignment-submissions", {
      params: { liveClassId },
    })
    return res.data.data!.items
  },

  async submitAssignment(input: {
    liveClassId: string
    classAssessmentId: string
    assignmentTemplateId: string
    content: any
    fileUrls?: string[]
  }) {
    const res = await apiClient.post<
      StandardApiResponse<{ item: AcademyAssignmentSubmission }>
    >("/api/academy/assignment-submissions", input)
    return res.data.data!.item
  }
}

export function useAcademyClassAssignments(liveClassId: string) {
  return useQuery({
    enabled: !!liveClassId,
    queryKey: ["academy-class-assignments", liveClassId],
    queryFn: () => academyAssignmentApi.findAssignmentsByLiveClassId(liveClassId),
  })
}

export function useMyAssignmentSubmissions(liveClassId: string) {
  return useQuery({
    enabled: !!liveClassId,
    queryKey: ["academy-my-submissions", liveClassId],
    queryFn: () => academyAssignmentApi.findMySubmissions(liveClassId),
  })
}

export function useSubmitAssignment(liveClassId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      classAssessmentId: string
      assignmentTemplateId: string
      content: any
      fileUrls?: string[]
    }) => academyAssignmentApi.submitAssignment({ ...input, liveClassId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["academy-my-submissions", liveClassId] })
      qc.invalidateQueries({ queryKey: ["academy-class-assignments", liveClassId] })
    },
  })
}
