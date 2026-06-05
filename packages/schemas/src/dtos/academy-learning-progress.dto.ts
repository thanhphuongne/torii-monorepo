import { z } from 'zod';

export const academyLearningProgressModelSchema = z.object({
    userId: z.string().uuid(),
    liveClassId: z.string().uuid(),
    lessonId: z.string().uuid(),
    isCompleted: z.boolean(),
    lastWatchedAt: z.coerce.date().nullable(),
    updatedAt: z.coerce.date(),
});

export type AcademyLearningProgressModel = z.infer<typeof academyLearningProgressModelSchema>;

export const academyLearningStatsSchema = z.object({
    totalCourses: z.number(),
    totalLearningHours: z.number(),
    inProgressCourses: z.number(),
    completedCourses: z.number(),
    averageProgress: z.number(),
});

export type AcademyLearningStats = z.infer<typeof academyLearningStatsSchema>;
