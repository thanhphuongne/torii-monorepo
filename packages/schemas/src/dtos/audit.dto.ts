import { z } from 'zod';

/**
 * Audit Log Entry DTO
 * Used to create audit log entries across all modules
 */
export const auditLogEntryDTOSchema = z.object({
    userId: z.string().uuid(),
    action: z.string(),
    entity: z.string(),
    entityId: z.string().optional(),
    description: z.string(),
    metadata: z.record(z.any()).optional(),
    oldValues: z.record(z.any()).optional(),
    newValues: z.record(z.any()).optional(),
});

export type AuditLogEntryDTO = z.infer<typeof auditLogEntryDTOSchema>;

/**
 * Audit Log Filters DTO
 * Used to query audit logs with filters and pagination
 */
export const auditLogFiltersDTOSchema = z.object({
    userId: z.string().uuid().optional(),
    action: z.string().optional(),
    entity: z.string().optional(),
    entityId: z.string().optional(),
    startDate: z.preprocess((val) => (val === '' ? undefined : val), z.coerce.date().optional()),
    endDate: z.preprocess((val) => (val === '' ? undefined : val), z.coerce.date().optional()),
    page: z.number().int().min(1).optional(),
    limit: z.number().int().min(1).max(100).optional(),
});

export type AuditLogFiltersDTO = z.infer<typeof auditLogFiltersDTOSchema>;

/**
 * Audit Context
 * Shared context for audit logging across modules
 */
export const auditContextDTOSchema = z.object({
    actorId: z.string().uuid(),
    actorEmail: z.string().email(),
    actorRole: z.string(),
});

export type AuditContextDTO = z.infer<typeof auditContextDTOSchema>;

/**
 * Audit Log Response DTO
 * Used for query responses with user relation
 */
export const auditLogResponseDTOSchema = z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    action: z.string(),
    entity: z.string(),
    entityId: z.string().nullable(),
    description: z.string(),
    metadata: z.record(z.any()).nullable(),
    oldValues: z.record(z.any()).nullable(),
    newValues: z.record(z.any()).nullable(),
    createdAt: z.date(),
    user: z.object({
        id: z.string().uuid(),
        email: z.string().email(),
        displayName: z.string(),
        role: z.string(),
    }).optional(),
});

export type AuditLogResponseDTO = z.infer<typeof auditLogResponseDTOSchema>;

/**
 * Audit Log Activity DTO
 * Used for user/entity activity queries
 */
export const auditLogActivityDTOSchema = auditLogResponseDTOSchema;

export type AuditLogActivityDTO = z.infer<typeof auditLogActivityDTOSchema>;