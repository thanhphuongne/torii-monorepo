import { z } from 'zod';

// ========================================
// Enums
// ========================================

export const ActivityTypeSchema = z.enum([
    'LESSON_COMPLETE',
    'QUIZ_ANSWER',
    'VIDEO_WATCH',
    'REVIEW',
    'PRACTICE',
    'FLASHCARD_REVIEW',
    'EXAM_COMPLETE',
    'BLOG_CREATE',
    'COMMENT_CREATE',
    'LOGIN',
]);

export const AchievementCategorySchema = z.enum([
    'STREAK',
    'CONSISTENCY',
    'LEARNING_PROGRESS',
    'RECOVERY',
    'SOCIAL',
    'MASTERY',
]);

export type ActivityType = z.infer<typeof ActivityTypeSchema>;
export type AchievementCategory = z.infer<typeof AchievementCategorySchema>;

// ========================================
// Request DTOs
// ========================================

export const RecordActivityDTOSchema = z.object({
    activityType: ActivityTypeSchema,
    meta: z.record(z.any()).optional(),
});

export type RecordActivityDTO = z.infer<typeof RecordActivityDTOSchema>;

export const GrantFreezeDTOSchema = z.object({
    amount: z.number().int().positive(),
});

export type GrantFreezeDTO = z.infer<typeof GrantFreezeDTOSchema>;

// ========================================
// Response DTOs
// ========================================

export const StreakStatusDTOSchema = z.object({
    currentStreak: z.number().int(),
    longestStreak: z.number().int(),
    freezeCount: z.number().int(),
    /** true nếu hôm nay streak được nối nhờ tiêu 1 freeze (miss 1 ngày). */
    streakSavedByFreeze: z.boolean().optional(),
    isActiveToday: z.boolean(),
    willBreakTomorrow: z.boolean(),
    lastActiveDate: z.string().nullable(),
    totalActiveDays: z.number().int(),
    weeklyActiveCount: z.number().int(),
    monthlyActiveCount: z.number().int(),
    recentActiveDates: z.array(z.string()).optional(),
    shouldShowToast: z.boolean().optional(),
});

export type StreakStatusDTO = z.infer<typeof StreakStatusDTOSchema>;

export const UserGamificationDTOSchema = z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    level: z.number().int(),
    currentXp: z.number().int(),
    totalXp: z.number().int(),
    points: z.number().int(), // Renamed from coins
    gems: z.number().int(),
    balance: z.number().int().optional(), // Added for actual purchaseable balance
    currentStreak: z.number().int(),
    longestStreak: z.number().int(),
    lastActiveDate: z.string().nullable(),
    freezeCount: z.number().int(),
    totalActiveDays: z.number().int(),
    weeklyActiveCount: z.number().int(),
    monthlyActiveCount: z.number().int(),
    updatedAt: z.string().datetime(),
});

export type UserGamificationDTO = z.infer<typeof UserGamificationDTOSchema>;

export const AchievementDTOSchema = z.object({
    id: z.string().uuid(),
    code: z.string(),
    category: AchievementCategorySchema,
    title: z.string(),
    description: z.string(),
    icon: z.string().nullable(),
    requirements: z.record(z.any()),
    rewards: z.record(z.any()),
    isActive: z.boolean(),
    orderIndex: z.number().int(),
});

export type AchievementDTO = z.infer<typeof AchievementDTOSchema>;

export const UserAchievementDTOSchema = z.object({
    id: z.string().uuid(),
    achievementId: z.string().uuid(),
    isUnlocked: z.boolean(),
    progress: z.record(z.any()).nullable(),
    unlockedAt: z.string().datetime().nullable(),
    achievement: AchievementDTOSchema,
});

export type UserAchievementDTO = z.infer<typeof UserAchievementDTOSchema>;

export const LeaderboardUserDTOSchema = z.object({
    id: z.string().uuid(),
    displayName: z.string(),
    avatarUrl: z.string().nullable(),
    xp: z.number().int(), // Map to totalXp
    level: z.number().int(),
    rank: z.number().int(),
    currentStreak: z.number().int().optional(),
    totalActiveDays: z.number().int().optional(),
});

