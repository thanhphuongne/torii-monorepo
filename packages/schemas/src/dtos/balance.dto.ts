import { z } from 'zod';

export enum BalanceTransactionType {
    TOP_UP = 'TOP_UP',
    REFUND = 'REFUND',
    PURCHASE = 'PURCHASE',
    REWARD = 'REWARD',
    BONUS = 'BONUS',
    OTHER = 'OTHER',
}

export const balanceTransactionSchema = z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    amount: z.number().int(),
    type: z.nativeEnum(BalanceTransactionType),
    description: z.string().nullable(),
    metadata: z.record(z.any()).default({}),
    createdAt: z.date(),
});

export type BalanceTransaction = z.infer<typeof balanceTransactionSchema>;

export const balanceTransactionQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).default(10),
    type: z.nativeEnum(BalanceTransactionType).optional(),
});

export type BalanceTransactionQuery = z.infer<typeof balanceTransactionQuerySchema>;

export const balanceTransactionPaginatedResponseSchema = z.object({
    data: z.array(balanceTransactionSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
});

export type BalanceTransactionPaginatedResponse = z.infer<typeof balanceTransactionPaginatedResponseSchema>;
