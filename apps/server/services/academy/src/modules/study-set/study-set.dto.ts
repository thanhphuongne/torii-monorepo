import { z } from 'zod';

export const createStudySetSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  isPublic: z.boolean().optional(),
  settings: z.record(z.any()).optional(),
});
export type CreateStudySetDto = z.infer<typeof createStudySetSchema>;

export const updateStudySetSchema = createStudySetSchema.partial();
export type UpdateStudySetDto = z.infer<typeof updateStudySetSchema>;

export const createSetCardSchema = z.object({
  term: z.string().min(1),
  definition: z.string().min(1),
  hint: z.string().optional(),
  mediaUrl: z.string().optional(),
  languageDetails: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
});
export type CreateSetCardDto = z.infer<typeof createSetCardSchema>;

export const updateSetCardSchema = createSetCardSchema.partial();
export type UpdateSetCardDto = z.infer<typeof updateSetCardSchema>;

export const reviewSetCardSchema = z.object({
  quality: z.number().int().min(0).max(1),
});
export type ReviewSetCardDto = z.infer<typeof reviewSetCardSchema>;

export const clonePublicStudySetSchema = z.object({
  sourceSetId: z.string().uuid(),
  title: z.string().min(1).optional(),
});
export type ClonePublicStudySetDto = z.infer<typeof clonePublicStudySetSchema>;

export const shareStudySetSchema = z.object({
  isPublic: z.boolean(),
});
export type ShareStudySetDto = z.infer<typeof shareStudySetSchema>;
