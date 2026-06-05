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
import { getReviewsColumns, type ReviewRow } from "./reviews-columns";
import { MessageSquareOff } from "lucide-react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { dataTableHeaderClass, dataTableShellClass } from "@/lib/ui-shell";

interface ReviewsTableProps {
  data: ReviewRow[];
  isLoading?: boolean;
  onViewDetail: (review: ReviewRow) => void;
  onRemove: (review: ReviewRow) => void;
  page?: number;
  limit?: number;
}

export function ReviewsTable({
  data,
  isLoading,
  onViewDetail,
  onRemove,
  page = 1,
  limit = 50,
}: ReviewsTableProps) {
  const columns = getReviewsColumns({
    onViewDetail,
    onRemove,
    page,
    limit,
  });

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
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
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
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
              <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length} className="h-[320px] text-center">
                <Empty>
                  <EmptyMedia>
                    <MessageSquareOff className="size-8 text-muted-foreground" />
                  </EmptyMedia>
                  <EmptyContent>
                    <EmptyTitle>Chưa có đánh giá nào</EmptyTitle>
                    <EmptyDescription>
                      Các đánh giá bạn gửi sau khi học khóa sẽ hiển thị tại đây.
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
