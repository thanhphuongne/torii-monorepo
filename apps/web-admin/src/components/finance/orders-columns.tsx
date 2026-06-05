import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@workspace/ui/components/badge';
import { Button } from '@workspace/ui/components/button';
import {
    Eye,
    FileText,
    XCircle,
} from 'lucide-react';
import { OrderStatus, type OrderResponseDTO } from '@workspace/schemas';
import { formatCurrency, formatDateTime } from '@/lib/format-utils';

interface OrdersColumnsProps {
    onView: (order: OrderResponseDTO) => void;
    onCancel: (order: OrderResponseDTO) => void;
    onExport: (order: OrderResponseDTO) => void;
    page: number;
    limit: number;
}

const getStatusVariant = (status: OrderStatus): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status as any) {
        case OrderStatus.PAID:
            return 'default';
        case OrderStatus.PENDING:
        case OrderStatus.PROCESSING:
            return 'secondary';
        case OrderStatus.FAILED:
        case OrderStatus.CANCELLED:
            return 'destructive';
        case OrderStatus.REFUNDED:
            return 'outline';
        default:
            return 'outline';
    }
};

const getStatusLabel = (status: OrderStatus) => {
    switch (status as any) {
        case OrderStatus.PAID: return 'Hoàn thành';
        case OrderStatus.PENDING: return 'Chờ xử lý';
        case OrderStatus.PROCESSING: return 'Đang xử lý';
        case OrderStatus.FAILED: return 'Thất bại';
        case OrderStatus.CANCELLED: return 'Đã hủy';
        case OrderStatus.REFUNDED: return 'Hoàn tiền';
        default: return status;
    }
};

export const getOrdersColumns = ({ onView, onCancel, onExport, page, limit }: OrdersColumnsProps): ColumnDef<OrderResponseDTO>[] => [
    {
        id: 'stt',
        header: '#',
        cell: ({ row }) => (
            <span className="text-muted-foreground text-sm">{(page - 1) * limit + row.index + 1}</span>
        ),
        size: 50,
    },
    {
        id: 'order',
        header: 'Đơn hàng',
        cell: ({ row }) => {
            const order = row.original as any;
            const user = order.user;
            return (
                <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-sm font-mono">{order.code || (order.id.slice(0, 8) + '...')}</span>
                    <span className="text-xs text-muted-foreground">
                        {user?.displayName || order.userName || user?.email || order.userEmail || order.userId}
                    </span>
                </div>
            );
        }
    },
    {
        accessorKey: 'grandTotal',
        header: 'Số tiền',
        cell: ({ row }) => (
            <span className="font-semibold text-sm">{formatCurrency(row.getValue('grandTotal'))}</span>
        ),
    },
    {
        id: 'service',
        header: 'Dịch vụ',
        cell: ({ row }) => {
            const order = row.original as any;
            const item = order.items?.[0];
            const serviceName = item?.cohortSnapshot?.name || item?.cohort?.name || item?.vodPackageSnapshot?.name || item?.vodPackage?.name || order.orderType || '—';
            return (
                <div className="flex flex-col gap-1">
                    <Badge variant="outline" className="w-fit text-xs">
                        {order.paymentMethod}
                    </Badge>
                    <span className="text-xs text-muted-foreground truncate max-w-[150px]" title={serviceName}>
                        {serviceName}
                    </span>
                </div>
            );
        }
    },
    {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => {
            const status = row.getValue('status') as OrderStatus;
            return (
                <Badge variant={getStatusVariant(status)}>
                    {getStatusLabel(status)}
                </Badge>
            );
        }
    },
    {
        accessorKey: 'createdAt',
        header: 'Ngày tạo',
        cell: ({ row }) => (
            <span className="text-sm text-muted-foreground">
                {formatDateTime(row.getValue('createdAt'), 'dd/MM/yyyy HH:mm')}
            </span>
        ),
    },
    {
        accessorKey: 'completedAt',
        header: 'Hoàn thành',
        cell: ({ row }) => {
            const completedAt = (row.original as any).paidAt || row.original.completedAt;
            if (!completedAt) return <span className="text-sm text-muted-foreground">—</span>;
            return (
                <span className="text-sm text-muted-foreground">
                    {formatDateTime(completedAt, 'dd/MM/yyyy HH:mm')}
                </span>
            );
        }
    },
    {
        id: 'actions',
        header: () => <div className="text-right">Thao tác</div>,
        cell: ({ row }) => {
            const order = row.original;
            return (
                <div className="flex items-center justify-end gap-2">
                    <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => onView(order)}>
                        <Eye className="h-4 w-4" />
                        Xem
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-blue-600 border-blue-500/40"
                        onClick={() => onExport(order)}
                    >
                        <FileText className="h-4 w-4" />
                        Xuất
                    </Button>
                    {(order.status === OrderStatus.PENDING || order.status === OrderStatus.PROCESSING) && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 text-destructive border-destructive/40 hover:text-destructive hover:bg-destructive/5"
                            onClick={() => onCancel(order)}
                        >
                            <XCircle className="h-4 w-4" />
                            Hủy
                        </Button>
                    )}
                </div>
            );
        },
        size: 200,
    }
];
