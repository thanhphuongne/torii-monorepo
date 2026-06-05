import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@workspace/ui/components/badge';
import { Button } from '@workspace/ui/components/button';
import { formatDateTime } from '@/lib/format-utils';
import { Fingerprint, Eye } from 'lucide-react';
import type { AuditLog } from '@/lib/api/services/audit-logs';
import { ACTION_MAP, ENTITY_MAP } from './audit-log-details-sheet';

interface GetAuditLogsColumnsProps {
    page: number;
    limit: number;
    onViewDetails: (log: AuditLog) => void;
}

export const getAuditLogsColumns = ({
    page,
    limit,
    onViewDetails,
}: GetAuditLogsColumnsProps): ColumnDef<AuditLog>[] => [
        {
            accessorKey: 'index',
            header: () => <div className="text-center">#</div>,
            cell: ({ row }) => {
                return (
                    <div className="text-center font-medium text-muted-foreground">
                        {page * limit - limit + row.index + 1}
                    </div>
                );
            },
        },
        {
            accessorKey: 'createdAt',
            header: 'Thời gian',
            cell: ({ row }) => (
                <div className="text-sm font-mono text-muted-foreground">
                    {formatDateTime(row.original.createdAt, 'yyyy-MM-dd HH:mm:ss')}
                </div>
            ),
        },
        {
            accessorKey: 'user',
            header: 'Người dùng',
            cell: ({ row }) => {
                const user = row.original.user;
                return (
                    <div>
                        <div className="font-semibold">{user?.displayName || 'Ẩn danh'}</div>
                        <div className="text-xs text-muted-foreground">{user?.role || 'Guest'}</div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'action',
            header: 'Hành động',
            cell: ({ row }) => {
                const log = row.original;
                return (
                    <div className="flex flex-col gap-1">
                        <Badge variant="secondary">{ACTION_MAP[log.action] || log.action}</Badge>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Fingerprint className="size-3" />
                            {ENTITY_MAP[log.entity] || log.entity}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'description',
            header: 'Mô tả',
            cell: ({ row }) => (
                <div className="max-w-md truncate">
                    {row.original.description}
                </div>
            ),
        },
        {
            id: 'actions',
            header: () => <div className="text-right">Thao tác</div>,
            cell: ({ row }) => (
                <div className="text-right">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5"
                        onClick={() => onViewDetails(row.original)}
                    >
                        <Eye className="size-4" />
                        Xem
                    </Button>
                </div>
            ),
        },
    ];
