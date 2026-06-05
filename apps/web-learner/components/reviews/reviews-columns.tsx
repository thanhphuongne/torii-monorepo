"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Star, Eye, Trash2 } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import type { ClassReview } from "@/lib/api/services/academy-class-reviews";

export type ReviewRow = ClassReview & { courseTitle?: string };

const CONTENT_PREVIEW_MAX = 72;

function truncateText(text: string, max: number) {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trimEnd()}…`;
}

interface ReviewsColumnsProps {
  onViewDetail: (review: ReviewRow) => void;
  onRemove: (review: ReviewRow) => void;
  page?: number;
  limit?: number;
}

export const getReviewsColumns = ({
  onViewDetail,
  onRemove,
  page = 1,
  limit = 50,
}: ReviewsColumnsProps): ColumnDef<ReviewRow>[] => [
  {
    id: "stt",
    header: () => <div className="text-center">#</div>,
    cell: ({ row }) => (
      <div className="text-center font-medium text-muted-foreground/60 tabular-nums text-xs">
        {(page - 1) * limit + row.index + 1}
      </div>
    ),
    size: 48,
  },
  {
    id: "course",
    header: "Khóa học",
    cell: ({ row }) => {
      const r = row.original;
      const title = r.courseTitle || r.class?.courseProfile?.title || "—";
      return (
        <div className="flex flex-col gap-1.5 min-w-0 max-w-[240px]">
          <span className="font-medium text-sm text-foreground truncate" title={title}>
            {title}
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {r.liveClassId ? (
              <Badge variant="outline" className="text-[10px] font-semibold px-1.5 py-0">
                Trực tiếp
              </Badge>
            ) : r.vodPackageId ? (
              <Badge variant="outline" className="text-[10px] font-semibold px-1.5 py-0">
                Tự học
              </Badge>
            ) : null}
            {r.class?.name && r.class.name !== title ? (
              <span className="text-[10px] text-muted-foreground truncate">{r.class.name}</span>
            ) : null}
          </div>
        </div>
      );
    },
  },
  {
    id: "rating",
    header: () => <div className="text-center">Đánh giá</div>,
    cell: ({ row }) => (
      <div className="flex justify-center">
        <div className="flex items-center gap-0.5" aria-label={`${row.original.rating} trên 5 sao`}>
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={cn(
                "h-3.5 w-3.5",
                i < row.original.rating ? "fill-amber-400 text-amber-500" : "fill-muted text-muted-foreground/40",
              )}
            />
          ))}
        </div>
      </div>
    ),
    size: 120,
  },
  {
    id: "content",
    header: "Nội dung",
    cell: ({ row }) => {
      const c = row.original.content?.trim() || "";
      if (!c) return <span className="text-muted-foreground text-sm">—</span>;
      return (
        <div className="w-[320px] min-w-[320px] max-w-[320px] whitespace-normal break-words">
          <p className="text-sm text-muted-foreground leading-snug" title={c}>
            {c}
          </p>
        </div>
      );
    },
    size: 320,
  },
  {
    id: "createdAt",
    header: "Ngày gửi",
    cell: ({ row }) => (
      <span className="text-[11px] tabular-nums text-muted-foreground whitespace-nowrap">
        {format(new Date(row.original.createdAt), "dd/MM/yyyy HH:mm", { locale: vi })}
      </span>
    ),
    size: 130,
  },
  {
    id: "actions",
    header: () => <div className="text-right">Thao tác</div>,
    cell: ({ row }) => {
      const r = row.original;
      return (
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => onViewDetail(r)}
          >
            <Eye className="h-4 w-4" />
            Xem
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/5"
            onClick={() => onRemove(r)}
          >
            <Trash2 className="h-4 w-4" />
            Gỡ đánh giá
          </Button>
        </div>
      );
    },
    size: 180,
  },
];
