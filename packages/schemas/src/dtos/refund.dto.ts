import { z } from 'zod';
import { refundSchema, refundStatusLogSchema } from '../models/refund.model';
import { RefundStatus } from '../enums/academy.enum';
import { paginationOptionsDTOSchema } from './common.dto';

// Create Refund DTO
export const createRefundDTOSchema = refundSchema.pick({
    ticketId: true,
    orderId: true,
    amount: true,
    reason: true,
    adminNote: true,
}).extend({
    ticketId: z.string().uuid(),
    orderId: z.string().uuid().optional().nullable(),
    amount: z.number().positive(),
    reason: z.string().optional().nullable(),
    adminNote: z.string().optional().nullable(),
});

export type CreateRefundDTO = z.infer<typeof createRefundDTOSchema>;

// Update Refund Status DTO
export const updateRefundStatusDTOSchema = z.object({
    status: z.nativeEnum(RefundStatus),
    reason: z.string().optional().nullable(),
    adminNote: z.string().optional().nullable(),
});

export type UpdateRefundStatusDTO = z.infer<typeof updateRefundStatusDTOSchema>;

// Refund Query DTO
export const refundQueryDTOSchema = paginationOptionsDTOSchema.extend({
    status: z.nativeEnum(RefundStatus).optional(),
    ticketId: z.string().uuid().optional(),
    orderId: z.string().uuid().optional(),
});

export type RefundQueryDTO = z.infer<typeof refundQueryDTOSchema>;

// Refund Response DTO
export const refundResponseDTOSchema = refundSchema.extend({
    logs: z.array(refundStatusLogSchema).optional(),
    ticket: z.object({
        user: z.object({
            displayName: z.string(),
            email: z.string(),
        }).optional(),
    }).optional(),
});

export type RefundResponseDTO = z.infer<typeof refundResponseDTOSchema>;
