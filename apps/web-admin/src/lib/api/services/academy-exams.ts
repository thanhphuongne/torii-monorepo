import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/api-client"
import type {
  AcademyExamCreateDTO,
  AcademyExamQueryDTO,
  AcademyExamUpdateDTO,
  AcademyExamAddQuestionsDTO,
  StandardApiResponse,
  AcademyExamStatus,
  AcademyExamType,
} from "@workspace/schemas"

export type AcademyExam = {
  id: string
  courseProfileId?: string | null
  title: string
  description?: string | null
  examType: AcademyExamType
  level?: string | null
  totalTimeLimitMinutes?: number | null
  status: AcademyExamStatus
  settings: any
  sections?: any[]
  examQuestions?: any[]
  createdAt: string
  updatedAt: string
}

export const academyExamsApi = {
  async findAll(params: AcademyExamQueryDTO) {
    const res = await apiClient.get<StandardApiResponse<{ items: AcademyExam[] }>>(
      "/api/academy/exams",
      { params },
    )
    return res.data.data!.items
  },

  async findById(id: string) {
    const res = await apiClient.get<StandardApiResponse<{ item: AcademyExam }>>(
      `/api/academy/exams/${id}`,
    )
    return res.data.data!.item
  },

  async create(input: AcademyExamCreateDTO) {
    const res = await apiClient.post<StandardApiResponse<{ item: AcademyExam }>>(
      "/api/academy/exams",
      input,
    )
    return res.data.data!.item
  },

  async update({ id, dto }: { id: string; dto: AcademyExamUpdateDTO }) {
    const res = await apiClient.put<StandardApiResponse<{ item: AcademyExam }>>(
      `/api/academy/exams/${id}`,
      dto,
    )
    return res.data.data!.item
  },

  async delete(id: string) {
    const res = await apiClient.delete<StandardApiResponse<{ ok: boolean }>>(
      `/api/academy/exams/${id}`,
    )
    return res.data
  },

  async addQuestions(data: AcademyExamAddQuestionsDTO) {
    const res = await apiClient.post<StandardApiResponse<{ ok: boolean }>>(
      "/api/academy/exams/add-questions",
      data,
    )
    return res.data
  },

  async removeQuestion(examQuestionId: string) {
    const res = await apiClient.delete<StandardApiResponse<{ ok: boolean }>>(
      `/api/academy/exams/questions/${examQuestionId}`,
    )
    return res.data
  },
}

export function useAcademyExams(params: AcademyExamQueryDTO) {
  return useQuery({
    queryKey: ["academy-exams", params],
    queryFn: () => academyExamsApi.findAll(params),
  })
}

export function useAcademyExam(id?: string) {
  return useQuery({
    enabled: !!id,
    queryKey: ["academy-exam", id],
    queryFn: () => academyExamsApi.findById(id!),
  })
}

export function useCreateAcademyExam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: academyExamsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["academy-exams"] }),
  })
}

export function useUpdateAcademyExam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: academyExamsApi.update,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["academy-exams"] })
      qc.invalidateQueries({ queryKey: ["academy-exam", variables.id] })
    },
  })
}

export function useDeleteAcademyExam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => academyExamsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["academy-exams"] }),
  })
}

export function useAddQuestionsToExam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: academyExamsApi.addQuestions,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["academy-exam"] })
    },
  })
}

export function useRemoveQuestionFromExam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: academyExamsApi.removeQuestion,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["academy-exam"] })
    },
  })
}
