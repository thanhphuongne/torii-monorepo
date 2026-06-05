import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/api-client"
import type {
  AcademyUpdateAssessmentPlanDTO,
  StandardApiResponse,
} from "@workspace/schemas"

export type AcademyAssessmentPlanItem = {
  id: string
  courseProfileId: string
  examId: string
  assessmentKind: string
  moduleId?: string | null
  triggerLessonId?: string | null
  orderIndex: number
  isRequired: boolean
  isActive: boolean
  exam?: {
    title: string
    examType: string
  }
}

export const academyAssessmentPlansApi = {
  async findByCourseProfileId(courseProfileId: string) {
    const res = await apiClient.get<StandardApiResponse<{ items: AcademyAssessmentPlanItem[] }>>(
      `/api/academy/assessment-plans/${courseProfileId}`,
    )
    return res.data.data!.items
  },

  async updatePlan(dto: AcademyUpdateAssessmentPlanDTO) {
    const res = await apiClient.post<StandardApiResponse<{ ok: boolean }>>(
      "/api/academy/assessment-plans/update",
      dto,
    )
    return res.data
  },

  async getLearnerStatus(params: { deliveryTargetId?: string; enrollmentId?: string }) {
    const res = await apiClient.get<StandardApiResponse<{ items: any[] }>>(
      "/api/academy/assessment-plans/learner/status",
      { params },
    )
    return res.data.data!.items
  },
}

export function useAcademyAssessmentPlan(courseProfileId?: string) {
  return useQuery({
    enabled: !!courseProfileId,
    queryKey: ["academy-assessment-plan", courseProfileId],
    queryFn: () => academyAssessmentPlansApi.findByCourseProfileId(courseProfileId!),
  })
}

export function useUpdateAcademyAssessmentPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: academyAssessmentPlansApi.updatePlan,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["academy-assessment-plan", variables.courseProfileId] })
    },
  })
}

export function useAcademyLearnerAssessmentStatus(params: { deliveryTargetId?: string; enrollmentId?: string }) {
  return useQuery({
    enabled: !!(params.deliveryTargetId || params.enrollmentId),
    queryKey: ["academy-learner-assessment-status", params],
    queryFn: () => academyAssessmentPlansApi.getLearnerStatus(params),
  })
}
