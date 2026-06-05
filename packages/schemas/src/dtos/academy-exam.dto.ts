import { z } from 'zod';
import { AcademyExamType, AcademyExamStatus } from '../enums/academy.enum';

export const academyExamSectionInputSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(255),
  instruction: z.string().optional(),
  timeLimitSeconds: z.number().int().min(0).optional(),
  orderIndex: z.number().int().min(0),
  sectionType: z.string().max(50).optional(),
  metadata: z.unknown().optional(),
});
export type AcademyExamSectionInputDTO = z.infer<
  typeof academyExamSectionInputSchema
>;

export const academyExamQuestionInputSchema = z.object({
  orderIndex: z.number().int().min(0),
  sectionId: z.string().uuid(),
  questionId: z.string().uuid(),
  points: z.number().min(0).optional(),
  metadata: z.unknown().optional(),
});
export type AcademyExamQuestionInputDTO = z.infer<
  typeof academyExamQuestionInputSchema
>;

export const academyExamCreateDTOSchema = z.object({
  courseProfileId: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  examType: z.nativeEnum(AcademyExamType),
  level: z.string().max(50).optional(),
  totalTimeLimitMinutes: z.number().int().min(0).optional(),
  status: z.nativeEnum(AcademyExamStatus).default(AcademyExamStatus.DRAFT),
  settings: z.record(z.unknown()).optional(),
  sections: z.array(academyExamSectionInputSchema),
});
export type AcademyExamCreateDTO = z.infer<typeof academyExamCreateDTOSchema>;

export const academyExamUpdateDTOSchema = z.object({
  title: z.string().max(255).optional(),
  description: z.string().optional(),
  examType: z.nativeEnum(AcademyExamType).optional(),
  level: z.string().max(50).optional(),
  totalTimeLimitMinutes: z.number().int().min(0).optional(),
  status: z.nativeEnum(AcademyExamStatus).optional(),
  settings: z.record(z.unknown()).optional(),
});
export type AcademyExamUpdateDTO = z.infer<typeof academyExamUpdateDTOSchema>;

export const academyExamQueryDTOSchema = z.object({
  courseProfileId: z.string().uuid().optional(),
  status: z.nativeEnum(AcademyExamStatus).optional(),
  examType: z.nativeEnum(AcademyExamType).optional(),
  q: z.string().optional(),
});
export type AcademyExamQueryDTO = z.infer<typeof academyExamQueryDTOSchema>;

export const academyExamAddQuestionsDTOSchema = z.object({
  sectionId: z.string().uuid(),
  questionIds: z.array(z.string().uuid()).min(1),
  points: z.number().min(0).optional(),
});
export type AcademyExamAddQuestionsDTO = z.infer<
  typeof academyExamAddQuestionsDTOSchema
>;
