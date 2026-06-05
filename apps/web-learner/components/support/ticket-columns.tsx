"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import type { TicketResponseDTO } from "@workspace/schemas";
import { TicketStatus, TicketType } from "@workspace/schemas";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  XCircle,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { formatDate } from "@/utils/format-utils";

interface TicketColumnsProps {
  onView: (id: string) => void;
  page?: number;
  limit?: number;
}

const statusConfig: Record<
  TicketStatus,
  { label: string; icon: LucideIcon; className: string }
> = {
  [TicketStatus.PENDING]: {
    label: "Đang chờ",
    icon: AlertCircle,
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  [TicketStatus.PROCESSING]: {
    label: "Đang xử lý",
    icon: Clock,
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  [TicketStatus.RESOLVED]: {
    label: "Đã giải quyết",
    icon: CheckCircle2,
    className: "bg-green-500/10 text-green-700 border-green-500/20",
  },
  [TicketStatus.CANCELLED]: {
    label: "Đã hủy",
    icon: XCircle,
    className: "bg-zinc-500/10 text-zinc-600 border-zinc-500/20",
  },
};

const typeLabelMap: Record<TicketType, string> = {
  [TicketType.REFUND]: "Hoàn tiền",
  [TicketType.SUPPORT]: "Hỗ trợ",
  [TicketType.ERROR_REPORT]: "Báo lỗi",
};

export const getTicketColumns = ({
  onView,
  page = 1,
  limit = 10,
}: TicketColumnsProps): ColumnDef<TicketResponseDTO>[] => [
  {
    id: "stt",
    header: () => <div className="text-center">#</div>,
    cell: ({ row }) => {
      const stt = (page - 1) * limit + row.index + 1;
      return (
        <div className="text-center font-medium text-muted-foreground/60 tabular-nums text-xs">
          {stt}
        </div>
      );
    },
    size: 50,
  },
  {
    accessorKey: "id",
    header: "Mã yêu cầu",
    cell: ({ row }) => (
      <span className="font-mono text-[10px] uppercase text-muted-foreground">
        #{row.original.id.slice(0, 8)}
      </span>
    ),
  },
  {
    accessorKey: "type",
    header: "Phân loại",
    cell: ({ row }) => {
      const type = row.original.type as TicketType;
      return (
        <Badge variant="secondary" className="px-2 py-0">
          {typeLabelMap[type] || type}
        </Badge>
      );
    },
  },
  {
    accessorKey: "subject",
    header: "Tiêu đề",
    cell: ({ row }) => (
      <span className="font-medium max-w-[200px] truncate block">
        {row.original.subject}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Trạng thái",
    cell: ({ row }) => {
      const status = row.original.status as TicketStatus;
      const config =
        statusConfig[status] || statusConfig[TicketStatus.PENDING];
      const Icon = config.icon;
      return (
        <Badge
          variant="outline"
          className={cn("gap-1.5 px-2 py-0.5 font-semibold", config.className)}
        >
          <Icon className="w-3 h-3 shrink-0" />
          <span>{config.label}</span>
        </Badge>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Ngày tạo",
    cell: ({ row }) => (
      <span className="text-[11px] font-medium">
        {formatDate(row.original.createdAt)}
      </span>
    ),
  },
  {
    id: "actions",
    header: () => <div className="text-right">Thao tác</div>,
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => onView(row.original.id)}
        >
          <Eye className="h-4 w-4" />
          Xem
        </Button>
      </div>
    ),
    size: 120,
  },
];
