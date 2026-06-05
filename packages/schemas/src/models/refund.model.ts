import { z } from 'zod';
import { RefundStatus } from '../enums/academy.enum';

export const refundStatusLogSchema = z.object({
    id: z.string().uuid(),
    refundId: z.string().uuid(),
    oldStatus: z.nativeEnum(RefundStatus),
    newStatus: z.nativeEnum(RefundStatus),
    changedById: z.string().uuid().nullable(),
    reason: z.string().nullable(),
    changedBy: z.object({
        displayName: z.string().nullable(),
    }).optional(),
    createdAt: z.date(),
});

export type RefundStatusLog = z.infer<typeof refundStatusLogSchema>;

export const refundSchema = z.object({
    id: z.string().uuid(),
    ticketId: z.string().uuid(),
    orderId: z.string().uuid().nullable(),
    amount: z.number().or(z.string()), // Decimal in Prisma
    reason: z.string().nullable(),
    status: z.nativeEnum(RefundStatus),
    adminNote: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
    logs: z.array(refundStatusLogSchema).optional(),
});

export type Refund = z.infer<typeof refundSchema>;
