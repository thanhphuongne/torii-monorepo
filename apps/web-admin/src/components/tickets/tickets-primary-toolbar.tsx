
import {
    Search,
    Filter,
} from 'lucide-react';
import { Input } from '@workspace/ui/components/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@workspace/ui/components/select';
import { TicketStatus, TicketType } from '@workspace/schemas';
import {
    listPageFiltersRowClass,
    listPageSearchIconClass,
    listPageSearchInputClass,
    listPageSearchWrapClass,
    listPageToolbarRootClass,
} from '@/lib/ui-shell';
import { cn } from '@workspace/ui/lib/utils';

interface TicketsPrimaryToolbarProps {
    search: string;
    onSearchChange: (value: string) => void;
    type: string | undefined;
    onTypeChange: (value: string) => void;
    status: string | undefined;
    onStatusChange: (value: string) => void;
}

export function TicketsPrimaryToolbar({
    search,
    onSearchChange,
    type,
    onTypeChange,
    status,
    onStatusChange,
}: TicketsPrimaryToolbarProps) {
    return (
        <div className={listPageToolbarRootClass}>
            <div className={cn(listPageSearchWrapClass, 'group')}>
                <Search className={cn(listPageSearchIconClass, 'transition-colors group-focus-within:text-primary')} />
                <Input
                    placeholder="Tìm kiếm theo tiêu đề, email, ID..."
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className={cn(
                        listPageSearchInputClass,
                        'border-border bg-background transition-all focus-visible:ring-2 focus-visible:ring-primary/20',
                    )}
                />
            </div>

            <div className={listPageFiltersRowClass}>
                <Select value={type || 'all'} onValueChange={onTypeChange}>
                    <SelectTrigger className="h-10 w-full md:w-[180px] rounded-lg border-border bg-background hover:bg-muted/50 transition-all text-sm">
                        <div className="flex items-center gap-2">
                            <Filter className="size-3.5 text-muted-foreground" />
                            <SelectValue placeholder="Loại hỗ trợ" />
                        </div>
                    </SelectTrigger>
                    <SelectContent align="end" className="rounded-xl border-border/60 shadow-xl bg-background">
                        <SelectItem value="all">Tất cả loại</SelectItem>
                        <SelectItem value={TicketType.SUPPORT}>Hỗ trợ kỹ thuật</SelectItem>
                        <SelectItem value={TicketType.REFUND}>Hoàn tiền</SelectItem>
                        <SelectItem value={TicketType.ERROR_REPORT}>Báo lỗi</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={status || 'all'} onValueChange={onStatusChange}>
                    <SelectTrigger className="h-10 w-full md:w-[180px] rounded-lg border-border bg-background hover:bg-muted/50 transition-all text-sm">
                        <div className="flex items-center gap-2">
                            <Filter className="size-3.5 text-muted-foreground" />
                            <SelectValue placeholder="Trạng thái" />
                        </div>
                    </SelectTrigger>
                    <SelectContent align="end" className="rounded-xl border-border/60 shadow-xl bg-background">
                        <SelectItem value="all">Tất cả trạng thái</SelectItem>
                        <SelectItem value={TicketStatus.PENDING}>Đang chờ</SelectItem>
                        <SelectItem value={TicketStatus.PROCESSING}>Đang xử lý</SelectItem>
                        <SelectItem value={TicketStatus.RESOLVED}>Đã giải quyết</SelectItem>
                        <SelectItem value={TicketStatus.CANCELLED}>Đã hủy</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
