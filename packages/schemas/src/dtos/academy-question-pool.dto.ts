import { z } from 'zod';

export const QuestionPoolStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']);
export type QuestionPoolStatus = z.infer<typeof QuestionPoolStatusSchema>;

export const academyQuestionPoolCreateDTOSchema = z.object({
    code: z.string().max(64).optional(),
    name: z.string().min(1).max(255),
    description: z.string().optional(),
    courseProfileId: z.string().uuid().optional(),
    level: z.string().max(20).optional(),
    category: z.string().max(50).optional(),
    status: QuestionPoolStatusSchema.optional(),
    metadata: z.unknown().optional(),
});
export type AcademyQuestionPoolCreateDTO = z.infer<
    typeof academyQuestionPoolCreateDTOSchema
>;

export const academyQuestionPoolUpdateDTOSchema = z.object({
    code: z.string().max(64).optional(),
    name: z.string().max(255).optional(),
    description: z.string().optional(),
    courseProfileId: z.string().uuid().optional(),
    level: z.string().max(20).optional(),
    category: z.string().max(50).optional(),
    status: QuestionPoolStatusSchema.optional(),
    metadata: z.unknown().optional(),
});
export type AcademyQuestionPoolUpdateDTO = z.infer<
    typeof academyQuestionPoolUpdateDTOSchema
>;

export const academyQuestionPoolQueryDTOSchema = z.object({
    courseProfileId: z.string().uuid().optional(),
    level: z.string().optional(),
    category: z.string().optional(),
    status: QuestionPoolStatusSchema.optional(),
    q: z.string().optional(),
});
export type AcademyQuestionPoolQueryDTO = z.infer<
    typeof academyQuestionPoolQueryDTOSchema
>;

export const addPoolQuestionsDTOSchema = z.object({
    questionIds: z.array(z.string().uuid()),
});
export type AddPoolQuestionsDTO = z.infer<typeof addPoolQuestionsDTOSchema>;

export const sampleQuestionsDTOSchema = z.object({
    count: z.number().int().min(1),
});
export type SampleQuestionsDTO = z.infer<typeof sampleQuestionsDTOSchema>;
