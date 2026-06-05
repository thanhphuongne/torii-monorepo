import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@workspace/ui/components/dialog';
import { Button } from '@workspace/ui/components/button';
import { Calendar } from '@workspace/ui/components/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@workspace/ui/components/popover';
import { CalendarIcon, Download } from 'lucide-react';
import { formatDateTime, vi } from '@/lib/format-utils';
import { cn } from "@workspace/ui/lib/utils";
import { toast } from 'sonner';
import { orderApi } from '@/lib/api/services/order-api';
import { extractErrorMessage } from '@/lib/api/api-client';
import { OrderStatus } from '@workspace/schemas';
import {
    Field,
    FieldLabel,
    FieldGroup,
} from '@workspace/ui/components/field';

interface ExportOrdersDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    filters: {
        status?: string;
        search?: string;
        startDate?: string;
        endDate?: string;
    };
}

export function ExportOrdersDialog({ open, onOpenChange, filters }: ExportOrdersDialogProps) {
    const [startDate, setStartDate] = useState<string>(filters.startDate || '');
    const [endDate, setEndDate] = useState<string>(filters.endDate || '');
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        try {
            setIsExporting(true);
            toast.info('Hệ thống đang xử lý tệp CSV, vui lòng đợi...');

            await orderApi.exportOrders({
                status: filters.status !== 'all' ? filters.status as OrderStatus : undefined,
                search: filters.search || undefined,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
            } as any);

            toast.success('Đã xuất dữ liệu thành công');
            onOpenChange(false);
        } catch (error: unknown) {
            toast.error('Lỗi khi xuất dữ liệu: ' + (extractErrorMessage(error as any) || 'Lỗi không xác định'));
        } finally {
            setIsExporting(false);
        }
    };

    const handleClose = () => {
        if (!isExporting) {
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>Xuất dữ liệu giao dịch</DialogTitle>
                    <DialogDescription>
                        Chọn khoảng thời gian để xuất báo cáo CSV. Để trống để xuất toàn bộ dữ liệu.
                    </DialogDescription>
                </DialogHeader>

                <FieldGroup>
                    <div className="grid grid-cols-2 gap-4">
                        <Field>
                            <FieldLabel>Từ ngày</FieldLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !startDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {startDate ? formatDateTime(startDate, "dd/MM/yyyy") : <span>Chọn ngày</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={startDate ? new Date(startDate) : undefined}
                                        onSelect={(date) => setStartDate(date ? formatDateTime(date, "yyyy-MM-dd") : '')}
                                        initialFocus
                                        locale={vi}
                                    />
                                </PopoverContent>
                            </Popover>
                        </Field>

                        <Field>
                            <FieldLabel>Đến ngày</FieldLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !endDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {endDate ? formatDateTime(endDate, "dd/MM/yyyy") : <span>Chọn ngày</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={endDate ? new Date(endDate) : undefined}
                                        onSelect={(date) => setEndDate(date ? formatDateTime(date, "yyyy-MM-dd") : '')}
                                        initialFocus
                                        locale={vi}
                                    />
                                </PopoverContent>
                            </Popover>
                        </Field>
                    </div>

                    {(startDate || endDate) && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full"
                            onClick={() => { setStartDate(''); setEndDate(''); }}
                        >
                            Xóa bộ lọc ngày
                        </Button>
                    )}
                </FieldGroup>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={isExporting}>
                        Hủy
                    </Button>
                    <Button onClick={handleExport} disabled={isExporting}>
                        <Download className="mr-2 size-4" />
                        {isExporting ? 'Đang xử lý...' : 'Xuất CSV'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
