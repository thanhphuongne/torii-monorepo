import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api-client';
import type {
    OrderQueryDTO,
    OrderConfirmDTO,
    StandardApiResponse,
    PaginatedApiResponse,
    BalanceTransactionPaginatedResponse,
    PaymentMethod
} from '@workspace/schemas';

export interface OrderPreviewDTO {
    vodPackageIds?: string[];
    cohortIds?: string[];
    liveClassIds?: string[];
    subscriptionPlanIds?: string[];
    couponCode?: string;
    isGift?: boolean;
    recipientEmail?: string;
    giftMessage?: string;
    metadata?: Record<string, unknown>;
    liveClassIdByCohort?: Record<string, string>;
    useWalletBalance?: boolean;
}

export interface OrderCheckoutDTO {
    vodPackageIds?: string[];
    cohortIds?: string[];
    liveClassIds?: string[];
    subscriptionPlanIds?: string[];
    couponCode?: string;
    paymentMethod: PaymentMethod | string;
    description?: string;
    isGift?: boolean;
    recipientEmail?: string;
    giftMessage?: string;
    metadata?: Record<string, unknown>;
    liveClassIdByCohort?: Record<string, string>;
    useWalletBalance?: boolean;
}

export interface OrderPreviewResponse {
    subtotal: number;
    subTotal?: number;
    discount: number;
    discountTotal?: number;
    prorationDiscount?: number;
    walletDiscount?: number;
    total: number;
    grandTotal?: number;
    items: any[];
}

export interface LearnerOrder {
    id: string;
    transactionId?: string;
    code: string;
    status: string;
    paymentMethod?: string;
    createdAt: string;
    amount: number;
    description: string;
    items?: Array<{
        productId: string;
        product?: { id: string; name: string; code: string };
    }>;
    metadata?: any;
}

export interface OrderFulfillmentSummary {
    id: string;
    code: string;
    status: string;
    paidAt?: string | null;
    grandTotal: number | string;
    currency: string;
    items: Array<{
        productId: string;
        productCode: string;
        productName: string;
        expectedLiveClassIds: string[];
        enrolledLiveClassIds: string[];
        missingLiveClassIds: string[];
    }>;
}

