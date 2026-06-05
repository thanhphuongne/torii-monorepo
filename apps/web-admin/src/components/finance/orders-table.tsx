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
import { Empty, EmptyContent, EmptyMedia, EmptyTitle, EmptyDescription } from '@workspace/ui/components/empty';
import { CreditCard } from 'lucide-react';
import { Spinner } from '@workspace/ui/components/spinner';
import type { OrderResponseDTO } from '@workspace/schemas';
import { getOrdersColumns } from './orders-columns';
import { dataTableHeaderClass } from '@/lib/ui-shell';

interface OrdersTableProps {
    data: OrderResponseDTO[];
    isLoading: boolean;
    onView: (order: OrderResponseDTO) => void;
    onCancel: (order: OrderResponseDTO) => void;
    onExport: (order: OrderResponseDTO) => void;
    page: number;
    limit: number;
}

export function OrdersTable({ data, isLoading, onView, onCancel, onExport, page, limit }: OrdersTableProps) {
    const columns = getOrdersColumns({ onView, onCancel, onExport, page, limit });

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <Table>
            <TableHeader className={dataTableHeaderClass}>
                {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                            <TableHead key={header.id} className={(header.column.columnDef.meta as any)?.className}>
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
                    <TableRow>
                        <TableCell colSpan={columns.length} className="h-[400px] text-center">
                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                <Spinner className="size-6" />
                                <p className="text-sm">Đang tải dữ liệu...</p>
                            </div>
                        </TableCell>
                    </TableRow>
                ) : data.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={columns.length} className="h-[400px] text-center">
                            <Empty>
                                <EmptyMedia>
                                    <CreditCard className="size-8 text-muted-foreground" />
                                </EmptyMedia>
                                <EmptyContent>
                                    <EmptyTitle>Không tìm thấy giao dịch</EmptyTitle>
                                    <EmptyDescription>
                                        Chưa có dữ liệu giao dịch nào được ghi nhận.
                                    </EmptyDescription>
                                </EmptyContent>
                            </Empty>
                        </TableCell>
                    </TableRow>
                ) : (
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
                )}
            </TableBody>
        </Table>
    );
}
