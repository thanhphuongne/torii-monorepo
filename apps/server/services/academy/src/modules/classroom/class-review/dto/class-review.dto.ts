import { z } from 'zod';

export const classReviewCreateSchema = z.object({
  enrollmentId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(255).optional(),
  content: z.string().optional(),
  isAnonymous: z.boolean().default(false),
});
export type ClassReviewCreateDto = z.infer<typeof classReviewCreateSchema>;

export const classReviewUpdateSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().max(255).optional(),
  content: z.string().optional(),
  isAnonymous: z.boolean().optional(),
});
export type ClassReviewUpdateDto = z.infer<typeof classReviewUpdateSchema>;

export const classReviewQuerySchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  status: z.string().optional(),
});
export type ClassReviewQueryDto = z.infer<typeof classReviewQuerySchema>;

export const classReviewAdminQuerySchema = z.object({
  liveClassId: z.string().uuid().optional(),
  vodPackageId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  status: z.string().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});
export type ClassReviewAdminQueryDto = z.infer<
  typeof classReviewAdminQuerySchema
>;

export const classReviewModerateSchema = z.object({
  action: z.enum(['publish', 'hide', 'reject']),
  reason: z.string().optional(),
});
export type ClassReviewModerateDto = z.infer<typeof classReviewModerateSchema>;
