import { createColumnHelper } from '@tanstack/react-table';
import { CouponDiscountType, type CouponResponseDTO } from '@workspace/schemas';
import { Button } from '@workspace/ui/components/button';
import {
    ArrowUpDown,
    Pencil,
    Trash,
    Tag,
    Calendar,
    Users,
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/format-utils';
import { cn } from "@workspace/ui/lib/utils";
import { Can } from '@/lib/guard/can';
import { Badge } from '@workspace/ui/components/badge';

const columnHelper = createColumnHelper<CouponResponseDTO>();

export type CouponsColumnsProps = {
    onEdit: (coupon: CouponResponseDTO) => void;
    onDelete: (coupon: CouponResponseDTO) => void;
    page: number;
    limit: number;
};

export const getCouponsColumns = ({ onEdit, onDelete, page, limit }: CouponsColumnsProps) => [
    // STT Column
    columnHelper.display({
        id: 'stt',
        header: () => <div className="text-center">#</div>,
        cell: (info) => {
            const stt = (page - 1) * limit + info.row.index + 1;
            return <div className="text-center font-bold text-muted-foreground/50 tabular-nums text-xs">{stt}</div>;
        },
        size: 50,
    }),
    columnHelper.accessor('code', {
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    className="-ml-4 h-9 px-4 text-xs font-semibold hover:bg-primary/5 hover:text-primary transition-all group"
                >
                    Mã Coupon
                    <ArrowUpDown className="ml-2 h-3.5 w-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
                </Button>
            );
        },
        cell: (info) => (
            <div className="flex items-center gap-3 group/code cursor-pointer" onClick={() => onEdit(info.row.original)}>
                <div className="w-9 h-9 shrink-0 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover/code:bg-primary group-hover/code:text-white transition-all duration-300">
                    <Tag className="size-4" />
                </div>
                <div className="flex flex-col min-w-0">
                    <span className="font-bold text-foreground text-sm font-mono tracking-wide group-hover/code:text-primary transition-colors truncate">{info.getValue()}</span>
                    <span className="text-[10px] font-medium text-muted-foreground/60 truncate">{info.row.original.name}</span>
                </div>
            </div>
        ),
        size: 200,
    }),
    columnHelper.accessor('discountValue', {
        header: () => <div className="px-1 text-center">Giảm giá</div>,
        cell: (info) => {
            const type = info.row.original.discountType;
            const value = info.getValue();
            
            return (
                <div className="flex justify-center">
                    <Badge
                        variant={type === CouponDiscountType.PERCENTAGE ? 'info' : 'success'}
                        className="rounded-md px-2.5 py-1 text-[11px] font-bold tracking-tight"
                    >
                        {type === CouponDiscountType.PERCENTAGE ? `${value}%` : formatCurrency(value)}
                    </Badge>
                </div>
            );
        },
        size: 120,
    }),
    columnHelper.accessor('usageCount', {
        header: ({ column }) => {
            return (
                 <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    className="-ml-4 h-9 px-4 text-xs font-semibold hover:bg-primary/5 hover:text-primary transition-all group w-full justify-center"
                >
                    Lượt dùng
                    <ArrowUpDown className="ml-2 h-3.5 w-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
                </Button>
            );
        },
        cell: (info) => {
            const usage = info.getValue() as number;
            const limit = info.row.original.usageLimit;
            const isUnlimited = limit === null || limit === undefined;
            const percentage = isUnlimited ? 0 : Math.min(100, Math.round((usage / limit) * 100));
            
            return (
                <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1.5 text-xs font-medium tabular-nums">
                        <Users className="size-3 opacity-50" />
                        <span className="text-foreground">{usage}</span>
                        <span className="text-muted-foreground/50">/</span>
                        <span className={isUnlimited ? "text-2xl leading-3 text-muted-foreground/50" : "text-muted-foreground"}>
                            {isUnlimited ? "∞" : limit}
                        </span>
                    </div>
                    {!isUnlimited && (
                        <div className="w-16 h-1 bg-muted/30 rounded-full overflow-hidden">
                            <div 
                                className={cn("h-full rounded-full transition-all", 
                                    percentage >= 90 ? "bg-rose-500" : 
                                    percentage >= 70 ? "bg-amber-500" : "bg-emerald-500"
                                )} 
                                style={{ width: `${percentage}%` }} 
                            />
                        </div>
                    )}
                </div>
            );
        },
        size: 120,
    }),
    columnHelper.accessor('endDate', {
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    className="-ml-4 h-9 px-4 text-xs font-semibold hover:bg-primary/5 hover:text-primary transition-all group w-full justify-center"
                >
                    Hết hạn
                    <ArrowUpDown className="ml-2 h-3.5 w-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
                </Button>
            );
        },
        cell: (info) => {
            const value = info.getValue();
            const date = value ? new Date(value) : null;
            const now = new Date();
            const isExpired = date && date < now;
            
            return (
                <div className={cn(
                    "flex items-center justify-center gap-1.5 text-xs tabular-nums font-medium",
                    isExpired ? "text-rose-500" : "text-muted-foreground"
                )}>
                    <Calendar className="size-3 opacity-50" />
                    {formatDateTime(info.getValue())}
                </div>
            );
        },
        size: 140,
    }),
    columnHelper.accessor('status', {
        header: () => <div className="px-1 text-center">Trạng thái</div>,
        cell: (info) => {
            const status = info.getValue() as string;
            // ACTIVE, INACTIVE, EXPIRED
            const config: Record<
                string,
                { label: string; variant: 'success' | 'secondary' | 'destructive' | 'outline' }
            > = {
                active: { label: 'Hoạt động', variant: 'success' },
                inactive: { label: 'Tạm dừng', variant: 'secondary' },
                expired: { label: 'Đã hết hạn', variant: 'destructive' },
            };
            const isExpired = info.row.original.endDate && new Date(info.row.original.endDate) < new Date();
            
            // Calculate effective status
            let displayStatus = status.toLowerCase();
            if (displayStatus === 'active' && isExpired) {
                displayStatus = 'expired';
            }

            const current = config[displayStatus] ?? { label: status, variant: 'outline' as const };

            return (
                <div className="flex justify-center">
                    <Badge variant={current.variant} className="font-bold uppercase tracking-wider text-[10px]">
                        {current.label}
                    </Badge>
                </div>
            );
        },
        size: 130,
    }),
    columnHelper.display({
        id: 'actions',
        header: () => <div className="text-center">Thao tác</div>,
        cell: ({ row }) => {
            const coupon = row.original;

            return (
                <div className="flex items-center justify-center gap-2">
                    <Can permission="ops.coupon.manage">
                        <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => onEdit(coupon)}>
                            <Pencil className="h-4 w-4" />
                            Sửa
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 text-destructive border-destructive/40 hover:text-destructive hover:bg-destructive/5"
                            onClick={() => onDelete(coupon)}
                        >
                            <Trash className="h-4 w-4" />
                            Xóa
                        </Button>
                    </Can>
                </div>
            );
        },
        size: 140,
    }),
];
