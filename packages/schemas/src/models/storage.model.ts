import { z } from 'zod';

export enum FileStatus {
    PENDING = 'pending',
    UPLOADED = 'uploaded',
    FAILED = 'failed',
}

export const fileSchema = z.object({
    id: z.string().uuid(),
    filename: z.string().min(1),
    contentType: z.string(),
    size: z.number().default(0),
    url: z.string().url(),
    key: z.string(),
    bucket: z.string(),
    status: z.nativeEnum(FileStatus),
    module: z.string(),
    ownerId: z.string().optional(),
    metadata: z.record(z.any()).optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export type StorageFile = z.infer<typeof fileSchema>;
