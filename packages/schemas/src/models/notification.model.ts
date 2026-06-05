import { z } from 'zod';

export enum NotificationType {
    SYSTEM = 'system',
    COURSE = 'course',
    LIVE_CLASS = 'live_class',
    PAYMENT = 'payment',
    ACHIEVEMENT = 'achievement',
    REMINDER = 'reminder',
    COMMENT_REPLY = 'comment_reply',
    COMMENT = 'comment',
    BLOG_ANALYTICS = 'blog_analytics',
    ORDER_SUCCESS = 'order_success',
    ORDER_STATUS_UPDATE = 'order_status_update',
}

export const notificationSchema = z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    title: z.string(),
    message: z.string(),
    notificationType: z.nativeEnum(NotificationType),
    data: z.any().optional(),
    isRead: z.boolean(),
    readAt: z.date().optional(),
    sentVia: z.array(z.string()),
    createdAt: z.date(),
});

export type Notification = z.infer<typeof notificationSchema>;
