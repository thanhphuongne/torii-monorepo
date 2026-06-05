import { z } from 'zod';

export const certificateSchema = z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    liveClassId: z.string().uuid().optional().nullable(),
    vodPackageId: z.string().uuid().optional().nullable(),
    enrollmentId: z.string().uuid(),
    certificateCode: z.string().max(50),
    issueDate: z.date(),
    score: z.number().optional().nullable(),
    fileUrl: z.string(),
    metadata: z.any().optional(),
});

export type Certificate = z.infer<typeof certificateSchema>;
