import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api-client';
import {
    AgentChatResponseDTO,
    AgentGrammarCheckResponseDTO,
    AgentTranslateResponseDTO,
    AgentFlashcardResponseDTO,
    AgentConversationSimulationResponseDTO,
    AgentResourceRecommendationResponseDTO,
    AgentTestGenerationResponseDTO,
    AgentTestEvaluationResponseDTO,
    AgentReadinessProfileResponseDTO,
    StandardApiResponse,
} from '@workspace/schemas';

export interface AnalyticsSnapshot {
    progressData: any;
    studyPathData: any;
    profileData: any;
    generatedAt: string;
    targetLevel: string;
}

export interface FlashcardAutofillResponse {
    term: string;
    phonetic: string;
    definition: string;
    note: string;
    type: 'Từ vựng' | 'Ngữ pháp' | 'Hán tự' | 'Mẫu câu';
}

// Non-AI metrics/track types
export interface RoleplayResponse {
    response: string;
    romaji?: string;
    vietnamese?: string;
    feedback?: string | null;
    isFinished: boolean;
    tokenUsage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

export interface ProgressTrackResponse {
    timeframe: string;
    metrics: {
        completedLessons: number;
        averageScore: number;
        studyHours: number;
        streak?: number;
    };
    chartData: Array<{ date: string; score: number; lessons: number }>;
}

export interface StudyPathResponse {
    targetLevel: string;
    studyPathRecommendation: {
        roadmap: Array<{
            title: string;
            status: 'completed' | 'in-progress' | 'locked';
            description: string;
        }>;
        estimatedWeeks: number;
        focusAreas: string[];
    };
}

export interface ReportResponse {
    reportType: string;
    content: string; // Markdown or detailed object
    generatedAt: string;
}

// --- API Client ---

export const agentApi = {
    sensei: {
        chat: async (message: string, history: any[] = []): Promise<AgentChatResponseDTO> => {
            const response = await apiClient.post<{ success: boolean; data: AgentChatResponseDTO; message?: string }>('/api/agents/chat', {
                message,
                history
            });
            if (!response.data.success || !response.data.data) {
                throw new Error(response.data.message || 'Failed to chat with Sensei');
            }
            return response.data.data;
        },
        checkGrammar: async (text: string): Promise<AgentGrammarCheckResponseDTO> => {
            const response = await apiClient.post<{ success: boolean; data: AgentGrammarCheckResponseDTO; message?: string }>('/api/agents/grammar-check', {
                text
            });
            if (!response.data.success || !response.data.data) {
                throw new Error(response.data.message || 'Failed to check grammar');
            }
            return response.data.data;
        },
        translate: async (text: string, sourceLanguage: string, targetLanguage: string): Promise<AgentTranslateResponseDTO> => {
            const response = await apiClient.post<{ success: boolean; data: AgentTranslateResponseDTO; message?: string }>('/api/agents/translate', {
                text,
                sourceLanguage,
                targetLanguage
            });
            if (!response.data.success || !response.data.data) {
                throw new Error(response.data.message || 'Failed to translate');
            }
            return response.data.data;
        },
        createFlashcard: async (topic: string, level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1' = 'N4'): Promise<AgentFlashcardResponseDTO> => {
            const response = await apiClient.post<{ success: boolean; data: AgentFlashcardResponseDTO; message?: string }>('/api/agents/flashcard', {
                topic,
                level
            });
            if (!response.data.success || !response.data.data) {
                throw new Error(response.data.message || 'Failed to create flashcard');
            }
            return response.data.data;
        },
        autofillFlashcard: async (term: string): Promise<FlashcardAutofillResponse> => {
            const response = await apiClient.post<{ success: boolean; data: FlashcardAutofillResponse; message?: string }>('/api/agents/flashcard/autofill', {
                term,
            });
            if (!response.data.success || !response.data.data) {
                throw new Error(response.data.message || 'Failed to autofill flashcard');
            }
            return response.data.data;
        },
        simulateConversation: async (
            scenario: string,
            level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1' = 'N4',
            turns: number = 4
        ): Promise<AgentConversationSimulationResponseDTO> => {
            const response = await apiClient.post<{ success: boolean; data: AgentConversationSimulationResponseDTO; message?: string }>('/api/agents/conversation/simulate', {
                scenario,
                level,
                turns
            });
            if (!response.data.success || !response.data.data) {
                throw new Error(response.data.message || 'Failed to simulate conversation');
            }
            return response.data.data;
        },
        roleplay: async (
            topic: string,
            message: string,
            history: any[] = [],
            isFinal: boolean = false
        ): Promise<RoleplayResponse> => {
            const response = await apiClient.post<{ success: boolean; data: RoleplayResponse; message?: string }>('/api/agents/roleplay', {
                topic,
                message,
                history,
                isFinal
            });
            if (!response.data.success || !response.data.data) {
                throw new Error(response.data.message || 'Failed to process roleplay');
            }
            return response.data.data;
        },
        tts: async (text: string, voice?: string) => {
            const response = await apiClient.post<{ success: boolean; data: { url: string } }>('/api/agents/tts', {
                text,
                voice
            });
            return response.data.data;
        },
        recommendResources: async (topic: string, resourceType: string = 'all', level?: string): Promise<AgentResourceRecommendationResponseDTO> => {
            const response = await apiClient.post<{ success: boolean; data: AgentResourceRecommendationResponseDTO }>('/api/agents/resources/recommend', {
                topic,
                resourceType,
                level
            });
            return response.data.data;
        },
        getPlans: async (): Promise<any[]> => {
            const response = await apiClient.get<StandardApiResponse<any[]>>('/api/agents/sensei/subscription-plans');
            if (!response.data.success || !response.data.data) {
                return [];
            }
            return response.data.data;
        },
        getQuotaStatus: async (): Promise<{ limit: number; used: number; remaining: number; tier: string; resetAt: string; expiresAt?: string }> => {
            const response = await apiClient.get<{ success: boolean; data: { limit: number; used: number; remaining: number; tier: string; resetAt: string; expiresAt?: string } }>('/api/agents/sensei/quota-status');
            return response.data.data;
        },
        lessonChat: async (params: {
            lessonId: string;
            courseId?: string;
            currentTimestamp?: string;
            message: string;
            history?: any[];
        }): Promise<{ message: string; suggestions: string[] }> => {
            const response = await apiClient.post<{ success: boolean; data: { message: string; suggestions: string[] }; message?: string }>('/api/agents/lesson/chat', params);
            if (!response.data.success || !response.data.data) {
                throw new Error(response.data.message || 'Failed to chat about lesson');
            }
            return response.data.data;
        },
    },

    assessment: {
        generateTest: async (level: string, section: string, questionCount: number = 10): Promise<AgentTestGenerationResponseDTO> => {
            const response = await apiClient.post<{ success: boolean; data: AgentTestGenerationResponseDTO; message?: string }>('/api/agents/test/generate', {
                level,
                section,
                questionCount
            });
            if (!response.data.success || !response.data.data) {
                throw new Error(response.data.message || 'Failed to generate test');
            }
            return response.data.data;
        },
        evaluateTest: async (testId: string, answers: any[]): Promise<AgentTestEvaluationResponseDTO> => {
            const response = await apiClient.post<{ success: boolean; data: AgentTestEvaluationResponseDTO; message?: string }>('/api/agents/test/evaluate', {
                testId,
                answers
            });
            if (!response.data.success || !response.data.data) {
                throw new Error(response.data.message || 'Failed to evaluate test');
            }
            return response.data.data;
        },
    },
    placement: {
        getInfo: async (): Promise<any> => {
            const response = await apiClient.get<{ success: boolean; data: any; message?: string }>('/api/academy/placement/info');
            if (!response.data.success || !response.data.data) {
                throw new Error(response.data.message || 'Failed to load placement info');
            }
            return response.data.data;
        },
        start: async (): Promise<any> => {
            const response = await apiClient.post<{ success: boolean; data: any; message?: string }>('/api/academy/placement/start', {});
            if (!response.data.success || !response.data.data) {
                throw new Error(response.data.message || 'Failed to start placement test');
            }
            return response.data.data;
        },
        submit: async (attemptId: string, answers: Record<string, unknown>): Promise<any> => {
            const response = await apiClient.post<{ success: boolean; data: any; message?: string }>('/api/academy/placement/submit', {
                attemptId,
                answers
            });
            if (!response.data.success || !response.data.data) {
                throw new Error(response.data.message || 'Failed to submit placement test');
            }
            return response.data.data;
        }
    },
    analytics: {
        trackProgress: async (timeframe: string = 'month'): Promise<ProgressTrackResponse> => {
            const response = await apiClient.post<{ success: boolean; data: ProgressTrackResponse; message?: string }>('/api/agents/progress/track', {
                timeframe
            });
            if (!response.data.success || !response.data.data) {
                throw new Error(response.data.message || 'Failed to track progress');
            }
            return response.data.data;
        },
        suggestStudyPath: async (targetLevel: string): Promise<StudyPathResponse> => {
            const response = await apiClient.post<{ success: boolean; data: StudyPathResponse; message?: string }>('/api/agents/path/suggest', {
                targetLevel
            });
            if (!response.data.success || !response.data.data) {
                throw new Error(response.data.message || 'Failed to suggest study path');
            }
            return response.data.data;
        },
        generateReport: async (reportType: string = 'comprehensive', timeframe: string = 'month'): Promise<ReportResponse> => {
            const response = await apiClient.post<{ success: boolean; data: ReportResponse; message?: string }>('/api/agents/analytics/report', {
                reportType,
                timeframe
            });
            if (!response.data.success || !response.data.data) {
                throw new Error(response.data.message || 'Failed to generate report');
            }
            return response.data.data;
        },
        getReadinessProfile: async (targetLevel: string): Promise<AgentReadinessProfileResponseDTO> => {
            const response = await apiClient.post<{ success: boolean; data: AgentReadinessProfileResponseDTO; message?: string }>('/api/agents/analytics/readiness-profile', {
                targetLevel
            });
            if (!response.data.success || !response.data.data) {
                throw new Error(response.data.message || 'Failed to get readiness profile');
            }
            return response.data.data;
        }
    }
};

// ── Analytics Snapshot API (Redis-cached, on-demand AI) ───────────────────────

export const analyticsSnapshotApi = {
    /**
     * Check Redis for existing snapshot (no AI call). Returns null if cache miss.
     */
    getSnapshot: async (targetLevel: string = 'N5'): Promise<{ snapshot: AnalyticsSnapshot | null; isStale: boolean }> => {
        const response = await apiClient.get<{ success: boolean; data: { snapshot: AnalyticsSnapshot | null; isStale: boolean }; message?: string }>(
            `/api/agents/analytics/snapshot?targetLevel=${targetLevel}`
        );
        return response.data.data ?? { snapshot: null, isStale: true };
    },

    /**
     * Trigger AI generation. Stores result in Redis (24h TTL). Returns fresh snapshot.
     */
    generateSnapshot: async (targetLevel: string = 'N5'): Promise<AnalyticsSnapshot> => {
        const response = await apiClient.post<{ success: boolean; data: AnalyticsSnapshot; message?: string }>(
            '/api/agents/analytics/snapshot/generate',
            { targetLevel }
        );
        if (!response.data.success || !response.data.data) {
            throw new Error(response.data.message || 'Failed to generate AI analytics');
        }
        return response.data.data;
    },
};

/**
 * Hook: Read cached analytics snapshot from Redis — no AI call.
 * staleTime = 24h mirrors the Redis TTL on the server side.
 */
export function useAnalyticsSnapshot(targetLevel: string = 'N5') {
    return useQuery({
        queryKey: ['analytics-snapshot', targetLevel],
        queryFn: () => analyticsSnapshotApi.getSnapshot(targetLevel),
        staleTime: 24 * 60 * 60 * 1000,
        retry: 1,
    });
}

/**
 * Hook: Trigger AI generation on user request.
 * Invalidates the snapshot query after success so UI refreshes.
 */
export function useGenerateAnalyticsSnapshot() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (targetLevel: string = 'N5') => analyticsSnapshotApi.generateSnapshot(targetLevel),
        onSuccess: (data) => {
            queryClient.setQueryData(['analytics-snapshot', data.targetLevel], {
                snapshot: data,
                isStale: false,
            });
        },
    });
}
