"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Star, ExternalLink, Trash2 } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import type { ReviewRow } from "./reviews-columns";

interface ReviewDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  review: ReviewRow | null;
  /** Mở flow xác nhận gỡ đánh giá (giống nút trên bảng) */
  onRequestRemove?: (review: ReviewRow) => void;
}

export function ReviewDetailDialog({ open, onOpenChange, review, onRequestRemove }: ReviewDetailDialogProps) {
  if (!review) return null;

  const courseTitle =
    review.courseTitle || review.class?.courseProfile?.title || "Khóa học";
  const courseHref =
    review.vodPackageId || review.class?.id
      ? `/courses/${review.vodPackageId || review.class?.id}/learn`
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg" showCloseButton>
        <DialogHeader className="space-y-3 border-b border-border/60 p-4 pr-12 text-left">
          <div className="flex items-start gap-3">
            <Avatar className="size-11 shrink-0 ring-2 ring-border">
              <AvatarImage src={review.user.avatarUrl || undefined} alt={review.user.displayName} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {review.user.displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-1">
              <DialogTitle className="text-left text-base leading-snug">{courseTitle}</DialogTitle>
              <DialogDescription asChild>
                <div className="flex flex-wrap items-center gap-2 text-left">
                  <span className="text-foreground font-medium">{review.user.displayName}</span>
                  <span className="text-muted-foreground">·</span>
                  <time className="text-[11px] tabular-nums text-muted-foreground">
                    {format(new Date(review.createdAt), "dd/MM/yyyy HH:mm", { locale: vi })}
                  </time>
                </div>
              </DialogDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <div className="flex items-center gap-0.5" aria-hidden>
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "h-4 w-4",
                    i < review.rating ? "fill-amber-400 text-amber-500" : "fill-muted text-muted-foreground/35",
                  )}
                />
              ))}
            </div>
            {review.liveClassId ? (
              <Badge variant="outline" className="text-[10px] font-semibold">
                Học trực tiếp
              </Badge>
            ) : review.vodPackageId ? (
              <Badge variant="outline" className="text-[10px] font-semibold">
                Tự học
              </Badge>
            ) : null}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[min(55vh,360px)] px-4 py-3">
          {review.title ? (
            <p className="text-sm font-semibold text-foreground mb-2">{review.title}</p>
          ) : null}
          <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground leading-relaxed">
            {review.content?.trim() || "—"}
          </p>
        </ScrollArea>

        <div className="flex justify-end gap-2 border-t border-border/60 bg-muted/20 p-4">
          <Button type="button" variant="secondary" className="h-9 px-8 rounded-xl font-bold" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
