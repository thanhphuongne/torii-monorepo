import { z } from 'zod';

// V2 Lesson: gắn với Module, chỉ hỗ trợ VIDEO/READING, không còn quiz/exam/assignment metadata.

export const academyLessonSchema = z.object({
  id: z.string().uuid(),
  moduleId: z.string().uuid(),
  title: z.string().max(255),
  orderIndex: z.number(),
  type: z.enum(['VIDEO', 'READING']),
  videoUrl: z.string().url().optional().nullable(),
  content: z.string().optional().nullable(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type AcademyLesson = z.infer<typeof academyLessonSchema>;
export type AcademyLessonModel = AcademyLesson;

export const academyLessonCreateDTOSchema = z.object({
  moduleId: z.string().uuid(),
  title: z.string().max(255),
  orderIndex: z.number().optional(),
  type: z.enum(['VIDEO', 'READING']),
  videoUrl: z.string().url().optional(),
  content: z.string().optional(),
});

export type AcademyLessonCreateDTO = z.infer<typeof academyLessonCreateDTOSchema>;

export const academyLessonUpdateDTOSchema = z.object({
  title: z.string().max(255).optional(),
  orderIndex: z.number().optional(),
  type: z.enum(['VIDEO', 'READING']).optional(),
  videoUrl: z.string().url().optional(),
  content: z.string().optional().nullable(),
});

export type AcademyLessonUpdateDTO = z.infer<typeof academyLessonUpdateDTOSchema>;

export const academyLessonQueryDTOSchema = z.object({
  moduleId: z.string().uuid().optional(),
  courseProfileId: z.string().uuid().optional(),
  q: z.string().optional(),
});

export type AcademyLessonQueryDTO = z.infer<typeof academyLessonQueryDTOSchema>;
