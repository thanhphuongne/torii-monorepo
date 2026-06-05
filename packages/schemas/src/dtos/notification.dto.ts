import { z } from 'zod';
import { NotificationType } from '../models/notification.model';

export const notificationResponseDTOSchema = z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    title: z.string(),
    message: z.string(),
    notificationType: z.nativeEnum(NotificationType),
    metadata: z.any().optional(),
    isRead: z.boolean(),
    readAt: z.date().optional(),
    sentVia: z.array(z.string()),
    createdAt: z.date(),
});

export type NotificationResponseDTO = z.infer<typeof notificationResponseDTOSchema>;

export const notificationQueryDTOSchema = z.object({
    page: z.coerce.number().min(1).optional().default(1),
    limit: z.coerce.number().min(1).max(100).optional().default(10),
    isRead: z.coerce.boolean().optional(), // Use coerce to convert string "true"/"false" to boolean
});

export type NotificationQueryDTO = z.infer<typeof notificationQueryDTOSchema>;

export const notificationCreateDTOSchema = z.object({
    userId: z.string().uuid(),
    title: z.string().min(1),
    message: z.string().min(1),
    notificationType: z.nativeEnum(NotificationType),
    // Dedupe key để chống gửi trùng (idempotent) theo user.
    // VD: "LIVE_SESSION:STARTS_IN_30_MIN:<sessionId>"
    dedupeKey: z.string().min(1).max(160).optional(),
    metadata: z.any().optional(),
    sentVia: z.array(z.string()).optional(),
});

export type NotificationCreateDTO = z.infer<typeof notificationCreateDTOSchema>;

export const notificationMarkAsReadRequestDTOSchema = z.object({
    notificationId: z.string().uuid(),
    userId: z.string().uuid(),
});

export type NotificationMarkAsReadRequestDTO = z.infer<typeof notificationMarkAsReadRequestDTOSchema>;

export const notificationMarkAllAsReadRequestDTOSchema = z.object({
    userId: z.string().uuid(),
});

export type NotificationMarkAllAsReadRequestDTO = z.infer<typeof notificationMarkAllAsReadRequestDTOSchema>;

export const notificationDeleteRequestDTOSchema = z.object({
    notificationId: z.string().uuid(),
    userId: z.string().uuid(),
});

export type NotificationDeleteRequestDTO = z.infer<typeof notificationDeleteRequestDTOSchema>;

export const notificationUnreadCountResponseDTOSchema = z.object({
    count: z.number(),
});

export type NotificationUnreadCountResponseDTO = z.infer<typeof notificationUnreadCountResponseDTOSchema>;

