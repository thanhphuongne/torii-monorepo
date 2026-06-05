import { z } from 'zod';
import { paginationOptionsDTOSchema } from './common.dto';

// DTO cho Enrollment bám sát EnrollmentCreateDto / EnrollmentQueryDto bên service academy
// và model Prisma Enrollment.

export const academyEnrollmentCreateDTOSchema = z.object({
  userId: z.string().uuid(),
  liveClassId: z.string().uuid().optional().nullable(),
  vodPackageId: z.string().uuid().optional().nullable(),
  expiresAt: z.coerce.date().optional(),
  status: z.string().max(20).optional(),
  sourceOrderId: z.string().uuid().optional(),
});
export type AcademyEnrollmentCreateDTO = z.infer<
  typeof academyEnrollmentCreateDTOSchema
>;

export const academyEnrollmentUpdateDTOSchema = z.object({
  expiresAt: z.coerce.date().optional(),
  status: z.string().max(20).optional(),
});
export type AcademyEnrollmentUpdateDTO = z.infer<
  typeof academyEnrollmentUpdateDTOSchema
>;

export const academyEnrollmentQueryDTOSchema = paginationOptionsDTOSchema.extend({
  liveClassId: z.string().uuid().optional(),
  vodPackageId: z.string().uuid().optional(),
  /** UUID của LiveClass hoặc VodPackage — filter enrollment theo một trong hai cột. */
  deliveryTargetId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  status: z.string().optional(),
});
export type AcademyEnrollmentQueryDTO = z.infer<
  typeof academyEnrollmentQueryDTOSchema
>;

// Model dùng cho web-learner (giữ nguyên các field enrich để không phá API hiện tại)
export const academyEnrollmentModelSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  liveClassId: z.string().uuid().nullable().optional(),
  vodPackageId: z.string().uuid().nullable().optional(),
  enrolledAt: z.coerce.date(),
  expiresAt: z.coerce.date().nullable(),
  status: z.string(),
  sourceOrderId: z.string().uuid().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  // Relations
  liveClass: z.any().optional(),
  vodPackage: z.any().optional(),
  user: z.any().optional(),

  // Learner View Rich Fields (Calculated by backend for learner portal)
  courseProfileId: z.string().uuid().optional(),
  courseCode: z.string().optional(),
  courseTitle: z.string().optional(),
  slug: z.string().optional(),
  thumbnailUrl: z.string().nullable().optional(),
  instructorName: z.string().optional(),
  instructorAvatar: z.string().nullable().optional(),
  instructor: z.object({
    id: z.string().uuid(),
    displayName: z.string(),
    avatarUrl: z.string().nullable().optional(),
  }).nullable().optional(),
  progress: z.number().optional(),
  completedLessons: z.number().optional(),
  totalLessons: z.number().optional(),
  type: z.string().optional(),
  mode: z.string().optional(),
});
export type AcademyEnrollmentModel = z.infer<typeof academyEnrollmentModelSchema>;
