import {
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@workspace/ui/components/table';
import { ShieldAlert } from 'lucide-react';
import { Empty, EmptyContent, EmptyMedia, EmptyTitle, EmptyDescription } from '@workspace/ui/components/empty';
import { Skeleton } from '@workspace/ui/components/skeleton';
import type { AuditLog } from '@/lib/api/services/audit-logs';
import { getAuditLogsColumns } from './audit-logs-columns';

interface AuditLogsTableProps {
    data: AuditLog[];
    onViewDetails: (log: AuditLog) => void;
    page: number;
    limit: number;
    isLoading?: boolean;
}

export function AuditLogsTable({
    data,
    onViewDetails,
    page,
    limit,
    isLoading,
}: AuditLogsTableProps) {
    const columns = getAuditLogsColumns({ page, limit, onViewDetails });

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <Table>
            <TableHeader className={"bg-muted/50"}>
                {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                            <TableHead key={header.id}>
                                {header.isPlaceholder
                                    ? null
                                    : flexRender(
                                        header.column.columnDef.header,
                                        header.getContext()
                                    )}
                            </TableHead>
                        ))}
                    </TableRow>
                ))}
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    Array.from({ length: 10 }).map((_, index) => (
                        <TableRow key={index}>
                            {columns.map((_, colIndex) => (
                                <TableCell key={colIndex}>
                                    <Skeleton className="h-4 w-full" />
                                </TableCell>
                            ))}
                        </TableRow>
                    ))
                ) : table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id}>
                            {row.getVisibleCells().map((cell) => (
                                <TableCell key={cell.id}>
                                    {flexRender(
                                        cell.column.columnDef.cell,
                                        cell.getContext()
                                    )}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))
                ) : (
                    <TableRow className="hover:bg-transparent">
                        <TableCell
                            colSpan={columns.length}
                            className="h-96 text-center"
                        >
                            <Empty>
                                <EmptyMedia>
                                    <ShieldAlert className="size-8 text-muted-foreground" />
                                </EmptyMedia>
                                <EmptyContent>
                                    <EmptyTitle>Không tìm thấy bản ghi</EmptyTitle>
                                    <EmptyDescription>
                                        Thử điều chỉnh điều kiện lọc hoặc chọn khoảng thời gian khác.
                                    </EmptyDescription>
                                </EmptyContent>
                            </Empty>
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
}
