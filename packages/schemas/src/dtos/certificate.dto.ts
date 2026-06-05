import { z } from 'zod';
import { certificateSchema } from '../models/certificate.model';

export const certificateResponseDTOSchema = certificateSchema.extend({
    class: z.any().optional(),
    user: z.any().optional(),
    enrollment: z.any().optional(),
});

export type CertificateResponseDTO = z.infer<typeof certificateResponseDTOSchema>;

export const certificateQueryDTOSchema = z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    userId: z.string().uuid().optional(),
    liveClassId: z.string().uuid().optional(),
    vodPackageId: z.string().uuid().optional(),
});

export type CertificateQueryDTO = z.infer<typeof certificateQueryDTOSchema>;

export const certificateIssueDTOSchema = z.object({
    userId: z.string().uuid(),
    liveClassId: z.string().uuid(),
    enrollmentId: z.string().uuid(),
});

export type CertificateIssueDTO = z.infer<typeof certificateIssueDTOSchema>;

export const certificatePaginatedResponseSchema = z.object({
    data: z.array(certificateResponseDTOSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
});

export type CertificatePaginatedResponse = z.infer<typeof certificatePaginatedResponseSchema>;
