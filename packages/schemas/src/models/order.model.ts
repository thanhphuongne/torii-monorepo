import { z } from 'zod';

export enum OrderStatus {
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    PAID = 'PAID',
    CANCELLED = 'CANCELLED',
    REFUNDED = 'REFUNDED',
    FAILED = 'FAILED',
}

export enum PaymentMethod {
    PAYOS = 'PAYOS',
    BANK_TRANSFER = 'BANK_TRANSFER',
    MANUAL = 'MANUAL',
    COIN = 'COIN',
}

export enum PaymentGateway {
    PAYOS = 'PAYOS',
    MOMO = 'MOMO',
    STRIPE = 'STRIPE',
    INTERNAL = 'INTERNAL',
}

export enum OrderType {
    COURSE_PURCHASE = 'course_purchase',
    SUBSCRIPTION = 'subscription',
    TOP_UP = 'top_up',
    GIFT = 'gift',
    REFUND = 'refund',
}

export const orderSchema = z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    amount: z.number().min(0),
    currency: z.string().length(3).default('VND'),
    paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.PAYOS),
    paymentGateway: z.nativeEnum(PaymentGateway).optional(),
    transactionId: z.string().optional(),
    gatewayTransactionId: z.string().optional(),
    status: z.nativeEnum(OrderStatus).default(OrderStatus.PENDING),
    orderType: z.nativeEnum(OrderType).default(OrderType.COURSE_PURCHASE),
    enrollmentId: z.string().uuid().optional(),
    couponId: z.string().uuid().optional(),
    description: z.string().optional(),
    metadata: z.record(z.any()).default({}), // originalAmount and discountAmount are stored in metadata
    completedAt: z.date().optional(),
    failedAt: z.date().optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
    checkoutUrl: z.string().optional(),
    qrCode: z.string().optional(),
    courseName: z.string().optional(),
    courseThumbnail: z.string().optional(),
    userEmail: z.string().optional(),
    userName: z.string().optional(),
});

export type Order = z.infer<typeof orderSchema>;

// This represents the actual money movement / bank transaction
export const paymentSchema = z.object({
    id: z.string().uuid(),
    orderId: z.string().uuid().optional(),
    transactionId: z.string().optional(), // Bank transaction ID / SePay ID
    gateway: z.string().optional(),
    amount: z.number().optional(),
    currency: z.string().default('VND'),
    content: z.string().optional(),
    status: z.string().optional(), // success/fail/orphan
    rawResponse: z.any().optional(),
    processedAt: z.date(),
});

export type Payment = z.infer<typeof paymentSchema>;

