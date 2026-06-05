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
import type { BlogResponseDTO } from '@workspace/schemas';
import { getBlogColumns } from './blog-columns.tsx';
import { dataTableHeaderClass } from '@/lib/ui-shell';
import { Newspaper } from 'lucide-react';
import { Skeleton } from '@workspace/ui/components/skeleton';
import { Empty, EmptyContent, EmptyMedia, EmptyTitle, EmptyDescription } from '@workspace/ui/components/empty';

interface BlogTableProps {
    data: BlogResponseDTO[];
    onEdit: (blog: BlogResponseDTO) => void;
    onDelete: (blog: BlogResponseDTO) => void;
    onScheduleChange: (blog: BlogResponseDTO) => void;
    page: number;
    limit: number;
    isLoading?: boolean;
}

export function BlogTable({ data, onEdit, onDelete, onScheduleChange, page, limit, isLoading }: BlogTableProps) {
    const [sorting, setSorting] = useState<SortingState>([]);

    const columns = getBlogColumns({ onEdit, onDelete, onScheduleChange, page, limit });

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
                    <TableRow>
                        <TableCell
                            colSpan={columns.length}
                            className="h-[400px] text-center"
                        >
                            <Empty>
                                <EmptyMedia>
                                    <Newspaper className="size-8 text-muted-foreground" />
                                </EmptyMedia>
                                <EmptyContent>
                                    <EmptyTitle>Không tìm thấy bài viết</EmptyTitle>
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
