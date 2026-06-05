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
import { useState } from 'react';
import type { UserResponseDTO } from '@workspace/schemas';
import { getUsersColumns } from './users-columns.tsx';
import { Fingerprint } from 'lucide-react';
import { Empty, EmptyContent, EmptyMedia, EmptyTitle, EmptyDescription } from '@workspace/ui/components/empty';

import { Skeleton } from '@workspace/ui/components/skeleton';
import { dataTableHeaderClass } from '@/lib/ui-shell';


interface UsersTableProps {
    data: UserResponseDTO[];
    onView: (user: UserResponseDTO) => void;
    onEdit?: (user: UserResponseDTO) => void;
    onChangeStatus: (user: UserResponseDTO) => void;
    page: number;
    limit: number;
    isLoading?: boolean;
}

export function UsersTable({ data, onView, onEdit, onChangeStatus, page, limit, isLoading }: UsersTableProps) {
    const [sorting, setSorting] = useState<SortingState>([]);

    const columns = getUsersColumns({ onView, onEdit, onChangeStatus, page, limit });

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
                                    <Fingerprint className="size-8 text-muted-foreground" />
                                </EmptyMedia>
                                <EmptyContent>
                                    <EmptyTitle>Không tìm thấy dữ liệu</EmptyTitle>
                                    <EmptyDescription>
                                        Thử thay đổi điều kiện lọc hoặc từ khóa tìm kiếm.
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
