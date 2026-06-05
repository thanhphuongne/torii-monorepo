import { createColumnHelper } from '@tanstack/react-table';
import type { UserResponseDTO } from '@workspace/schemas';
import { Button } from '@workspace/ui/components/button';
import { Badge } from '@workspace/ui/components/badge';

import { ArrowUpDown, Pencil, UserCircle, Mail, Clock, ShieldAlert, Eye } from 'lucide-react';
import { Can } from "@/lib/guard/can";
import { formatDateTime } from "@/lib/format-utils";
import { cn } from "@workspace/ui/lib/utils";

const columnHelper = createColumnHelper<UserResponseDTO>();

export type UsersColumnsProps = {
    onView: (user: UserResponseDTO) => void;
    onEdit?: (user: UserResponseDTO) => void;
    onChangeStatus: (user: UserResponseDTO) => void;
    page: number;
    limit: number;
};

export const getUsersColumns = ({ onView, onEdit, onChangeStatus, page, limit }: UsersColumnsProps) => [
    // STT Column
    columnHelper.display({
        id: 'stt',
        header: () => <div className="text-center">#</div>,
        cell: ({ row }) => {
            const stt = (page - 1) * limit + row.index + 1;
            return <div className="text-center font-medium text-muted-foreground/60 tabular-nums text-xs">{stt}</div>;
        },
        size: 50,
    }),
    columnHelper.accessor('displayName', {
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    className="-ml-3 h-8 gap-2 text-xs font-semibold"
                >
                    Họ và tên
                    <ArrowUpDown className="size-3 opacity-50" />
                </Button>
            );
        },
        cell: (info) => {
            const user = info.row.original;
            const avatarUrl = user.avatarUrl;
            const displayName = info.getValue();

            return (
                <div className="flex items-center gap-3">
                    {avatarUrl ? (
                        <img
                            src={avatarUrl}
                            alt={displayName}
                            className="w-8 h-8 rounded-full object-cover border border-border"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                            <UserCircle className="size-4.5" />
                        </div>
                    )}
                    <div className="font-semibold text-foreground text-[14px]">{displayName}</div>
                </div>
            );
        },
    }),
    columnHelper.accessor('email', {
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    className="-ml-3 h-8 gap-2 text-xs font-semibold"
                >
                    Email
                    <ArrowUpDown className="size-3 opacity-50" />
                </Button>
            );
        },
        cell: (info) => (
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                <Mail className="size-3 text-muted-foreground/40" />
                {info.getValue()}
            </div>
        ),
    }),
    columnHelper.accessor('linkedMethods', {
        header: () => <div className="px-1 text-xs font-semibold">Phương thức đăng nhập</div>,
        cell: (info) => {
            const methods = info.getValue() || [];
            if (methods.length === 0) {
                return <span className="text-xs text-muted-foreground/40">Chưa liên kết</span>;
            }

            const methodLabels: Record<string, string> = {
                'password': 'Mật khẩu',
                'google': 'Google',
                'facebook': 'Facebook',
                'github': 'GitHub',
            };

            return (
                <div className="flex flex-wrap gap-1">
                    {methods.map((method, idx) => (
                        <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20"
                        >
                            {methodLabels[method] || method}
                        </span>
                    ))}
                </div>
            );
        },
        size: 180,
    }),
    columnHelper.accessor('role', {
        header: () => <div className="px-1 text-xs font-semibold">Vai trò</div>,
        cell: (info) => {
            const role = info.getValue() as string;
            const roleLabels: Record<string, string> = {
                admin: 'Quản trị viên',
                'staff-academic': 'NV Học vụ',
                'staff-operations': 'NV Vận hành',
                lecturer: 'Giảng viên',
                learner: 'Học viên'
            };
            const label = roleLabels[role] || role;

            return (
                <Badge
                    variant="outline"
                    className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-2",
                        role === 'admin' && "border-destructive text-destructive bg-destructive/5"
                    )}
                >
                    {label}
                </Badge>
            );
        },
        size: 130,
    }),
    columnHelper.accessor(row => {
        if (row.deletedAt) return 'DELETED';
        if (row.bannedUntil && new Date(row.bannedUntil) > new Date()) return 'BANNED';
        if (!row.verifiedAt) return 'UNVERIFIED';
        return 'ACTIVE';
    }, {
        id: 'status',
        header: () => <div className="px-1 text-xs font-semibold">Trạng thái</div>,
        cell: (info) => {
            const status = info.getValue() as string;
            let dotColor = 'bg-emerald-500';
            let label = 'Hoạt động';

            if (status !== 'ACTIVE') {
                dotColor = 'bg-amber-500';
                label = 'Chưa xác thực';
            }
            if (status === 'DELETED') {
                dotColor = 'bg-rose-500';
                label = 'Đã xóa';
            }
            if (status === 'BANNED') {
                dotColor = 'bg-slate-900 dark:bg-slate-100';
                label = 'Đã khóa';
            }

            return (
                <div className="flex items-center gap-2 text-xs font-medium text-foreground/70">
                    <div className={cn("size-1.5 rounded-full", dotColor)} />
                    {label}
                </div>
            );
        },
        size: 130,
    }),
    columnHelper.accessor('createdAt', {
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    className="-ml-3 h-8 px-3 text-xs font-semibold hover:bg-muted transition-all group rounded-md"
                >
                    Ngày đăng ký
                    <ArrowUpDown className="ml-2 h-3 w-3 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
                </Button>
            );
        },
        cell: (info) => (
            <div className="flex items-center gap-2 text-muted-foreground/60 tabular-nums text-[11px] font-medium">
                <Clock className="size-3 text-muted-foreground/30" />
                {formatDateTime(info.getValue())}
            </div>
        ),
        size: 160,
    }),
    columnHelper.accessor('lastSignInAt', {
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    className="-ml-3 h-8 px-3 text-xs font-semibold hover:bg-muted transition-all group rounded-md"
                >
                    Đăng nhập lần cuối
                    <ArrowUpDown className="ml-2 h-3 w-3 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
                </Button>
            );
        },
        cell: (info) => (
            <div className="flex items-center gap-2 text-muted-foreground/60 tabular-nums text-[11px] font-medium">
                <Clock className="size-3 text-muted-foreground/30" />
                {info.getValue() ? formatDateTime(info.getValue()) : 'Chưa đăng nhập'}
            </div>
        ),
        size: 160,
    }),
    columnHelper.display({
        id: 'actions',
        header: () => <div className="text-center text-xs font-semibold">Thao tác</div>,
        cell: ({ row }) => {
            const user = row.original;

            return (
                <div className="flex items-center justify-center gap-2">
                    <Can permission="ops.user.view">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5"
                            onClick={() => onView(user)}
                        >
                            <Eye className="h-4 w-4" />
                            Xem
                        </Button>
                    </Can>
                    <Can permission="ops.user.manage">
                        {onEdit && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5"
                                onClick={() => onEdit(user)}
                            >
                                <Pencil className="h-4 w-4" />
                                Sửa
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 border-amber-500/40 text-amber-600"
                            onClick={() => onChangeStatus(user)}
                        >
                            <ShieldAlert className="h-4 w-4" />
                            Đổi trạng thái
                        </Button>
                    </Can>
                </div>
            );
        },
        size: 180,
    }),
];
