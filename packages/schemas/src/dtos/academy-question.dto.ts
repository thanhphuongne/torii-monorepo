import { z } from 'zod';
import { AcademyQuestionType, AcademyQuestionReviewStatus, AcademyQuestionCategoryType } from '../enums/academy.enum';

export const academyQuestionOptionSchema = z.object({
  id: z.string().uuid().optional(),
  optionKey: z.string().min(1).max(10), // A, B, C, D...
  content: z.string().min(1),
  isCorrect: z.boolean().default(false),
  orderIndex: z.number().int().min(0),
});

export type AcademyQuestionOptionDTO = z.infer<typeof academyQuestionOptionSchema>;

export const academyQuestionCreateDTOSchema = z.object({
  questionType: z.nativeEnum(AcademyQuestionType),
  stem: z.string().min(1),
  explanation: z.string().optional(),
  level: z.string().max(20).optional(),
  categoryType: z.nativeEnum(AcademyQuestionCategoryType).optional(),
  options: z.array(academyQuestionOptionSchema).optional(),
  parentId: z.string().uuid().optional(),
  mediaUrl: z.string().url().optional().or(z.string().length(0)).or(z.string().nullish()),
  correctAnswer: z.union([z.string(), z.array(z.string())]).optional(),
});
export type AcademyQuestionCreateDTO = z.infer<
  typeof academyQuestionCreateDTOSchema
>;

export const academyQuestionUpdateDTOSchema = z.object({
  questionType: z.nativeEnum(AcademyQuestionType).optional(),
  stem: z.string().min(1).optional(),
  explanation: z.string().optional(),
  level: z.string().max(20).optional(),
  categoryType: z.nativeEnum(AcademyQuestionCategoryType).optional(),
  options: z.array(academyQuestionOptionSchema).optional(),
  reviewStatus: z.nativeEnum(AcademyQuestionReviewStatus).optional(),
  reviewNote: z.string().optional(),
  parentId: z.string().uuid().optional(),
  mediaUrl: z.string().url().optional().or(z.string().length(0)).or(z.string().nullish()),
  correctAnswer: z.union([z.string(), z.array(z.string())]).optional(),
});
export type AcademyQuestionUpdateDTO = z.infer<
  typeof academyQuestionUpdateDTOSchema
>;

export const academyQuestionQueryDTOSchema = z.object({
  questionType: z.nativeEnum(AcademyQuestionType).optional(),
  level: z.string().optional(),
  categoryType: z.nativeEnum(AcademyQuestionCategoryType).optional(),
  reviewStatus: z.nativeEnum(AcademyQuestionReviewStatus).optional(),
  q: z.string().optional(),
  parentId: z.string().uuid().optional(),
});
export type AcademyQuestionQueryDTO = z.infer<
  typeof academyQuestionQueryDTOSchema
>;

