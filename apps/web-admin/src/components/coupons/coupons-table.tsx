import {
    flexRender,
    getCoreRowModel,
    useReactTable,
    getSortedRowModel,
    type SortingState,
} from '@tanstack/react-table';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@workspace/ui/components/table';
import { Skeleton } from '@workspace/ui/components/skeleton';
import { useState } from 'react';
import { Ticket } from 'lucide-react'; // Using Ticket as generic "coupon" icon
import { Empty, EmptyContent, EmptyMedia, EmptyTitle, EmptyDescription } from '@workspace/ui/components/empty';

import type { CouponResponseDTO } from '@workspace/schemas';
import { getCouponsColumns } from './coupons-columns.tsx';

interface CouponsTableProps {
    data: CouponResponseDTO[];
    onEdit: (coupon: CouponResponseDTO) => void;
    onDelete: (coupon: CouponResponseDTO) => void;
    page: number;
    limit: number;
    isLoading?: boolean;
}

export function CouponsTable({
    data,
    onEdit,
    onDelete,
    page,
    limit,
    isLoading
}: CouponsTableProps) {
    const [sorting, setSorting] = useState<SortingState>([]);

    const columns = getCouponsColumns({
        onEdit,
        onDelete,
        page,
        limit
    });

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        state: {
            sorting,
        },
    });

    return (
        <Table>
            <TableHeader className={"bg-muted/50"}>
                {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => {
                            return (
                                <TableHead key={header.id}>
                                    {header.isPlaceholder
                                        ? null
                                        : flexRender(
                                            header.column.columnDef.header,
                                            header.getContext()
                                        )}
                                </TableHead>
                            );
                        })}
                    </TableRow>
                ))}
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, index) => (
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
                        <TableRow
                            key={row.id}
                            data-state={row.getIsSelected() && 'selected'}
                        >
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
                            className="h-[400px] text-center"
                        >
                            <Empty>
                                <EmptyMedia>
                                    <Ticket className="size-8 text-muted-foreground" />
                                </EmptyMedia>
                                <EmptyContent>
                                    <EmptyTitle>Không tìm thấy mã giảm giá</EmptyTitle>
                                    <EmptyDescription>
                                        Chưa có mã giảm giá nào được tạo hoặc không khớp với bộ lọc.
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
