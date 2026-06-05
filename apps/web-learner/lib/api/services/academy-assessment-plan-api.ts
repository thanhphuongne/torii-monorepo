import { useQuery } from "@tanstack/react-query"
import { apiClient } from "../api-client"
import type { StandardApiResponse } from "@workspace/schemas"

export type AcademyAssessmentStatus = {
  assessmentId: string
  examId: string
  kind: string
  isRequired?: boolean
  status: 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'PASSED' | 'FAILED'
  moduleId?: string
  triggerLessonId?: string
  latestAttemptId?: string
  score?: number
  percentage?: number
  isPassed?: boolean
  examTitle?: string
}

export const academyAssessmentPlanApi = {
  async getLearnerStatus(params: { deliveryTargetId?: string; enrollmentId?: string }) {
    const res = await apiClient.get<StandardApiResponse<{ items: AcademyAssessmentStatus[] }>>(
      "/api/academy/assessment-plans/learner/status",
      { params },
    )
    return res.data.data!.items
  },
}

export function useAcademyLearnerAssessmentStatus(params: { deliveryTargetId?: string; enrollmentId?: string }) {
  return useQuery({
    enabled: !!(params.deliveryTargetId || params.enrollmentId),
    queryKey: ["academy-learner-assessment-status", params],
    queryFn: () => academyAssessmentPlanApi.getLearnerStatus(params),
  })
}
