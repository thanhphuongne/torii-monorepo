import { apiClient } from "../api-client";
import type { StandardApiResponse } from "@workspace/schemas";

export type JlptMockTemplate = {
  id: string;
  code: string;
  title: string;
  description?: string;
  status: string;
  levelCode: string;
  totalDurationMinutes?: number;
};

export type JlptLevel = {
  id: string;
  code: string;
  nameVi: string | null;
  totalDurationMinutes: number;
};

export type JlptScoringProfile = {
  id: string;
  name: string;
  isActive: boolean;
  minLanguageScaled: number | null;
  minReadingScaled: number | null;
  minListeningScaled: number | null;
  minTotalScaled: number | null;
};

export type JlptScoringMapping = {
  id: string;
  profileId: string;
  domain: "LANGUAGE" | "READING" | "LISTENING";
  rawScore: number;
  scaledScore: number;
};

export type JlptSection = {
  id: string;
  code: string;
  durationMinutes: number;
  orderIndex: number;
  isListening: boolean;
  nameVi: string | null;
};

export type JlptBankQuestionMondai = {
  id: string;
  code: string;
  titleVi: string;
  /** Tên dạng bài theo đề JLPT (tiếng Nhật), ví dụ 漢字読み */
  titleJa?: string | null;
};

/** Dữ liệu thô từ API có thể có `level: { code }` thay vì `levelCode` ở root. */
export type JlptBankQuestion = {
  id: string;
  levelCode: string;
  sectionCode: string;
  questionType: string;
  /** EASY | MEDIUM | HARD */
  difficulty?: string;
  stemText: string;
  explanation?: string | null;
  contextText?: string | null;
  audioAssetId?: string | null;
  imageAssetId?: string | null;
  options: {
    id: string;
    key: string;
    contentText: string;
    isCorrect: boolean;
  }[];
  mondai?: JlptBankQuestionMondai | null;
  level?: { code: string };
};

export function normalizeJlptBankQuestion(raw: Record<string, unknown> | null | undefined): JlptBankQuestion {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid bank question payload');
  }
  const levelCode =
    (typeof raw.levelCode === 'string' && raw.levelCode) ||
    (raw.level && typeof (raw.level as { code?: string }).code === 'string'
      ? (raw.level as { code: string }).code
      : '');

  const optionsRaw = Array.isArray(raw.options) ? raw.options : [];
  const options = optionsRaw.map((o: Record<string, unknown>) => ({
    id: String(o.id ?? ''),
    key: String(o.key ?? ''),
    contentText: String(o.contentText ?? ''),
    isCorrect: Boolean(o.isCorrect),
  }));

  const mondaiRaw = raw.mondai && typeof raw.mondai === 'object' ? (raw.mondai as Record<string, unknown>) : null;
  const mondai = mondaiRaw
    ? ({
        id: String(mondaiRaw.id ?? ''),
        code: String(mondaiRaw.code ?? ''),
        titleVi: String(mondaiRaw.titleVi ?? ''),
        titleJa:
          mondaiRaw.titleJa != null && mondaiRaw.titleJa !== ''
            ? String(mondaiRaw.titleJa)
            : null,
      } satisfies JlptBankQuestionMondai)
    : null;

  return {
    id: String(raw.id ?? ''),
    levelCode,
    sectionCode: String(raw.sectionCode ?? ''),
    questionType: String(raw.questionType ?? ''),
    difficulty:
      raw.difficulty != null && raw.difficulty !== ''
        ? String(raw.difficulty)
        : undefined,
    stemText: String(raw.stemText ?? ''),
    explanation:
      raw.explanation != null && raw.explanation !== ''
        ? String(raw.explanation)
        : undefined,
    contextText: raw.contextText != null ? String(raw.contextText) : undefined,
    audioAssetId: raw.audioAssetId != null ? String(raw.audioAssetId) : undefined,
    imageAssetId: raw.imageAssetId != null ? String(raw.imageAssetId) : undefined,
    options,
    mondai,
    level: raw.level && typeof raw.level === 'object' ? (raw.level as { code: string }) : undefined,
  };
}

