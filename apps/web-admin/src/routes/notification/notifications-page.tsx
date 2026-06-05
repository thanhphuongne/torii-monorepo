import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BarChart2,
  Bell,
  BookOpen,
  CheckCheck,
  CreditCard,
  MessageSquare,
  MessageSquareReply,
  Package,
  Settings2,
  Trophy,
  Video,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { cn } from "@workspace/ui/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@workspace/ui/components/pagination";
import {
  useNotifications,
  useUnreadNotificationsCount,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
} from "@/lib/api/services/notifications.ts";
import type { NotificationResponseDTO } from "@workspace/schemas";
import { NotificationType } from "@workspace/schemas";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  date: string;
  read: boolean;
  notificationType: NotificationType;
}

/** Giới hạn ký tự hiển thị trong danh sách (bấm vào để xem đủ trong dialog) */
const LIST_TITLE_MAX_CHARS = 72;
const LIST_MESSAGE_MAX_CHARS = 140;

function truncatePreview(text: string, maxChars: number): string {
  const t = text.trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, maxChars).trimEnd()}…`;
}

function notificationIcon(type: NotificationType): LucideIcon {
  switch (type) {
    case NotificationType.SYSTEM:
      return Settings2;
    case NotificationType.COURSE:
      return BookOpen;
    case NotificationType.LIVE_CLASS:
      return Video;
    case NotificationType.PAYMENT:
      return CreditCard;
    case NotificationType.ACHIEVEMENT:
      return Trophy;
    case NotificationType.REMINDER:
      return Bell;
    case NotificationType.COMMENT_REPLY:
      return MessageSquareReply;
    case NotificationType.COMMENT:
      return MessageSquare;
    case NotificationType.BLOG_ANALYTICS:
      return BarChart2;
    case NotificationType.ORDER_SUCCESS:
      return CheckCheck;
    case NotificationType.ORDER_STATUS_UPDATE:
      return Package;
    default:
      return Bell;
  }
}

function mapNotificationToUI(notification: NotificationResponseDTO): NotificationItem {
  const createdAt = new Date(notification.createdAt);
  return {
    id: notification.id,
    title: notification.title,
    message: notification.message,
    time: formatDistanceToNow(createdAt, { addSuffix: true, locale: vi }),
    date: format(createdAt, "dd/MM/yyyy"),
    read: notification.isRead,
    notificationType: notification.notificationType,
  };
}

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<NotificationItem | null>(null);

  const { data: notificationsData, isLoading } = useNotifications({
    limit: 50,
    page,
  });
  const { data: unreadCountData } = useUnreadNotificationsCount();
  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();

  const notifications = useMemo(() => {
    if (!notificationsData?.data) return [];
    return notificationsData.data.map(mapNotificationToUI);
  }, [notificationsData]);

  const unreadCount = unreadCountData?.count ?? 0;

  const openNotificationDetail = (n: NotificationItem) => {
    setDetailItem(n);
    setDetailOpen(true);
    if (!n.read) {
      markAsReadMutation.mutate(n.id);
    }
  };

  const totalPages = notificationsData?.totalPages ?? 1;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-12">
      <header className="mb-6 border-b border-border/80 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-medium tracking-tight text-foreground">Thông báo</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} chưa đọc` : "Không có thông báo chưa đọc"}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending || unreadCount === 0}
            className="h-8 shrink-0 px-2 text-xs font-normal text-muted-foreground hover:text-foreground"
          >
            {markAllAsReadMutation.isPending ? "Đang xử lý…" : "Đánh dấu tất cả đã đọc"}
          </Button>
        </div>
      </header>

      {isLoading ? (
        <p className="py-12 text-center text-xs text-muted-foreground">Đang tải…</p>
      ) : notifications.length > 0 ? (
        <ul className="divide-y divide-border/60">
          {notifications.map((n) => {
            const Icon = notificationIcon(n.notificationType);
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => openNotificationDetail(n)}
                  className={cn(
                    "flex w-full gap-3 py-3 text-left transition-colors",
                    "hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    !n.read && "bg-muted/20",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-border/50 bg-background/80",
                      !n.read ? "text-foreground/80" : "text-muted-foreground/70",
                    )}
                    aria-hidden
                  >
                    <Icon className="size-3.5 stroke-[1.75]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={cn(
                          "text-sm leading-snug",
                          !n.read ? "font-medium text-foreground" : "font-normal text-muted-foreground",
                        )}
                      >
                        {truncatePreview(n.title, LIST_TITLE_MAX_CHARS)}
                      </span>
                      {!n.read ? (
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-label="Chưa đọc" />
                      ) : null}
                    </div>
                    {n.message ? (
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {truncatePreview(n.message, LIST_MESSAGE_MAX_CHARS)}
                      </p>
                    ) : null}
                    <p className="mt-1.5 text-[11px] tabular-nums text-muted-foreground/80">
                      {n.date} · {n.time}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="py-14 text-center text-xs text-muted-foreground">Chưa có thông báo.</p>
      )}

      {notificationsData && totalPages > 1 ? (
        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-4 sm:flex-row">
          <p className="text-[11px] text-muted-foreground">
            Trang <span className="text-foreground">{page}</span> / {totalPages}
          </p>
          <Pagination className="mx-0 w-auto">
            <PaginationContent className="gap-0.5">
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={cn(
                    "h-8 cursor-pointer px-2.5 text-xs",
                    page === 1 ? "pointer-events-none opacity-40" : "",
                  )}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className={cn(
                    "h-8 cursor-pointer px-2.5 text-xs",
                    page === totalPages ? "pointer-events-none opacity-40" : "",
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      ) : null}

      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setDetailItem(null);
        }}
      >
        <DialogContent className="gap-0 p-0 sm:max-w-lg" showCloseButton>
          {detailItem ? (
            <>
              <DialogHeader className="space-y-3 border-b border-border/60 p-4 pr-12 text-left">
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md border border-border/50 bg-muted/30",
                      !detailItem.read ? "text-foreground/80" : "text-muted-foreground/70",
                    )}
                    aria-hidden
                  >
                    {(() => {
                      const Icon = notificationIcon(detailItem.notificationType);
                      return <Icon className="size-4 stroke-[1.75]" />;
                    })()}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <DialogTitle className="text-left text-base leading-snug">
                      {detailItem.title}
                    </DialogTitle>
                    <p className="text-[11px] tabular-nums text-muted-foreground">
                      {detailItem.date} · {detailItem.time}
                    </p>
                  </div>
                </div>
              </DialogHeader>
              {detailItem.message ? (
                <ScrollArea className="max-h-[min(50vh,320px)] px-4 py-3">
                  <DialogDescription asChild>
                    <div className="whitespace-pre-wrap break-words text-sm text-foreground">
                      {detailItem.message}
                    </div>
                  </DialogDescription>
                </ScrollArea>
              ) : (
                <div className="px-4 py-3">
                  <DialogDescription>Không có nội dung chi tiết.</DialogDescription>
                </div>
              )}
              <div className="flex justify-end border-t border-border/60 bg-muted/20 p-4">
                <Button type="button" variant="secondary" onClick={() => setDetailOpen(false)}>
                  Đóng
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
