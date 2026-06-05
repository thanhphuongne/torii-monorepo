import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
} from '@workspace/ui/components/sheet';
import { Badge } from '@workspace/ui/components/badge';
import { Button } from '@workspace/ui/components/button';
import { Spinner } from '@workspace/ui/components/spinner';
import { Empty, EmptyContent, EmptyDescription, EmptyMedia, EmptyTitle } from '@workspace/ui/components/empty';
import { AlertCircle } from 'lucide-react';
import { OrderStatus, type OrderResponseDTO } from '@workspace/schemas';
import { formatCurrency, formatDateTime } from '@/lib/format-utils';
import { useOrderPayments } from '@/lib/api/services/finance';
import { ScrollArea } from '@workspace/ui/components/scroll-area';
import { Separator } from '@workspace/ui/components/separator';

interface OrderDetailSheetProps {
    order: OrderResponseDTO | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
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

export function OrderDetailSheet({ order, open, onOpenChange }: OrderDetailSheetProps) {
    const { data: paymentsData, isLoading: isLoadingPayments } = useOrderPayments(order?.id || '');

    if (!order) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="!w-full sm:!max-w-[800px] flex flex-col">
                <SheetHeader>
                    <SheetTitle>Chi tiết đơn hàng</SheetTitle>
                    <SheetDescription>
                        Mã đơn hàng: <span className="font-mono">{(order as any).code || order.id}</span>
                    </SheetDescription>
                </SheetHeader>

                <ScrollArea className="flex-1 min-h-0">
                    <div className="space-y-6 p-6">
                        {/* Status & Amount */}
                        <div className="flex items-center justify-between">
                            <Badge variant={getStatusVariant(order.status)} className="text-sm px-3 py-1">
                                {getStatusLabel(order.status)}
                            </Badge>
                            <span className="text-2xl font-bold">{formatCurrency((order as any).grandTotal || order.amount)}</span>
                        </div>

                        <Separator />

                        {/* Order Info */}
                        <div>
                            <h4 className="text-sm font-semibold mb-3">Thông tin đơn hàng</h4>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Mã đơn</span>
                                    <span className="font-mono text-xs">{(order as any).code || order.id}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Phương thức</span>
                                    <Badge variant="outline">{order.paymentMethod}</Badge>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Loại đơn</span>
                                    <span>{order.orderType}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Ngày khởi tạo</span>
                                    <span>{formatDateTime(order.createdAt)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Cập nhật lần cuối</span>
                                    <span>{formatDateTime(order.updatedAt)}</span>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Customer Info */}
                        <div>
                            <h4 className="text-sm font-semibold mb-3">Thông tin khách hàng</h4>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Họ tên</span>
                                    <span className="font-medium">{(order as any).user?.displayName || (order as any).userName || '—'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Email / ID</span>
                                    <span className="text-xs font-mono">{(order as any).user?.email || (order as any).userEmail || order.userId}</span>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Order Items */}
                        <div>
                            <h4 className="text-sm font-semibold mb-3">Nội dung đơn hàng</h4>
                            <div className="rounded-md border">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/50">
                                            <th className="text-left py-2 px-4 font-medium text-muted-foreground">Mặt hàng</th>
                                            <th className="text-right py-2 px-4 font-medium text-muted-foreground">Thành tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {((order as any).items || []).map((item: any) => (
                                            <tr key={item.id} className="border-b last:border-0">
                                                <td className="py-3 px-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{item.cohortSnapshot?.name || item.cohort?.name || item.vodPackageSnapshot?.name || item.vodPackage?.name || 'Sản phẩm học tập'}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            Mã: {item.cohortSnapshot?.code || item.cohort?.code || item.vodPackageSnapshot?.code || item.vodPackage?.code || '—'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-right font-semibold">{formatCurrency(item.price)}</td>
                                            </tr>
                                        ))}
                                        {(!(order as any).items || (order as any).items.length === 0) && (
                                            <tr>
                                                <td className="py-3 px-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{(order as any).courseTitle || 'Đăng ký khóa học'}</span>
                                                        <span className="text-xs text-muted-foreground">Bao gồm giáo trình và tài liệu</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-right font-semibold">{formatCurrency(order.amount)}</td>
                                            </tr>
                                        )}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t">
                                            <td className="py-2 px-4 text-right text-sm text-muted-foreground">Tổng cộng</td>
                                            <td className="py-2 px-4 text-right font-bold">{formatCurrency((order as any).grandTotal || order.amount)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        <Separator />

                        {/* Transactions */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-semibold">Lịch sử giao dịch</h4>
                                <Badge variant="secondary">{paymentsData?.data?.length || 0} bản ghi</Badge>
                            </div>

                            {isLoadingPayments ? (
                                <div className="py-8 flex items-center justify-center">
                                    <Spinner />
                                </div>
                            ) : !paymentsData?.data?.length ? (
                                <Empty className="py-8">
                                    <EmptyMedia>
                                        <AlertCircle className="size-8 text-muted-foreground" />
                                    </EmptyMedia>
                                    <EmptyContent>
                                        <EmptyTitle>Chưa có giao dịch</EmptyTitle>
                                        <EmptyDescription>Chưa ghi nhận giao dịch nào cho đơn hàng này.</EmptyDescription>
                                    </EmptyContent>
                                </Empty>
                            ) : (
                                <div className="space-y-2">
                                    {paymentsData.data.map((payment: any) => (
                                        <div key={payment.id} className="flex items-center justify-between p-3 rounded-md border">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-sm font-medium">
                                                    Phản hồi từ cổng thanh toán
                                                </span>
                                                <span className="text-xs text-muted-foreground font-mono">
                                                    #{payment.transactionId?.slice(0, 12) || payment.id.slice(0, 8)}
                                                    {' · '}
                                                    {formatDateTime(payment.processedAt)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-semibold">{formatCurrency(payment.amount || 0)}</span>
                                                <Badge variant={payment.status === 'success' ? 'default' : 'destructive'}>
                                                    {payment.status === 'success' ? 'Thành công' : 'Thất bại'}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </ScrollArea>

                <SheetFooter className="p-6 border-t">
                    <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
                        Đóng
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
