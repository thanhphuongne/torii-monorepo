import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@workspace/ui/components/sheet';
import { ScrollArea } from '@workspace/ui/components/scroll-area';
import { Button } from '@workspace/ui/components/button';
import { Badge } from '@workspace/ui/components/badge';
import { Label } from '@workspace/ui/components/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@workspace/ui/components/table';
import type { TicketResponseDTO } from '@workspace/schemas';
import { formatDateTime } from '@/lib/format-utils';
import { User, Calendar, MessageSquare, Tag, Info, Building, Coins, Clock } from 'lucide-react';

interface TicketDetailSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    ticket: TicketResponseDTO | null;
}

export function TicketDetailSheet({
    open,
    onOpenChange,
    ticket,
}: TicketDetailSheetProps) {
    if (!ticket) return null;

    const typeLabelMap: Record<string, string> = {
        REFUND: 'Hoàn tiền',
        SUPPORT: 'Hỗ trợ',
        ERROR_REPORT: 'Báo lỗi',
    };

    const statusLabelMap: Record<string, string> = {
        PENDING: 'Đang chờ',
        PROCESSING: 'Đang xử lý',
        RESOLVED: 'Đã giải quyết',
        CANCELLED: 'Đã hủy',
    };

    const renderValue = (value: unknown) => {
        if (value === null) return '—';
        if (value === undefined) return '—';
        if (typeof value === 'string') return value;
        if (typeof value === 'number' || typeof value === 'boolean') return String(value);
        try {
            return JSON.stringify(value, null, 2);
        } catch {
            return String(value);
        }
    };

    const renderMetadata = () => {
        const metadata = (ticket as any).metadata as Record<string, unknown> | undefined;
        if (!metadata || Object.keys(metadata).length === 0) return null;

        const entries = Object.entries(metadata);

        return (
            <div className="space-y-3">
                <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                    Thông tin bổ sung
                </Label>
                <div className="rounded-xl border overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="w-[220px]">Trường</TableHead>
                                <TableHead>Giá trị</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {entries.map(([key, value]) => (
                                <TableRow key={key}>
                                    <TableCell className="align-top py-3">
                                        <div className="text-sm font-medium">{key}</div>
                                    </TableCell>
                                    <TableCell className="align-top py-3">
                                        <pre className="text-xs whitespace-pre-wrap break-words font-mono text-muted-foreground">
                                            {renderValue(value)}
                                        </pre>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        );
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="!w-full sm:!max-w-[800px] max-h-screen p-0 flex flex-col overflow-hidden">
                <SheetHeader className="p-6 border-b shrink-0">
                    <SheetTitle>Chi tiết Ticket #{ticket.id.slice(0, 8)}</SheetTitle>
                    <SheetDescription>
                        Xem lại thông tin chi tiết và lịch sử của ticket.
                    </SheetDescription>
                </SheetHeader>

                <ScrollArea className="flex-1 min-h-0">
                    <div className="space-y-6 p-6">
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/20 p-4">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Mã ticket</p>
                                <p className="text-base font-bold">#{ticket.id.slice(0, 8).toUpperCase()}</p>
                            </div>
                            <Badge variant="outline" className="font-semibold">
                                {statusLabelMap[ticket.status] ?? ticket.status}
                            </Badge>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2 rounded-xl border border-border/50 p-4">
                                <p className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                                    <User className="size-3.5" />
                                    Người gửi
                                </p>
                                <p className="text-sm font-medium">{ticket.user?.displayName || '—'}</p>
                                <p className="text-xs text-muted-foreground">{ticket.user?.email || '—'}</p>
                            </div>
                            <div className="space-y-2 rounded-xl border border-border/50 p-4">
                                <p className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                                    <Tag className="size-3.5" />
                                    Phân loại
                                </p>
                                <p className="text-sm font-medium">{typeLabelMap[ticket.type] ?? ticket.type}</p>
                            </div>
                            <div className="space-y-2 rounded-xl border border-border/50 p-4">
                                <p className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                                    <Calendar className="size-3.5" />
                                    Ngày tạo
                                </p>
                                <p className="text-sm">{formatDateTime(ticket.createdAt)}</p>
                            </div>
                            <div className="space-y-2 rounded-xl border border-border/50 p-4">
                                <p className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                                    <Clock className="size-3.5" />
                                    Cập nhật lần cuối
                                </p>
                                <p className="text-sm">{formatDateTime(ticket.updatedAt)}</p>
                            </div>
                        </div>

                        <div className="space-y-2 rounded-xl border border-border/50 p-4">
                            <p className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                                <Info className="size-3.5" />
                                Tiêu đề
                            </p>
                            <p className="text-sm font-medium">{ticket.subject}</p>
                        </div>

                        <div className="space-y-2 rounded-xl border border-border/50 p-4">
                            <p className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                                <MessageSquare className="size-3.5" />
                                Nội dung
                            </p>
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">{ticket.description}</p>
                        </div>

                        {(ticket as any).refundAmount !== undefined && (ticket as any).refundAmount !== null && (ticket as any).refundAmount > 0 && (
                            <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-4">
                                <p className="flex items-center gap-2 text-xs font-semibold uppercase text-primary">
                                    <Coins className="size-3.5" />
                                    Số tiền hoàn trả
                                </p>
                                <p className="text-lg font-bold text-primary">{(ticket as any).refundAmount} Xu</p>
                            </div>
                        )}

                        {ticket.response && (
                            <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-4">
                                <p className="flex items-center gap-2 text-xs font-semibold uppercase text-primary">
                                    <Building className="size-3.5" />
                                    Phản hồi từ quản trị viên
                                </p>
                                <p className="whitespace-pre-wrap text-sm leading-relaxed">{ticket.response}</p>
                            </div>
                        )}

                        {renderMetadata()}
                    </div>
                </ScrollArea>
                <div className="p-6 border-t flex justify-end bg-muted/20 shrink-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="px-8">
                        Đóng
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
