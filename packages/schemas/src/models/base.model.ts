import { z } from 'zod';

export const baseModelSchema = z.object({
    id: z.string().uuid(),
    createdAt: z.date(),
    updatedAt: z.date(),
    deletedAt: z.date().optional().nullable(),
});
