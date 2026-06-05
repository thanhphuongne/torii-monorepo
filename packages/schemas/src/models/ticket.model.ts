import { z } from 'zod';

export enum TicketType {
    REFUND = 'REFUND',
    SUPPORT = 'SUPPORT',
    ERROR_REPORT = 'ERROR_REPORT',
}

export enum TicketStatus {
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    RESOLVED = 'RESOLVED',
    CANCELLED = 'CANCELLED',
}

export const ticketSchema = z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(), // Student/Author
    handlerId: z.string().uuid().optional().nullable(), // Staff
    type: z.nativeEnum(TicketType),
    status: z.nativeEnum(TicketStatus),
    subject: z.string().min(1).max(255),
    description: z.string().min(1),
    liveClassId: z.string().uuid().optional().nullable(),
    orderId: z.string().uuid().optional().nullable(),
    metadata: z.record(z.any()).optional().nullable(),
    refundAmount: z.number().optional().nullable(),
    response: z.string().optional().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export type Ticket = z.infer<typeof ticketSchema>;
