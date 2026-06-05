'use client'

import { Empty, EmptyContent, EmptyDescription, EmptyMedia, EmptyTitle } from '@workspace/ui/components/empty';
import {
    BarChart2,
    Bell,
    BookOpen,
    Check,
    CheckCheck,
    CreditCard,
    MessageSquare,
    MessageSquareReply,
    Package,
    Settings2,
    Trophy,
    Video,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from '@workspace/ui/components/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { cn } from '@workspace/ui/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import Link from 'next/link'
import { Spinner } from '@workspace/ui/components/spinner'
import { Item, ItemContent, ItemMedia, ItemTitle, ItemDescription } from '@workspace/ui/components/item'
import { useNotifications, useUnreadNotificationsCount, useMarkNotificationAsRead, useMarkAllNotificationsAsRead } from '@/lib/api/services/notification-api'
import type { NotificationResponseDTO } from '@workspace/schemas'
import { NotificationType } from "@workspace/schemas";

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

interface UINotification {
    id: string;
    title: string;
    message: string;
    time: string;
    read: boolean;
    notificationType: NotificationType;
}

function mapNotificationToUI(notification: NotificationResponseDTO): UINotification {
    return {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        time: formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: vi }),
        read: notification.isRead,
        notificationType: notification.notificationType,
    };
}

export function NotificationsDropdown() {
    const { data: notificationsData, isLoading } = useNotifications({ limit: 10, page: 1 });
    const { data: unreadCountData } = useUnreadNotificationsCount();
    const markAsReadMutation = useMarkNotificationAsRead();
    const markAllAsReadMutation = useMarkAllNotificationsAsRead();

    const notifications = notificationsData?.data?.map(mapNotificationToUI) || [];
    const unreadCount = unreadCountData?.count || 0;

    const markAsRead = (id: string) => {
        markAsReadMutation.mutate(id);
    };

    const markAllAsRead = () => {
        markAllAsReadMutation.mutate();
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative hover:bg-muted/50 transition-colors"
                >
                    <Bell className="size-4" />
                    {unreadCount > 0 && (
                        <span className="absolute right-2.5 top-2.5 size-1.5 animate-pulse rounded-full bg-primary ring-2 ring-background" />
                    )}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align="end"
                className="w-[90vw] sm:w-[380px] p-0 rounded-xl overflow-hidden shadow-2xl border-border/60"
            >
                {/* Header */}
                <div className="border-b px-4 py-3.5 bg-background/50 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-bold tracking-normal">Thông báo</h3>
                            <p className="text-[10px] font-medium text-muted-foreground mt-0.5">
                                {unreadCount > 0 ? `Bạn có ${unreadCount} tin mới` : 'Bạn đã xem hết'}
                            </p>
                        </div>
                        {unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={markAllAsRead}
                                disabled={markAllAsReadMutation.isPending}
                                className="h-7 px-2 text-[10px] font-bold hover:bg-transparent hover:text-primary transition-colors"
                            >
                                <Check className="mr-1 size-3" strokeWidth={3} />
                                Đã đọc hết
                            </Button>
                        )}
                    </div>
                </div>

                {/* Notifications List */}
                <div className="custom-scrollbar max-h-[60vh] overflow-y-auto sm:max-h-[420px]">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center space-y-3 py-12">
                            <Spinner className="h-5 w-5 text-muted-foreground/30" />
                            <p className="text-[10px] font-bold text-muted-foreground/50 tracking-widest uppercase">Đang tải...</p>
                        </div>
                    ) : notifications.length > 0 ? (
                        <div className="divide-y divide-border/40">
                            {notifications.map((notification) => {
                                const Icon = notificationIcon(notification.notificationType);
                                return (
                                    <Item
                                        key={notification.id}
                                        variant={notification.read ? "default" : "muted"}
                                        className={cn(
                                            'cursor-pointer px-4 py-4 transition-all duration-300',
                                            !notification.read ? 'bg-muted/10' : 'hover:bg-muted/30',
                                            markAsReadMutation.isPending && 'cursor-wait opacity-50'
                                        )}
                                        onClick={() => !notification.read && markAsRead(notification.id)}
                                    >
                                        <ItemMedia>
                                            <div className={cn(
                                                'flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-background/80 shadow-sm',
                                                !notification.read ? 'text-foreground' : 'text-muted-foreground/60',
                                            )}>
                                                <Icon className="size-3.5 stroke-[1.75]" />
                                            </div>
                                        </ItemMedia>
                                        <ItemContent>
                                            <div className="flex items-start justify-between gap-2">
                                                <ItemTitle className={cn(
                                                    'text-[12px] leading-snug',
                                                    !notification.read ? 'font-bold text-foreground' : 'font-medium text-muted-foreground',
                                                )}>
                                                    {notification.title}
                                                </ItemTitle>
                                                {!notification.read && (
                                                    <div className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                                                )}
                                            </div>
                                            {notification.message && (
                                                <ItemDescription className="line-clamp-2 text-[11px] leading-relaxed mt-0.5 text-muted-foreground/80">
                                                    {notification.message}
                                                </ItemDescription>
                                            )}
                                            <div className="mt-1.5">
                                                <span className="text-[10px] font-bold text-muted-foreground/40 tabular-nums">
                                                    {notification.time}
                                                </span>
                                            </div>
                                        </ItemContent>
                                    </Item>
                                );
                            })}
                        </div>
                    ) : (
                        <Empty className="border-none py-12">
                            <EmptyMedia variant="icon" className="border border-border/10 bg-muted/20">
                                <Bell className="size-5 text-muted-foreground/20" />
                            </EmptyMedia>
                            <EmptyContent>
                                <EmptyTitle className="text-xs font-bold">Không có thông báo</EmptyTitle>
                                <EmptyDescription className="text-[10px]">Cập nhật mới sẽ hiển thị tại đây.</EmptyDescription>
                            </EmptyContent>
                        </Empty>
                    )}
                </div>

                {/* Footer */}
                <div className="p-2 border-t border-border/60 bg-muted/5">
                    <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="w-full text-[11px] font-bold hover:bg-primary/5 hover:text-primary transition-all"
                    >
                        <Link href="/dashboard/notifications">
                            Xem tất cả thông báo
                        </Link>
                    </Button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

