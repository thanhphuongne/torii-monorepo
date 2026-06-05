import { z } from 'zod';

export const AgentGrammarCheckResponseSchema = z.object({
    isCorrect: z.boolean(),
    originalText: z.string(),
    correctedText: z.string(),
    errors: z.array(
        z.object({
            type: z.string(),
            location: z.string(),
            issue: z.string(),
            correction: z.string(),
            explanation: z.string(),
        }),
    ),
    suggestions: z.array(z.string()),
});

export const AgentTranslateResponseSchema = z.object({
    originalText: z.string(),
    translatedText: z.string(),
    sourceLanguage: z.string(),
    targetLanguage: z.string(),
    culturalNotes: z.string().optional(),
    alternativeTranslations: z.array(z.string()).optional(),
});

export const AgentFlashcardResponseSchema = z.object({
    topic: z.string(),
    flashcards: z.array(
        z.object({
            front: z.string(),
            back: z.string(),
            reading: z.string().optional(),
        }),
    ),
    level: z.string().optional(),
});

export const AgentDrillResponseSchema = z.object({
    topic: z.string(),
    level: z.string().optional(),
    drills: z.array(
        z.object({
            question: z.string(),
            options: z.array(z.string()),
            correctAnswer: z.string(),
            explanation: z.string(),
        }),
    ),
});

export const AgentConversationSimulationResponseSchema = z.object({
    scenario: z.string(),
    conversation: z.array(
        z.object({
            speaker: z.string(),
            japanese: z.string(),
            romaji: z.string(),
            vietnamese: z.string(),
        }),
    ),
    vocabulary: z.array(z.string()),
    grammarPoints: z.array(z.string()),
});

export const AgentResourceRecommendationResponseSchema = z.object({
    topic: z.string(),
    resources: z.array(
        z.object({
            title: z.string(),
            type: z.string(),
            url: z.string(),
            description: z.string(),
        }),
    ),
});

export const AgentChatResponseSchema = z.object({
    message: z.string(),
    language: z.string(),
    suggestions: z.array(z.string()),
    action: z.object({
        type: z.enum([
            'grammar_check',
            'translate',
            'generate_drill',
            'create_flashcard',
            'recommend_resources',
            'simulate_conversation',
            'test_generation',
            'placement_test'
        ]),
        payload: z.any()
    }).nullable().optional()
});

export const AgentReadinessProfileResponseSchema = z.object({
    userId: z.string(),
    targetLevel: z.string(),
    readinessPercentage: z.number().min(0).max(100),
    skillGaps: z.object({
        vocabulary: z.number(),
        grammar: z.number(),
        reading: z.number(),
        listening: z.number(),
    }),
    weaknesses: z.array(z.object({
        topic: z.string(),
        severity: z.enum(['low', 'medium', 'high']),
        description: z.string(),
        suggestedReview: z.string(),
    })),
    recommendations: z.array(z.string()),
    recentPerformance: z.object({
        averageScore: z.number(),
        testsTaken: z.number(),
        trend: z.enum(['improving', 'stable', 'declining']),
    }).optional(),
    nextSteps: z.array(z.string()),
});

export const AgentTestGenerationResponseSchema = z.object({
    testId: z.string(),
    questions: z.array(z.object({
        id: z.string(),
        type: z.string(),
        level: z.string().optional(),
        question: z.string(),
        options: z.array(z.string()),
        correctAnswer: z.union([z.string(), z.number()]),
        explanation: z.string().optional(),
    })),
    estimatedTimeMinutes: z.number().optional(),
});

export const AgentStudyPathResponseSchema = z.object({
    userId: z.string(),
    currentLevel: z.string().optional(),
    targetLevel: z.string(),
    studyPathRecommendation: z.object({
        roadmap: z.array(z.object({
            title: z.string(),
            status: z.enum(['completed', 'in-progress', 'locked']),
            description: z.string(),
        })),
        estimatedWeeks: z.number().optional(),
        focusAreas: z.array(z.string()),
    }),
});

export const AgentTestEvaluationResponseSchema = z.object({
    testId: z.string(),
    score: z.number().optional(),
    maxScore: z.number().optional(),
    percentage: z.number().optional(),
    feedback: z.string(),
    details: z.array(z.object({
        questionId: z.string(),
        isCorrect: z.boolean().optional(),
        explanation: z.string(),
    })),
    assessedLevel: z.string().optional(),
    targetLevel: z.string().optional(),
    scoreBreakdown: z.record(z.string(), z.string()).optional(),
    studyPathRecommendation: z.any().optional(),
});

export type AgentGrammarCheckResponseDTO = z.infer<typeof AgentGrammarCheckResponseSchema>;
export type AgentTranslateResponseDTO = z.infer<typeof AgentTranslateResponseSchema>;
export type AgentFlashcardResponseDTO = z.infer<typeof AgentFlashcardResponseSchema>;
export type AgentDrillResponseDTO = z.infer<typeof AgentDrillResponseSchema>;
export type AgentConversationSimulationResponseDTO = z.infer<typeof AgentConversationSimulationResponseSchema>;
export type AgentResourceRecommendationResponseDTO = z.infer<typeof AgentResourceRecommendationResponseSchema>;
export type AgentChatResponseDTO = z.infer<typeof AgentChatResponseSchema>;
export type AgentReadinessProfileResponseDTO = z.infer<typeof AgentReadinessProfileResponseSchema>;
export type AgentStudyPathResponseDTO = z.infer<typeof AgentStudyPathResponseSchema>;
export type AgentTestGenerationResponseDTO = z.infer<typeof AgentTestGenerationResponseSchema>;
export type AgentTestEvaluationResponseDTO = z.infer<typeof AgentTestEvaluationResponseSchema>;

export const AgentRoleplayResponseSchema = z.object({
    response: z.string(),
    romaji: z.string().nullable().optional(),
    vietnamese: z.string().nullable().optional(),
    feedback: z.string().nullable().optional(),
    isFinished: z.boolean().nullable().optional(),
});
export type AgentRoleplayResponseDTO = z.infer<typeof AgentRoleplayResponseSchema>;

export const AgentLessonChatResponseSchema = z.object({
    message: z.string(),
    suggestions: z.array(z.string()),
});
export type AgentLessonChatResponseDTO = z.infer<typeof AgentLessonChatResponseSchema>;