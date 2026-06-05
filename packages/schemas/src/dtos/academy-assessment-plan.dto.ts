import { z } from 'zod';
import { AcademyAssessmentKind } from '../enums/academy.enum';

export const academyAssessmentPlanItemSchema = z.object({
  id: z.string().uuid().optional(),
  examId: z.string().uuid(),
  assessmentKind: z.nativeEnum(AcademyAssessmentKind),
  moduleId: z.string().uuid().nullable().optional(),
  triggerLessonId: z.string().uuid().nullable().optional(),
  orderIndex: z.number().int().min(0),
  isRequired: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

export type AcademyAssessmentPlanItemDTO = z.infer<typeof academyAssessmentPlanItemSchema>;

export const academyUpdateAssessmentPlanDTOSchema = z.object({
  courseProfileId: z.string().uuid(),
  items: z.array(academyAssessmentPlanItemSchema),
});

export type AcademyUpdateAssessmentPlanDTO = z.infer<typeof academyUpdateAssessmentPlanDTOSchema>;

export const academyAssessmentStatusSchema = z.object({
  assessmentId: z.string().uuid(),
  examId: z.string().uuid(),
  kind: z.nativeEnum(AcademyAssessmentKind),
  status: z.enum(['LOCKED', 'AVAILABLE', 'IN_PROGRESS', 'SUBMITTED', 'PASSED', 'FAILED']),
  moduleId: z.string().uuid().nullable().optional(),
  triggerLessonId: z.string().uuid().nullable().optional(),
  examTitle: z.string().optional(),
  latestAttemptId: z.string().uuid().nullable().optional(),
  score: z.number().optional(),
  percentage: z.number().optional(),
  isPassed: z.boolean().optional(),
  isRequired: z.boolean().optional(),
});

export type AcademyAssessmentStatusDTO = z.infer<typeof academyAssessmentStatusSchema>;
