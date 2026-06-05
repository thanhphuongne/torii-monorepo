import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/api-client"
import type {
  AcademyQuestionCreateDTO,
  AcademyQuestionQueryDTO,
  AcademyQuestionUpdateDTO,
  StandardApiResponse,
  AcademyQuestionType,
  AcademyQuestionReviewStatus,
} from "@workspace/schemas"

export type AcademyQuestion = {
  id: string
  parentId?: string | null
  stem: string
  explanation?: string | null
  questionType: AcademyQuestionType
  reviewStatus: AcademyQuestionReviewStatus
  options?: any[]
  correctAnswer?: any
  content?: string
  mediaUrl?: string
  level?: string
  categoryType?: string
  createdAt: string
  updatedAt: string
}

export const academyQuestionsApi = {
  async findAll(params: AcademyQuestionQueryDTO) {
    const res = await apiClient.get<StandardApiResponse<{ items: AcademyQuestion[] }>>(
      "/api/academy/questions",
      { params },
    )
    return res.data.data!.items
  },

  async findById(id: string) {
    const res = await apiClient.get<StandardApiResponse<{ item: AcademyQuestion }>>(
      `/api/academy/questions/${id}`,
    )
    return res.data.data!.item
  },

  async create(input: AcademyQuestionCreateDTO) {
    const res = await apiClient.post<StandardApiResponse<{ item: AcademyQuestion }>>(
      "/api/academy/questions",
      input,
    )
    return res.data.data!.item
  },

  async update({ id, dto }: { id: string; dto: AcademyQuestionUpdateDTO }) {
    const res = await apiClient.put<StandardApiResponse<{ item: AcademyQuestion }>>(
      `/api/academy/questions/${id}`,
      dto,
    )
    return res.data.data!.item
  },

  async delete(id: string) {
    const res = await apiClient.delete<StandardApiResponse<{ ok: boolean }>>(
      `/api/academy/questions/${id}`,
    )
    return res.data
  },
}

export function useAcademyQuestions(params: AcademyQuestionQueryDTO) {
  return useQuery({
    queryKey: ["academy-questions", params],
    queryFn: () => academyQuestionsApi.findAll(params),
  })
}

export function useAcademyQuestion(id?: string) {
  return useQuery({
    enabled: !!id,
    queryKey: ["academy-question", id],
    queryFn: () => academyQuestionsApi.findById(id!),
  })
}

export function useCreateAcademyQuestion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: academyQuestionsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["academy-questions"] }),
  })
}

export function useUpdateAcademyQuestion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: academyQuestionsApi.update,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["academy-questions"] })
      qc.invalidateQueries({ queryKey: ["academy-question", variables.id] })
    },
  })
}

export function useDeleteAcademyQuestion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => academyQuestionsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["academy-questions"] }),
  })
}
