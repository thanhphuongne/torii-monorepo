import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@workspace/ui/components/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog';
import { Button } from '@workspace/ui/components/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select';
import {
    Field,
    FieldLabel,
} from '@workspace/ui/components/field';
import type { TicketResponseDTO } from '@workspace/schemas';
import { TicketStatus, TicketType } from '@workspace/schemas';
import { toast } from 'sonner';
import { useUpdateTicketStatus } from "@/lib/api/services/tickets";
import { Spinner } from "@workspace/ui/components/spinner";
import { Textarea } from "@workspace/ui/components/textarea";
import { Input } from "@workspace/ui/components/input";

interface ChangeTicketStatusDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    ticket: TicketResponseDTO | null;
}

export function ChangeTicketStatusDialog({
    open,
    onOpenChange,
    ticket,
}: ChangeTicketStatusDialogProps) {
    const updateTicketStatus = useUpdateTicketStatus();
    const [selectedStatus, setSelectedStatus] = useState<TicketStatus>(TicketStatus.PENDING);
    const [response, setResponse] = useState('');
    const [refundAmount, setRefundAmount] = useState<number>(0);
    const [showConfirm, setShowConfirm] = useState(false);

    // Derive refund amount from metadata.orderAmount (stored at ticket creation time)
    const metaOrderAmount = Number((ticket?.metadata as any)?.orderAmount ?? 0);
    // Fallback: previously stored refundAmount on the ticket itself
    const storedRefundAmount = Number((ticket as any)?.refundAmount ?? 0);

    useEffect(() => {
        if (ticket) {
            setSelectedStatus(ticket.status as TicketStatus);
            setResponse(ticket.response || '');
            // Pre-fill: use ticket.refundAmount if already set, otherwise use metadata.orderAmount
            const initial = storedRefundAmount || metaOrderAmount;
            setRefundAmount(initial);
        }
    }, [ticket, open]);

    if (!ticket) return null;

    const isRefundTicket = ticket.type === TicketType.REFUND;
    const hasOrderAmount = metaOrderAmount > 0;

    const handleUpdateClick = () => {
        if (selectedStatus === ticket.status) {
            onOpenChange(false);
            return;
        }
        setShowConfirm(true);
    };

    const handleConfirmUpdate = async () => {
        try {
            await (updateTicketStatus.mutateAsync as any)({
                id: ticket.id,
                status: selectedStatus,
                response: response,
                refundAmount: selectedStatus === TicketStatus.RESOLVED && isRefundTicket
                    ? refundAmount
                    : undefined,
            });
            toast.success('Đã cập nhật trạng thái ticket', {
                description: `Trạng thái của ticket đã được thay đổi thành công.`,
            });
            setShowConfirm(false);
            onOpenChange(false);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Không thể cập nhật trạng thái';
            toast.error('Cập nhật thất bại', {
                description: errorMessage,
            });
        }
    };

    const getStatusLabel = (status: TicketStatus) => {
        switch (status) {
            case TicketStatus.PENDING: return 'Đang chờ';
            case TicketStatus.PROCESSING: return 'Đang xử lý';
            case TicketStatus.RESOLVED: return 'Đã giải quyết';
            case TicketStatus.CANCELLED: return 'Đã hủy';
            default: return status;
        }
    }

    return (
        <>
            <Dialog open={open && !showConfirm} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>Thay đổi trạng thái Ticket</DialogTitle>
                        <DialogDescription>
                            Cập nhật trạng thái cho ticket <strong>#{ticket.id.substring(0, 8)}</strong>.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        <Field className="space-y-2">
                            <FieldLabel>Trạng thái mới</FieldLabel>
                            <Select
                                value={selectedStatus}
                                onValueChange={(value) => setSelectedStatus(value as TicketStatus)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn trạng thái" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={TicketStatus.PENDING} disabled={ticket.status !== TicketStatus.PENDING}>
                                        {getStatusLabel(TicketStatus.PENDING)}
                                    </SelectItem>
                                    <SelectItem value={TicketStatus.PROCESSING} disabled={ticket.status === TicketStatus.CANCELLED || ticket.status === TicketStatus.RESOLVED}>
                                        {getStatusLabel(TicketStatus.PROCESSING)}
                                    </SelectItem>
                                    <SelectItem value={TicketStatus.RESOLVED}>
                                        {getStatusLabel(TicketStatus.RESOLVED)}
                                    </SelectItem>
                                    <SelectItem value={TicketStatus.CANCELLED}>
                                        {getStatusLabel(TicketStatus.CANCELLED)}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            {isRefundTicket && (
                                <p className="text-[13px] text-muted-foreground mt-2 bg-muted/50 p-2 rounded border border-dashed">
                                    {ticket.status === TicketStatus.PENDING ? (
                                        "ℹ️ Ticket Hoàn tiền cần được xác minh trước khi hoàn trả."
                                    ) : ticket.status === TicketStatus.PROCESSING ? (
                                        "ℹ️ Khi chuyển sang 'Đã giải quyết', số xu sẽ được cộng vào ví người dùng."
                                    ) : null}
                                </p>
                            )}
                        </Field>

                        {/* Refund Amount – pre-filled from metadata.orderAmount, still editable */}
                        {selectedStatus === TicketStatus.RESOLVED && isRefundTicket && (
                            <Field className="space-y-2">
                                <FieldLabel>Số tiền hoàn trả (Xu)</FieldLabel>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        value={refundAmount}
                                        onChange={(e) => setRefundAmount(Number(e.target.value))}
                                        className="pr-12"
                                        placeholder="Nhập số xu..."
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">Xu</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {hasOrderAmount
                                        ? `Tự động điền từ đơn hàng gốc (1 VND = 1 Xu). Có thể chỉnh sửa nếu cần.`
                                        : `⚠️ Không tìm thấy giá đơn hàng, vui lòng nhập thủ công.`
                                    }
                                </p>
                            </Field>
                        )}

                        <Field className="space-y-2">
                            <FieldLabel>Phản hồi cho người dùng (tùy chọn)</FieldLabel>
                            <Textarea
                                value={response}
                                onChange={(e) => setResponse(e.target.value)}
                                placeholder="Nhập nội dung phản hồi..."
                                rows={4}
                            />
                        </Field>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Hủy bỏ
                        </Button>
                        <Button onClick={handleUpdateClick}>
                            Tiếp tục
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận thay đổi?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Hành động này sẽ thay đổi trạng thái của ticket từ
                            <span className="font-medium text-foreground mx-1">{getStatusLabel(ticket.status as TicketStatus)}</span>
                            sang
                            <span className="font-medium text-primary mx-1">{getStatusLabel(selectedStatus)}</span>.
                            {selectedStatus === TicketStatus.RESOLVED && isRefundTicket && refundAmount > 0 && (
                                <span className="block mt-1 text-amber-600 font-medium">
                                    💰 {refundAmount.toLocaleString('vi-VN')} Xu sẽ được hoàn vào ví người dùng.
                                </span>
                            )}
                            Một thông báo sẽ được gửi đến người dùng.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={updateTicketStatus.isPending}>Quay lại</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleConfirmUpdate();
                            }}
                            disabled={updateTicketStatus.isPending}
                        >
                            {updateTicketStatus.isPending ? (
                                <>
                                    <Spinner className="mr-2 h-4 w-4" />
                                    Đang lưu...
                                </>
                            ) : (
                                "Xác nhận thay đổi"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
