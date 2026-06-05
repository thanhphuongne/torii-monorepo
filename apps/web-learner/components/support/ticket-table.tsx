"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import type { TicketResponseDTO } from "@workspace/schemas";
import { getTicketColumns } from "./ticket-columns";
import { Search } from "lucide-react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { dataTableHeaderClass, dataTableShellClass } from "@/lib/ui-shell";

interface TicketTableProps {
  data: TicketResponseDTO[];
  onView: (id: string) => void;
  isLoading?: boolean;
  page?: number;
  limit?: number;
}

export function TicketTable({
  data,
  onView,
  isLoading,
  page = 1,
  limit = 10,
}: TicketTableProps) {
  const columns = getTicketColumns({ onView, page, limit });

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  return (
    <div className={dataTableShellClass}>
      <Table>
        <TableHeader className={dataTableHeaderClass}>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
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
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext(),
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
                    <EmptyTitle>Bạn chưa có yêu cầu nào</EmptyTitle>
                    <EmptyDescription>
                      Thông tin các yêu cầu hỗ trợ hoặc hoàn tiền của bạn sẽ hiển
                      thị tại đây.
                    </EmptyDescription>
                  </EmptyContent>
                </Empty>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
