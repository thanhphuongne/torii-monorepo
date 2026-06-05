import { z } from 'zod';

/**
 * Base API Response
 */
export interface StandardApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    errors?: any[];
}

/**
 * Service Layer Paginated Response
 */
export interface PaginatedResponseDTO<T = any> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

/**
 * API Level Paginated Response (Flattened)
 */
export interface PaginatedApiResponse<T = any> extends StandardApiResponse<T[]>, Omit<PaginatedResponseDTO<T>, 'data'> {
    // success, data (as T[]), and message come from StandardApiResponse
    // total, page, limit, totalPages come from PaginatedResponseDTO
}

/**
 * Zod Schemas
 */
export const paginationOptionsDTOSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().optional(),
});

export const paginationQuerySchema = paginationOptionsDTOSchema;

export type PaginationOptionsDTO = z.infer<typeof paginationOptionsDTOSchema>;

export const paginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
    z.object({
        data: z.array(itemSchema),
        total: z.number(),
        page: z.number(),
        limit: z.number(),
        totalPages: z.number(),
    });