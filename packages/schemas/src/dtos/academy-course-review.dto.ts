import { z } from 'zod';

// ── Create ──────────────────────────────────────────────────────────────────

export const academyCourseReviewCreateDTOSchema = z.object({
    enrollmentId: z.string().uuid(),
    rating: z.number().int().min(1).max(5),
    title: z.string().max(255).optional(),
    content: z.string().optional(),
    isAnonymous: z.boolean().default(false),
});
export type AcademyCourseReviewCreateDTO = z.infer<
    typeof academyCourseReviewCreateDTOSchema
>;

// ── Update ───────────────────────────────────────────────────────────────────

export const academyCourseReviewUpdateDTOSchema = z.object({
    rating: z.number().int().min(1).max(5).optional(),
    title: z.string().max(255).optional(),
    content: z.string().optional(),
    isAnonymous: z.boolean().optional(),
});
export type AcademyCourseReviewUpdateDTO = z.infer<
    typeof academyCourseReviewUpdateDTOSchema
>;

// ── Query (public) ───────────────────────────────────────────────────────────

export const academyCourseReviewQueryDTOSchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
    status: z.string().optional(),
});
export type AcademyCourseReviewQueryDTO = z.infer<
    typeof academyCourseReviewQueryDTOSchema
>;

// ── Admin query ──────────────────────────────────────────────────────────────

export const academyCourseReviewAdminQueryDTOSchema = z.object({
    liveClassId: z.string().uuid().optional(),
    vodPackageId: z.string().uuid().optional(),
    userId: z.string().uuid().optional(),
    status: z.string().optional(),
    rating: z.coerce.number().int().min(1).max(5).optional(),
    fromDate: z.string().datetime().optional(),
    toDate: z.string().datetime().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
});
export type AcademyCourseReviewAdminQueryDTO = z.infer<
    typeof academyCourseReviewAdminQueryDTOSchema
>;

// ── Moderate ─────────────────────────────────────────────────────────────────

export const academyCourseReviewModerateDTOSchema = z.object({
    action: z.enum(['publish', 'hide', 'reject']),
    reason: z.string().optional(),
});
export type AcademyCourseReviewModerateDTO = z.infer<
    typeof academyCourseReviewModerateDTOSchema
>;
