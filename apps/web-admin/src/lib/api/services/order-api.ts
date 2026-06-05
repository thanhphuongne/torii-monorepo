import { apiClient } from '../api-client.ts';
import { formatDateTime } from '@/lib/format-utils';
import type {
    OrderResponseDTO,
    OrderQueryDTO,
    PaginatedApiResponse,
    StandardApiResponse,
} from '@workspace/schemas';
import { OrderStatus } from '@workspace/schemas';

function orderStatusLabelVi(status: OrderStatus): string {
    switch (status) {
        case OrderStatus.PAID:
            return 'Hoàn thành';
        case OrderStatus.PENDING:
        case OrderStatus.PROCESSING:
            return 'Đang xử lý';
        case OrderStatus.FAILED:
            return 'Thất bại';
        case OrderStatus.CANCELLED:
            return 'Đã hủy';
        case OrderStatus.REFUNDED:
            return 'Hoàn tiền';
        default:
            return String(status);
    }
}

function escapeCsvCell(value: unknown): string {
    const s = String(value ?? '');
    return `"${s.replace(/"/g, '""')}"`;
}

function triggerCsvDownload(filename: string, csvText: string): void {
    const blob = new Blob(['\uFEFF', csvText], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
}

export const orderApi = {
    /**
     * Get all orders
     */
    async getAllOrders(query?: OrderQueryDTO): Promise<PaginatedApiResponse<OrderResponseDTO>> {
        const response = await apiClient.get<PaginatedApiResponse<OrderResponseDTO>>('/api/academy/orders/admin', { params: query });
        return response.data;
    },

    /**
     * Get order by ID
     */
    async getOrder(id: string): Promise<OrderResponseDTO> {
        const response = await apiClient.get<StandardApiResponse<OrderResponseDTO>>(`/api/academy/orders/admin/${id}`);
        return response.data.data!;
    },

    /**
     * Update order status
     */
    async updateOrderStatus(id: string, status: string): Promise<OrderResponseDTO> {
        const response = await apiClient.patch<StandardApiResponse<OrderResponseDTO>>(`/api/academy/orders/admin/${id}/status`, { status });
        return response.data.data!;
    },

    async getOrderStats(params?: any): Promise<any> {
        const response = await apiClient.get<StandardApiResponse<any>>('/api/academy/orders/stats', { params });
        return response.data.data;
    },

    async getAllTransactions(params?: any): Promise<any> {
        const response = await apiClient.get<StandardApiResponse<any>>('/api/academy/orders/transactions', { params });
        return response.data.data;
    },

    async cancelOrder(id: string): Promise<void> {
        await apiClient.post(`/api/academy/orders/${id}/cancel`);
    },

    /**
     * Xuất CSV từ cùng nguồn dữ liệu với bảng đơn (`GET .../orders/admin`), không phụ thuộc endpoint `.../export`
     * (tránh 404 do proxy / thứ tự route / triển khai gateway).
     */
    async exportOrders(params?: {
        status?: string;
        search?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<void> {
        const limit = 100;
        let page = 1;
        let totalPages = 1;
        const collected: OrderResponseDTO[] = [];

        const baseQuery: OrderQueryDTO = {
            page: 1,
            limit,
            search: params?.search || undefined,
            status:
                params?.status && params.status !== 'all'
                    ? (params.status as OrderStatus)
                    : undefined,
            startDate: params?.startDate || undefined,
            endDate: params?.endDate || undefined,
        };

        do {
            const res = await this.getAllOrders({ ...baseQuery, page });
            const batch = res.data ?? [];
            collected.push(...batch);
            totalPages = res.totalPages ?? 1;
            page += 1;
        } while (page <= totalPages);

        if (collected.length === 0) {
            throw new Error('Không có đơn hàng nào để xuất trong bộ lọc hiện tại.');
        }

        const headers = [
            'Mã đơn hàng',
            'Khách hàng',
            'Email',
            'Ngày tạo',
            'Trạng thái',
            'Số tiền (VND)',
            'Dịch vụ / gói',
            'Phương thức thanh toán',
        ];

        const lines = [
            headers.map(escapeCsvCell).join(','),
            ...collected.map((order) => {
                const o = order as Record<string, any>;
                const user = o.user as { displayName?: string; email?: string } | undefined;
                const item = Array.isArray(o.items) ? o.items[0] : undefined;
                const serviceLabel =
                    item?.cohort?.name ||
                    item?.vodPackage?.name ||
                    o.orderType ||
                    '';
                const code = o.code ?? String(o.id ?? '').slice(0, 8);
                const grand = o.grandTotal ?? o.amount;
                const amountStr =
                    grand == null || grand === ''
                        ? ''
                        : String(Number(grand as string | number));
                const row = [
                    code,
                    user?.displayName ?? o.userName ?? '',
                    user?.email ?? o.userEmail ?? o.userId,
                    formatDateTime(o.createdAt),
                    orderStatusLabelVi(o.status as OrderStatus),
                    amountStr,
                    serviceLabel,
                    o.paymentMethod ?? '',
                ];
                return row.map(escapeCsvCell).join(',');
            }),
        ];

        const csv = lines.join('\n');
        triggerCsvDownload(`orders-export-${Date.now()}.csv`, csv);
    },


    async getOrdersByCohort(cohortId: string, query?: any): Promise<PaginatedApiResponse<OrderResponseDTO>> {
        const response = await apiClient.get<PaginatedApiResponse<OrderResponseDTO>>(`/api/academy/cohorts/${cohortId}/orders`, { params: query });
        return response.data;
    },

    async getStatsByCohort(cohortId: string): Promise<any> {
        const response = await apiClient.get<StandardApiResponse<any>>(`/api/academy/cohorts/${cohortId}/stats`);
        return response.data.data;
    }
};