export const academyJlptMockApi = {
  // Templates
  async findAllTemplates(params: { levelCode?: string; status?: string; q?: string } = {}) {
    const res = await apiClient.get<StandardApiResponse<{ items: JlptMockTemplate[] }>>(
      "/api/academy/jlpt-mock/admin/templates",
      {
        params: {
          level: params.levelCode,
          status: params.status,
          q: params.q,
        },
      },
    );
    return res.data.data?.items ?? [];
  },

  async findTemplateById(id: string) {
    const res = await apiClient.get<StandardApiResponse<{ item: any }>>(
      `/api/academy/jlpt-mock/admin/templates/${id}`,
    );
    return res.data.data?.item;
  },

  async createTemplate(data: any) {
    const { levelCode, ...rest } = data;
    const level = (typeof data.level === 'string' && data.level) || (typeof levelCode === 'string' ? levelCode : undefined);
    const body = { ...rest, ...(level ? { level } : {}) };
    const res = await apiClient.post<StandardApiResponse<{ item: JlptMockTemplate }>>(
      "/api/academy/jlpt-mock/admin/templates",
      body
    );
    return res.data.data?.item;
  },

  async updateTemplate(id: string, data: any) {
    const res = await apiClient.patch<StandardApiResponse<{ item: JlptMockTemplate }>>(
      `/api/academy/jlpt-mock/admin/templates/${id}`,
      data
    );
    return res.data.data?.item;
  },

  async deleteTemplate(id: string) {
    const res = await apiClient.delete<StandardApiResponse<{ ok: boolean }>>(
      `/api/academy/jlpt-mock/admin/templates/${id}`,
    );
    return res.data.data?.ok;
  },

  async attachQuestions(templateId: string, items: { questionId: string; sectionId: string; orderIndex: number; weight?: number; mondaiId?: string }[]) {
    const res = await apiClient.post<StandardApiResponse<{ ok: boolean }>>(
      `/api/academy/jlpt-mock/admin/templates/${templateId}/attach-questions`,
      { items }
    );
    return res.data.data?.ok;
  },

  async deleteTemplateQuestion(id: string) {
    const res = await apiClient.delete<StandardApiResponse<{ ok: boolean }>>(
      `/api/academy/jlpt-mock/admin/templates/questions/${id}`
    );
    return res.data.data?.ok;
  },

  // Bank Questions (phân trang server: `page`, `limit`; `take` = alias `limit`)
  async findAllBankQuestions(
    params: {
      level?: string;
      sectionCode?: string;
      q?: string;
      mondaiCode?: string;
      questionType?: string;
      difficulty?: string;
      page?: number;
      limit?: number;
      take?: number;
    } = {},
  ) {
    const res = await apiClient.get<
      StandardApiResponse<{
        items: Record<string, unknown>[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>
    >("/api/academy/jlpt-mock/admin/bank-questions", { params });
    const payload = res.data.data;
    const rows = Array.isArray(payload?.items) ? payload.items : [];
    return {
      items: rows.map((row) => normalizeJlptBankQuestion(row)),
      total: payload?.total ?? 0,
      page: payload?.page ?? 1,
      limit: payload?.limit ?? 20,
      totalPages: payload?.totalPages ?? 0,
    };
  },

  async listBankMondaiOptions(params: { level: string; sectionCode: string }) {
    const res = await apiClient.get<
      StandardApiResponse<{
        items: { id: string; code: string; titleVi: string | null; titleJa: string | null }[];
      }>
    >("/api/academy/jlpt-mock/admin/bank-questions/mondai-options", { params });
    return res.data.data?.items ?? [];
  },

  async createBankQuestion(data: Record<string, unknown>) {
    const { levelCode, ...rest } = data;
    const level = (typeof data.level === 'string' && data.level) || (typeof levelCode === 'string' ? levelCode : undefined);
    const body = { ...rest, ...(level ? { level } : {}) };
    const res = await apiClient.post<StandardApiResponse<{ item: Record<string, unknown> }>>(
      "/api/academy/jlpt-mock/admin/bank-questions",
      body,
    );
    const item = res.data.data?.item;
    return item ? normalizeJlptBankQuestion(item) : undefined;
  },

  async updateBankQuestion(id: string, data: any) {
    const res = await apiClient.patch<StandardApiResponse<{ item: Record<string, unknown> }>>(
      `/api/academy/jlpt-mock/admin/bank-questions/${id}`,
      data,
    );
    const item = res.data.data?.item;
    return item ? normalizeJlptBankQuestion(item) : undefined;
  },

  async deleteBankQuestion(id: string) {
    const res = await apiClient.delete<StandardApiResponse<{ ok: boolean }>>(
      `/api/academy/jlpt-mock/admin/bank-questions/${id}`,
    );
    return res.data.data?.ok;
  },

  async findBankQuestionById(id: string) {
    const res = await apiClient.get<StandardApiResponse<{ item: Record<string, unknown> }>>(
      `/api/academy/jlpt-mock/admin/bank-questions/${id}`,
    );
    const item = res.data.data?.item;
    return item ? normalizeJlptBankQuestion(item) : undefined;
  },

  async createMondai(data: {
    level: string;
    sectionCode: string;
    code: string;
    titleVi?: string;
    titleJa?: string;
    descriptionVi?: string;
    orderIndex: number;
    recommendedQuestionCount?: number;
  }) {
    const res = await apiClient.post<StandardApiResponse<{ item: Record<string, unknown> }>>(
      "/api/academy/jlpt-mock/admin/mondai",
      data,
    );
    return res.data.data?.item;
  },

  async updateMondai(
    id: string,
    data: Partial<{
      code: string;
      titleVi: string;
      titleJa: string;
      descriptionVi: string;
      orderIndex: number;
      recommendedQuestionCount: number;
    }>,
  ) {
    const res = await apiClient.patch<StandardApiResponse<{ item: Record<string, unknown> }>>(
      `/api/academy/jlpt-mock/admin/mondai/${id}`,
      data,
    );
    return res.data.data?.item;
  },

  async deleteMondai(id: string) {
    const res = await apiClient.delete<StandardApiResponse<{ ok: boolean }>>(
      `/api/academy/jlpt-mock/admin/mondai/${id}`,
    );
    return res.data.data?.ok;
  },

  // JLPT Config
  async listLevels() {
    const res = await apiClient.get<StandardApiResponse<{ items: JlptLevel[] }>>(
      "/api/academy/jlpt-mock/admin/config/levels",
    );
    return res.data.data?.items ?? [];
  },

  async ensureLevelConfig(params: { level: string; nameVi?: string }) {
    const res = await apiClient.post<StandardApiResponse<{ ok: boolean }>>(
      "/api/academy/jlpt-mock/admin/config/levels",
      params,
    );
    return res.data.data?.ok;
  },

  async getActiveScoringProfile(level: string) {
    const res = await apiClient.get<StandardApiResponse<{ item: JlptScoringProfile | null }>>(
      "/api/academy/jlpt-mock/admin/config/active-scoring-profile",
      { params: { level } },
    );
    return res.data.data?.item ?? null;
  },

  async createScoringProfile(data: {
    level: string;
    name: string;
    isActive?: boolean;
    minLanguageScaled?: number;
    minReadingScaled?: number;
    minListeningScaled?: number;
    minTotalScaled?: number;
  }) {
    const res = await apiClient.post<StandardApiResponse<{ item: JlptScoringProfile }>>(
      "/api/academy/jlpt-mock/admin/config/scoring-profiles",
      data,
    );
    return res.data.data?.item;
  },

  async upsertScoringMappings(data: {
    profileId: string;
    items: Array<{
      domain: "LANGUAGE" | "READING" | "LISTENING";
      rawScore: number;
      scaledScore: number;
    }>;
  }) {
    const res = await apiClient.post<StandardApiResponse<{ items: JlptScoringMapping[] }>>(
      "/api/academy/jlpt-mock/admin/config/scoring-mappings",
      data,
    );
    return res.data.data?.items ?? [];
  },

  async listScoringMappings(profileId: string) {
    const res = await apiClient.get<StandardApiResponse<{ items: JlptScoringMapping[] }>>(
      "/api/academy/jlpt-mock/admin/config/scoring-mappings",
      { params: { profileId } },
    );
    return res.data.data?.items ?? [];
  },

  async assembleTemplateRandom(
    templateId: string,
    data: { perMondaiCount?: number; clearExisting?: boolean } = {},
  ) {
    const res = await apiClient.post<
      StandardApiResponse<{ ok: boolean; attachedCount: number }>
    >(`/api/academy/jlpt-mock/admin/templates/${templateId}/assemble-random`, data);
    return res.data.data;
  },

  async listSectionsForLevel(level: string) {
    const res = await apiClient.get<StandardApiResponse<{ items: JlptSection[] }>>(
      `/api/academy/jlpt-mock/admin/config/levels/${level}/sections`,
    );
    return res.data.data?.items ?? [];
  },
};
