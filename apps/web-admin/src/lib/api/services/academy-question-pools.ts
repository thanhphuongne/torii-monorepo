import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/api-client"
import type {
    AcademyQuestionPoolCreateDTO,
    AcademyQuestionPoolQueryDTO,
    AcademyQuestionPoolUpdateDTO,
    StandardApiResponse,
    AddPoolQuestionsDTO,
    SampleQuestionsDTO,
} from "@workspace/schemas"

export type AcademyQuestionPool = {
    id: string
    code?: string | null
    name: string
    description?: string | null
    courseProfileId?: string | null
    level?: string | null
    category?: string | null
    status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
    metadata?: unknown | null
    createdAt: string
    updatedAt: string
    _count?: {
        poolQuestions: number
    }
}

export type PoolQuestion = {
    poolId: string
    questionId: string
    orderIndex: number
    question: any // Should be AcademyQuestion
}

export const academyQuestionPoolsApi = {
    async findAll(params: AcademyQuestionPoolQueryDTO) {
        const res = await apiClient.get<StandardApiResponse<{ items: AcademyQuestionPool[] }>>(
            "/api/academy/question-pools",
            { params },
        )
        return res.data.data!.items
    },

    async findById(id: string) {
        const res = await apiClient.get<StandardApiResponse<{ item: AcademyQuestionPool }>>(
            `/api/academy/question-pools/${id}`,
        )
        return res.data.data!.item
    },

    async create(input: AcademyQuestionPoolCreateDTO) {
        const res = await apiClient.post<StandardApiResponse<{ item: AcademyQuestionPool }>>(
            "/api/academy/question-pools",
            input,
        )
        return res.data.data!.item
    },

    async update(id: string, input: AcademyQuestionPoolUpdateDTO) {
        const res = await apiClient.patch<StandardApiResponse<{ item: AcademyQuestionPool }>>(
            `/api/academy/question-pools/${id}`,
            input,
        )
        return res.data.data!.item
    },

    async delete(id: string) {
        const res = await apiClient.delete<StandardApiResponse<{ ok: boolean }>>(
            `/api/academy/question-pools/${id}`,
        )
        return res.data
    },

    async getQuestions(id: string) {
        const res = await apiClient.get<StandardApiResponse<{ items: PoolQuestion[] }>>(
            `/api/academy/question-pools/${id}/questions`,
        )
        return res.data.data!.items
    },

    async addQuestions(id: string, input: AddPoolQuestionsDTO) {
        const res = await apiClient.post<StandardApiResponse<{ ok: boolean }>>(
            `/api/academy/question-pools/${id}/questions`,
            input,
        )
        return res.data
    },

    async removeQuestion(id: string, questionId: string) {
        const res = await apiClient.delete<StandardApiResponse<{ ok: boolean }>>(
            `/api/academy/question-pools/${id}/questions/${questionId}`,
        )
        return res.data
    },

    async sample(id: string, input: SampleQuestionsDTO) {
        const res = await apiClient.post<StandardApiResponse<{ items: any[] }>>(
            `/api/academy/question-pools/${id}/sample`,
            input,
        )
        return res.data.data!.items
    },
}

export function useAcademyQuestionPools(params: AcademyQuestionPoolQueryDTO) {
    return useQuery({
        queryKey: ["academy-question-pools", params],
        queryFn: () => academyQuestionPoolsApi.findAll(params),
    })
}

export function useAcademyQuestionPool(id?: string) {
    return useQuery({
        enabled: !!id,
        queryKey: ["academy-question-pool", id],
        queryFn: () => academyQuestionPoolsApi.findById(id!),
    })
}

export function useCreateAcademyQuestionPool() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: academyQuestionPoolsApi.create,
        onSuccess: () => qc.invalidateQueries({ queryKey: ["academy-question-pools"] }),
    })
}

export function useUpdateAcademyQuestionPool() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: AcademyQuestionPoolUpdateDTO }) =>
            academyQuestionPoolsApi.update(id, input),
        onSuccess: (_, variables) => {
            qc.invalidateQueries({ queryKey: ["academy-question-pools"] })
            qc.invalidateQueries({ queryKey: ["academy-question-pool", variables.id] })
        },
    })
}

export function useDeleteAcademyQuestionPool() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => academyQuestionPoolsApi.delete(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["academy-question-pools"] }),
    })
}

export function useQuestionPoolQuestions(id?: string) {
    return useQuery({
        enabled: !!id,
        queryKey: ["academy-question-pool-questions", id],
        queryFn: () => academyQuestionPoolsApi.getQuestions(id!),
    })
}

export function useAddPoolQuestions() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: AddPoolQuestionsDTO }) =>
            academyQuestionPoolsApi.addQuestions(id, input),
        onSuccess: (_, variables) => {
            qc.invalidateQueries({ queryKey: ["academy-question-pool-questions", variables.id] })
            qc.invalidateQueries({ queryKey: ["academy-question-pools"] })
        },
    })
}

export function useRemovePoolQuestion() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, questionId }: { id: string; questionId: string }) =>
            academyQuestionPoolsApi.removeQuestion(id, questionId),
        onSuccess: (_, variables) => {
            qc.invalidateQueries({ queryKey: ["academy-question-pool-questions", variables.id] })
            qc.invalidateQueries({ queryKey: ["academy-question-pools"] })
        },
    })
}
