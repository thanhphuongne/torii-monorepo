import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query"
import { apiClient } from "../api-client"
import type {
    AcademyExamAttemptStartDTO,
    AcademyExamAttemptSaveAnswersDTO,
    AcademyExamAttemptSubmitDTO,
    StandardApiResponse,
} from "@workspace/schemas"

export type AcademyExam = {
    id: string
    courseProfileId?: string | null
    title: string
    description?: string | null
    examType: string
    level?: string | null
    totalTimeLimitMinutes?: number | null
    status?: string | null
    settings?: any
    sections?: any[]
    examQuestions?: any[]
    createdAt: string
    updatedAt: string
}

export type AcademyExamAttempt = {
    id: string
    examId: string
    userId: string
    enrollmentId?: string | null
    status: string
    score?: number
    maxScore?: number
    percentage?: number
    isPassed?: boolean
    draftAnswers?: any
    startedAt: string
    submittedAt?: string
    completedAt?: string
    deadlineAt?: string
    timeTakenSeconds?: number
    exam: AcademyExam
    answers?: any[]
    details?: any[]
    quizTitle?: string
}

export const academyExamsApi = {
    async findById(id: string) {
        const res = await apiClient.get<StandardApiResponse<{ item: AcademyExam }>>(
            `/api/academy/exams/${id}`,
        )
        return res.data.data!.item
    },

    async startAttempt(dto: AcademyExamAttemptStartDTO) {
        const res = await apiClient.post<StandardApiResponse<{ item: AcademyExamAttempt }>>(
            "/api/academy/exam-attempts/start",
            dto,
        )
        return res.data.data!.item
    },

    async saveAnswers(dto: AcademyExamAttemptSaveAnswersDTO) {
        const res = await apiClient.post<StandardApiResponse<{ item: AcademyExamAttempt }>>(
            "/api/academy/exam-attempts/save-draft",
            dto,
        )
        return res.data.data!.item
    },

    async submitAttempt(dto: AcademyExamAttemptSubmitDTO) {
        const res = await apiClient.post<StandardApiResponse<{ item: AcademyExamAttempt }>>(
            "/api/academy/exam-attempts/submit",
            dto,
        )
        return res.data.data!.item
    },

    async findAttemptById(id: string) {
        const res = await apiClient.get<StandardApiResponse<{ item: AcademyExamAttempt }>>(
            `/api/academy/exam-attempts/${id}`,
        )
        return res.data.data!.item
    },

    async findAttempts(params?: {
        examId?: string
        status?: string
        userId?: string
        enrollmentId?: string
    }) {
        const res = await apiClient.get<StandardApiResponse<{ items: AcademyExamAttempt[] }>>(
            "/api/academy/exam-attempts",
            { params },
        )
        return res.data.data!.items
    },
}

export function useAcademyExam(id?: string) {
    return useQuery({
        enabled: !!id,
        queryKey: ["academy-exam", id],
        queryFn: () => academyExamsApi.findById(id!),
    })
}

export function useStartAcademyExamAttempt() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: academyExamsApi.startAttempt,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["academy-exam-attempts"] })
        },
    })
}

export function useSaveAcademyExamDraft() {
    return useMutation({
        mutationFn: academyExamsApi.saveAnswers,
    })
}

export function useSubmitAcademyExamAttempt() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: academyExamsApi.submitAttempt,
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: ["academy-exam-attempts"] })
            qc.invalidateQueries({ queryKey: ["academy-exam-attempt", data.id] })
            qc.invalidateQueries({ queryKey: ["academy-learner-assessment-status"] })
        },
    })
}

export function useAcademyExamAttempt(id?: string) {
    return useQuery({
        enabled: !!id,
        queryKey: ["academy-exam-attempt", id],
        queryFn: () => academyExamsApi.findAttemptById(id!),
    })
}

export function useAcademyExamAttempts(params?: {
    examId?: string
    status?: string
    userId?: string
    enrollmentId?: string
}) {
    return useQuery({
        queryKey: ["academy-exam-attempts", params],
        queryFn: () => academyExamsApi.findAttempts(params),
    })
}