export type LeaderboardUserDTO = z.infer<typeof LeaderboardUserDTOSchema>;

export const LeaderboardDTOSchema = z.object({
    users: z.array(LeaderboardUserDTOSchema),
    currentUser: LeaderboardUserDTOSchema.optional(),
    totalUsers: z.number().int(),
    type: z.enum(['global', 'streak', 'active']),
});

export type LeaderboardDTO = z.infer<typeof LeaderboardDTOSchema>;

// ========================================
// Event Payloads (for NATS)
// ========================================

export const UserActivityEventSchema = z.object({
    userId: z.string().uuid(),
    activityType: ActivityTypeSchema,
    meta: z.record(z.any()).optional(),
    timestamp: z.string().datetime(),
});

export type UserActivityEvent = z.infer<typeof UserActivityEventSchema>;

export const AchievementUnlockedEventSchema = z.object({
    userId: z.string().uuid(),
    achievementId: z.string().uuid(),
    achievementCode: z.string(),
    achievementTitle: z.string(),
    rewards: z.record(z.any()),
    timestamp: z.string().datetime(),
});

export type AchievementUnlockedEvent = z.infer<typeof AchievementUnlockedEventSchema>;

export const StreakUpdatedEventSchema = z.object({
    userId: z.string().uuid(),
    oldStreak: z.number().int(),
    newStreak: z.number().int(),
    isMilestone: z.boolean(),
    timestamp: z.string().datetime(),
});

export type StreakUpdatedEvent = z.infer<typeof StreakUpdatedEventSchema>;

// ========================================
// History DTOs
// ========================================

export enum GamificationTransactionType {
    EARN = 'EARN',
    REDEEM = 'REDEEM',
    BONUS = 'BONUS',
    EXPIRATION = 'EXPIRATION',
    OTHER = 'OTHER',
}

export const gamificationHistoryDTOSchema = z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    amount: z.number().int(),
    type: z.nativeEnum(GamificationTransactionType),
    activityType: ActivityTypeSchema.nullable(),
    description: z.string().nullable(),
    currency: z.string().optional(),
    metadata: z.record(z.any()).default({}),
    createdAt: z.date(),
});

export type GamificationHistoryDTO = z.infer<typeof gamificationHistoryDTOSchema>;

export const gamificationHistoryQueryDTOSchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).default(10),
    type: z.nativeEnum(GamificationTransactionType).optional(),
});

export type GamificationHistoryQueryDTO = z.infer<typeof gamificationHistoryQueryDTOSchema>;

export const gamificationHistoryPaginatedResponseDTOSchema = z.object({
    data: z.array(gamificationHistoryDTOSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
});


export type GamificationHistoryPaginatedResponseDTO = z.infer<typeof gamificationHistoryPaginatedResponseDTOSchema>;

// ========================================
// Reward DTOs
// ========================================

export const PointRewardDTOSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    description: z.string().optional().nullable(),
    costPoints: z.number().int().min(1, 'Số điểm cần đổi phải lớn hơn 0'),
    type: z.string().default('COUPON'),
    config: z.object({
        discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']).default('PERCENTAGE'),
        discountValue: z.number().positive('Giá trị giảm phải lớn hơn 0').default(1),
        maxDiscountAmount: z.number().positive('Giảm tối đa phải lớn hơn 0').nullable().optional(),
        minOrderValue: z.number().nonnegative().nullable().optional(),
        validDays: z.number().int().positive().default(30),
    }).default({}).superRefine((config, ctx) => {
        if (config.discountType === 'PERCENTAGE' && config.discountValue > 100) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['discountValue'],
                message: 'Phần trăm giảm không được vượt quá 100%',
            });
        }
    }),
    isActive: z.boolean(),
    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional(),
});

export type PointRewardDTO = z.infer<typeof PointRewardDTOSchema>;

export const createPointRewardDTOSchema = PointRewardDTOSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export type CreatePointRewardDTO = z.infer<typeof createPointRewardDTOSchema>;

export const updatePointRewardDTOSchema = createPointRewardDTOSchema.partial();

export type UpdatePointRewardDTO = z.infer<typeof updatePointRewardDTOSchema>;
