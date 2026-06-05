import { useQuery } from "@tanstack/react-query"
import { apiClient } from "../api-client"
import type { StandardApiResponse } from "@workspace/schemas"

export type JlptMockTemplateSection = {
  id: string
  code: string
  title: string
  durationMinutes: number
  orderIndex: number
  isListening: boolean
}

export type JlptMockTemplateQuestion = {
  id: string
  sectionId: string
  mondaiId: string | null
  mondai?: {
    id: string
    code: string
    titleVi?: string | null
    titleJa?: string | null
  } | null
  questionId: string
  orderIndex: number
  question: {
    id: string
    stemText: string
    contextText?: string | null
    sectionCode: string
    audioAssetId?: string | null
    imageAssetId?: string | null
    options: {
      id: string
      key: string
      contentText: string
      orderIndex: number
    }[]
  }
}

export type JlptMockTemplate = {
  id: string
  code: string
  title: string
  level: { code: string }
  sections: JlptMockTemplateSection[]
  questions: JlptMockTemplateQuestion[]
}

export type JlptMockAttempt = {
  id: string
  templateId: string
  status: string
  levelCode: string
  startedAt?: string | null
  deadlineAt?: string | null
  // endsAt chỉ có ý nghĩa khi bạn đang làm 1 section (thường là section đầu).
  // Backend trả về trong response khi startAttempt/nextSection.
  endsAt?: string | null
}

export type JlptMockAttemptHistoryItem = {
  id: string
  templateId: string
  status: string
  levelCode: string
  startedAt: string | null
  submittedAt: string | null
  template: {
    id: string
    code: string | null
    title: string
  }
}

export type JlptMockAttemptAnswerItem = {
  templateQuestionId: string
  selectedOptionId: string | null
  answeredAt: string
}

export const jlptMockApi = {
  async findTemplates(params: { levelCode?: string } = {}) {
    const res = await apiClient.get<
      StandardApiResponse<{ items: { id: string; code: string; title: string; levelCode: string; totalDurationMinutes?: number | null }[] }>
    >("/api/academy/jlpt-mock/templates", {
      params,
    })
    return res.data.data?.items ?? []
  },

  async findTemplateById(id: string): Promise<JlptMockTemplate> {
    const res = await apiClient.get<
      StandardApiResponse<{ item: JlptMockTemplate }>
    >(`/api/academy/jlpt-mock/templates/${id}`)
    return res.data.data!.item
  },

  async startAttempt(dto: { templateId: string }) {
    const res = await apiClient.post<
      StandardApiResponse<{ item: { attemptId: string; endsAt?: string | null } }>
    >("/api/academy/jlpt-mock/attempts/start", dto)
    const payload = res.data.data!.item
    return {
      id: payload.attemptId,
      templateId: dto.templateId,
      endsAt: payload.endsAt ?? null,
    } as JlptMockAttempt
  },

  async saveAnswers(dto: {
    attemptId: string
    answers: { templateQuestionId: string; selectedOptionId?: string }[]
  }) {
    const res = await apiClient.post<
      StandardApiResponse<{ item: JlptMockAttempt }>
    >("/api/academy/jlpt-mock/attempts/save-answers", dto)
    return res.data.data!.item
  },

  async nextSection(dto: { attemptId: string; currentSectionOrder: number }) {
    const res = await apiClient.post<
      StandardApiResponse<{ item: { currentSectionOrder: number; endsAt?: string } }>
    >("/api/academy/jlpt-mock/attempts/next-section", dto)
    return res.data.data!.item
  },

  async submitAttempt(dto: { attemptId: string }) {
    const res = await apiClient.post<
      StandardApiResponse<{ item: JlptMockAttempt }>
    >("/api/academy/jlpt-mock/attempts/submit", dto)
    return res.data.data!.item
  },

  async getAttemptById(id: string) {
    const res = await apiClient.get<
      StandardApiResponse<{ item: unknown }>
    >(`/api/academy/jlpt-mock/attempts/${id}`)

    // Controller có thể trả về success: false (không phải throw HTTP), khi đó res.data.data sẽ undefined.
    if (!res.data?.success) {
      throw new Error(res.data?.message ?? 'Không tải được kết quả bài thi')
    }

    const item = res.data.data?.item
    if (!item) {
      throw new Error('Không tìm thấy kết quả bài thi cho attemptId này')
    }

    return item
  },

  async findAttemptHistory() {
    const res = await apiClient.get<
      StandardApiResponse<{ items: JlptMockAttemptHistoryItem[] }>
    >("/api/academy/jlpt-mock/attempts/history")
    return res.data.data?.items ?? []
  },

  async getAttemptAnswers(attemptId: string) {
    const res = await apiClient.get<
      StandardApiResponse<{ items: JlptMockAttemptAnswerItem[] }>
    >(`/api/academy/jlpt-mock/attempts/${attemptId}/answers`)
    return res.data.data?.items ?? []
  },
}

export function useJlptMockTemplates(levelCode?: string) {
  return useQuery({
    queryKey: ["jlpt-mock-templates", levelCode ?? "all"],
    queryFn: () => jlptMockApi.findTemplates({ levelCode }),
  })
}