export const orderApi = {
    /**
     * Get all orders
     */
    async getAllOrders(query?: OrderQueryDTO): Promise<PaginatedApiResponse<LearnerOrder>> {
        const statusMap: Record<string, string> = {
            completed: 'PAID',
            paid: 'PAID',
            pending: 'PENDING',
            processing: 'PROCESSING',
            failed: 'FAILED',
            cancelled: 'CANCELLED',
            refunded: 'REFUNDED',
            timed_out: 'FAILED',
        };
        const normalizedStatus =
            typeof query?.status === 'string'
                ? (statusMap[query.status.toLowerCase()] ?? query.status.toUpperCase())
                : query?.status;
        const response = await apiClient.get<StandardApiResponse<any>>('/api/academy/orders/my', {
            params: { ...query, status: normalizedStatus },
        });
        const raw = response.data.data!;
        // Hỗ trợ cả array (new flow) và paginated format
        const items = Array.isArray(raw) ? raw : (raw.items ?? []);
        const total = Array.isArray(raw) ? raw.length : (raw.total ?? items.length);
        const page = Array.isArray(raw) ? 1 : (raw.page ?? 1);
        const limit = Array.isArray(raw) ? raw.length : (raw.limit ?? 10);
        const totalPages = Array.isArray(raw) ? 1 : (raw.totalPages ?? 1);
        const getItemTitle = (item: any) =>
            item.vodPackage?.title ?? item.cohort?.name ?? item.subscriptionPlan?.name ?? (item.deliverySnapshot as any)?.title ?? null;
        const mapped = items.map((order: any) => ({
            id: order.id,
            transactionId: order.code,
            code: order.code,
            status: order.status,
            paymentMethod: order.paymentMethod,
            createdAt: order.createdAt,
            amount: Number(order.grandTotal ?? 0),
            description: order.items?.map((it: any) => getItemTitle(it)).filter(Boolean).join(', ') || `Đơn hàng ${order.code}`,
            metadata: order.metadata,
            items: (order.items ?? []).map((it: any) => ({
                ...it,
                productId: it.vodPackageId ?? it.cohortId ?? it.subscriptionPlanId,
                product: it.vodPackage ? { id: it.vodPackage.id, name: it.vodPackage.title, code: it.vodPackage.code } :
                    it.cohort ? { id: it.cohort.id, name: it.cohort.name, code: it.cohort.code } :
                        it.subscriptionPlan ? { id: it.subscriptionPlan.id, name: it.subscriptionPlan.name, code: it.subscriptionPlan.code } : undefined,
            })),
        }));
        return {
            success: response.data.success,
            data: mapped,
            total,
            page,
            limit,
            totalPages,
        };
    },

    /**
     * Preview order totals and discounts
     */
    async previewOrder(data: OrderPreviewDTO): Promise<OrderPreviewResponse> {
        const response = await apiClient.post<StandardApiResponse<OrderPreviewResponse>>('/api/academy/orders/preview', data);
        if (!response.data.success || !response.data.data) {
            throw new Error(response.data.message || 'Failed to preview order');
        }
        const payload = response.data.data as any;
        return {
            subtotal: Number(payload.subTotal ?? 0),
            subTotal: Number(payload.subTotal ?? 0),
            discount: Number(payload.discountTotal ?? 0),
            discountTotal: Number(payload.discountTotal ?? 0),
            prorationDiscount: Number(payload.prorationDiscount ?? 0),
            walletDiscount: Number(payload.walletDiscount ?? 0),
            total: Number(payload.grandTotal ?? 0),
            grandTotal: Number(payload.grandTotal ?? 0),
            items: payload.products ?? [],
        };
    },

    /**
     * Get order by ID
     */
    async getOrder(id: string): Promise<LearnerOrder> {
        const response = await apiClient.get<StandardApiResponse<{ item: any }>>(`/api/academy/orders/my/${id}`);
        const order = response.data.data!.item;
        return {
            id: order.id,
            transactionId: order.code,
            code: order.code,
            status: order.status,
            paymentMethod: order.paymentMethod,
            createdAt: order.createdAt,
            amount: Number(order.grandTotal ?? 0),
            description: order.items?.map((item: any) => item.product?.name).filter(Boolean).join(', ') || `Đơn hàng ${order.code}`,
            metadata: order.metadata,
            items: order.items.map((it: any) => ({
                ...it,
                productId: it.productId,
                product: it.product
            })),
        };
    },

    /**
     * Create order (Checkout)
     */
    async createOrder(data: OrderCheckoutDTO): Promise<{ orderCode?: string; id?: string; paymentUrl?: string }> {
        const response = await apiClient.post<StandardApiResponse<{ orderCode?: string; id?: string; paymentUrl?: string }>>('/api/academy/orders/checkout', data);

        if (!response.data.success || !response.data.data) {
            throw new Error(response.data.message || 'Failed to create order');
        }

        return response.data.data;
    },

    async getOrderByCode(orderCode: string): Promise<OrderFulfillmentSummary> {
        const response = await apiClient.get<StandardApiResponse<OrderFulfillmentSummary>>(
            `/api/academy/orders/by-code/${orderCode}`,
        );
        if (!response.data.success || !response.data.data) {
            throw new Error(response.data.message || 'Failed to fetch order by code');
        }
        const summary = response.data.data;
        return summary;
    },

    async repayOrder(id: string): Promise<{ paymentUrl: string }> {
        const response = await apiClient.post<StandardApiResponse<{ paymentUrl: string }>>(`/api/academy/orders/${id}/repay`);
        if (!response.data.success || !response.data.data) {
            throw new Error(response.data.message || 'Failed to repay order');
        }
        return response.data.data;
    },
};

/**
 * Hook: Get paginated orders
 */
export function useOrders(query?: OrderQueryDTO) {
    return useQuery({
        queryKey: ['orders', query],
        queryFn: () => orderApi.getAllOrders(query),
    });
}

/**
 * Hook: Get single order detail
 */
export function useOrder(id: string) {
    return useQuery({
        queryKey: ['orders', id],
        queryFn: () => orderApi.getOrder(id),
        enabled: !!id,
    });
}

import { useMutation } from '@tanstack/react-query';
export function useRepayOrder() {
    return useMutation({
        mutationFn: (id: string) => orderApi.repayOrder(id),
    });
}

/** Alias tên module thanh toán / đơn hàng */
export const paymentApi = orderApi;
