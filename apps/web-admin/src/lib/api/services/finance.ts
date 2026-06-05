import { useQuery } from '@tanstack/react-query';
import { orderApi } from './order-api.ts';
import type { OrderQueryDTO, PaymentQueryDTO } from '@workspace/schemas';

export function useOrders(params: OrderQueryDTO) {
    return useQuery({
        queryKey: ['orders', params],
        queryFn: () => orderApi.getAllOrders(params),
        staleTime: 30000,
    });
}

export function useOrderStats(params: OrderQueryDTO) {
    return useQuery({
        queryKey: ['orders-stats', params],
        queryFn: () => orderApi.getOrderStats(params),
        staleTime: 30000,
    });
}

export function useOrder(id: string) {
    return useQuery({
        queryKey: ['orders', id],
        queryFn: () => orderApi.getOrder(id),
        enabled: !!id,
    });
}

export function useTransactions(params: PaymentQueryDTO) {
    return useQuery({
        queryKey: ['transactions', params],
        queryFn: () => orderApi.getAllTransactions(params),
        staleTime: 30000,
    });
}

export function useOrderPayments(orderId: string) {
    return useQuery({
        queryKey: ['order-payments', orderId],
        queryFn: () => orderApi.getAllTransactions({ orderId, page: 1, limit: 100 }),
        enabled: !!orderId,
    });
}

export function useCohortOrders(cohortId: string, params: any) {
    return useQuery({
        queryKey: ['cohort-orders', cohortId, params],
        queryFn: () => orderApi.getOrdersByCohort(cohortId, params),
        enabled: !!cohortId,
    });
}

export function useCohortStats(cohortId: string) {
    return useQuery({
        queryKey: ['cohort-stats', cohortId],
        queryFn: () => orderApi.getStatsByCohort(cohortId),
        enabled: !!cohortId,
    });
}
