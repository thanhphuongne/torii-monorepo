import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/api-client"
import type {
  AcademyExamAttemptQueryDTO,
  AcademyExamAttemptSaveAnswersDTO,
  AcademyExamAttemptStartDTO,
  AcademyExamAttemptSubmitDTO,
  StandardApiResponse,
} from "@workspace/schemas"

export type AcademyExamAttempt = {
  id: string
  examId: string
  enrollmentId?: string | null
  userId: string
  status: string
  startedAt: string
  submittedAt?: string | null
  completedAt?: string | null
  rawScore?: number | null
  maxScore?: number | null
  percentage?: number | null
  isPassed?: boolean | null
  details?: Array<{
    id: string
    questionId: string
    userAnswer?: any
    isCorrect?: boolean | null
    pointsEarned?: number | null
  }> | null
  createdAt: string
  updatedAt: string
}

export const academyExamAttemptsApi = {
  async findAll(params: AcademyExamAttemptQueryDTO) {
    const res = await apiClient.get<
      StandardApiResponse<{ items: AcademyExamAttempt[] }>
    >("/api/academy/exam-attempts", {
      params,
    })
    return res.data.data!.items
  },

  async findById(id: string) {
    const res = await apiClient.get<
      StandardApiResponse<{ item: AcademyExamAttempt }>
    >(`/api/academy/exam-attempts/${id}`)
    return res.data.data!.item
  },

  async start(input: AcademyExamAttemptStartDTO) {
    const res = await apiClient.post<
      StandardApiResponse<{ item: AcademyExamAttempt }>
    >("/api/academy/exam-attempts/start", input)
    return res.data.data!.item
  },

  async saveAnswers(input: AcademyExamAttemptSaveAnswersDTO) {
    const res = await apiClient.post<
      StandardApiResponse<{ item: AcademyExamAttempt }>
    >("/api/academy/exam-attempts/save-draft", input)
    return res.data.data!.item
  },

  async submit(input: AcademyExamAttemptSubmitDTO) {
    const res = await apiClient.post<
      StandardApiResponse<{ item: AcademyExamAttempt }>
    >("/api/academy/exam-attempts/submit", input)
    return res.data.data!.item
  },
}

export function useAcademyExamAttempts(params: AcademyExamAttemptQueryDTO) {
  return useQuery({
    queryKey: ["academy-exam-attempts", params],
    queryFn: () => academyExamAttemptsApi.findAll(params),
  })
}

export function useAcademyExamAttempt(id?: string) {
  return useQuery({
    enabled: !!id,
    queryKey: ["academy-exam-attempt", id],
    queryFn: () => academyExamAttemptsApi.findById(id!),
  })
}

export function useStartAcademyExamAttempt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: academyExamAttemptsApi.start,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["academy-exam-attempts"] }),
  })
}

export function useSaveAnswersAcademyExamAttempt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: academyExamAttemptsApi.saveAnswers,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["academy-exam-attempts"] }),
  })
}

export function useSubmitAcademyExamAttempt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: academyExamAttemptsApi.submit,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["academy-exam-attempts"] }),
  })
}

