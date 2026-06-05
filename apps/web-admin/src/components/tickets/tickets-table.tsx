'use client';

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
import { Skeleton } from '@workspace/ui/components/skeleton';
import { Empty, EmptyContent, EmptyMedia, EmptyTitle, EmptyDescription } from '@workspace/ui/components/empty';
import { Search } from 'lucide-react';
import { getTicketsColumns } from './tickets-columns';
import { dataTableHeaderClass } from '@/lib/ui-shell';
import type { TicketResponseDTO } from '@workspace/schemas';

interface TicketsTableProps {
    data: TicketResponseDTO[];
    isLoading: boolean;
    onView: (ticket: TicketResponseDTO) => void;
    onChangeStatus: (ticket: TicketResponseDTO) => void;
    page: number;
    limit: number;
}

export function TicketsTable({ data, isLoading, onView, onChangeStatus, page, limit }: TicketsTableProps) {

    const columns = getTicketsColumns({
        onView,
        onChangeStatus,
        page,
        limit
    });

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
    });

    return (
        <Table>
            <TableHeader className={dataTableHeaderClass}>
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
                    Array.from({ length: limit }).map((_, index) => (
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
                                    <Search className="size-8 text-muted-foreground" />
                                </EmptyMedia>
                                <EmptyContent>
                                    <EmptyTitle>Không tìm thấy yêu cầu nào.</EmptyTitle>
                                    <EmptyDescription>
                                        Không có yêu cầu hỗ trợ nào khớp với tiêu chí tìm kiếm của bạn.
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
