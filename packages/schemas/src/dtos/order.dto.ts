import { z } from 'zod';
import { orderSchema, OrderStatus, PaymentMethod, PaymentGateway, OrderType } from '../models/order.model';

export const orderResponseDTOSchema = orderSchema;

export type OrderResponseDTO = z.infer<typeof orderResponseDTOSchema>;

export const orderCreateDTOSchema = z.object({
    amount: z.coerce.number().optional(), // For TOP_UP order type
    paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.PAYOS),
    paymentGateway: z.nativeEnum(PaymentGateway).optional(),
    orderType: z.nativeEnum(OrderType).default(OrderType.COURSE_PURCHASE),
    couponCode: z.string().optional(),
    description: z.string().optional(),
    returnUrl: z.string().url().optional(),
    cancelUrl: z.string().url().optional(),
    metadata: z.record(z.any()).optional(),
});

export type OrderCreateDTO = z.infer<typeof orderCreateDTOSchema>;

export const orderQueryDTOSchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).default(10),
    search: z.string().optional(),
    userId: z.string().uuid().optional(),
    status: z.nativeEnum(OrderStatus).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
});

export type OrderQueryDTO = z.infer<typeof orderQueryDTOSchema>;

export const orderSearchRequestDTOSchema = orderQueryDTOSchema;
export type OrderSearchRequestDTO = z.infer<typeof orderSearchRequestDTOSchema>;

export const orderConfirmDTOSchema = z.object({
    orderId: z.string().uuid(),
    transactionId: z.string().optional(),
    gatewayTransactionId: z.string().optional(),
    metadata: z.record(z.any()).optional(),
});

export type OrderConfirmDTO = z.infer<typeof orderConfirmDTOSchema>;

export const orderPaginatedResponseSchema = z.object({
    data: z.array(orderResponseDTOSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
});

export type OrderPaginatedResponse = z.infer<typeof orderPaginatedResponseSchema>;

/**
 * Payment (Transaction) DTOs
 */
import { paymentSchema } from '../models/order.model';

export const paymentResponseDTOSchema = paymentSchema;
export type PaymentResponseDTO = z.infer<typeof paymentResponseDTOSchema>;

export const paymentQueryDTOSchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).default(10),
    orderId: z.string().uuid().optional(),
    userId: z.string().uuid().optional(),
    status: z.string().optional(),
    transactionId: z.string().optional(),
});

export type PaymentQueryDTO = z.infer<typeof paymentQueryDTOSchema>;

export const paymentSearchRequestDTOSchema = paymentQueryDTOSchema;
export type PaymentSearchRequestDTO = z.infer<typeof paymentSearchRequestDTOSchema>;

export const paymentPaginatedResponseSchema = z.object({
    data: z.array(paymentResponseDTOSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
});

export type PaymentPaginatedResponse = z.infer<typeof paymentPaginatedResponseSchema>;

