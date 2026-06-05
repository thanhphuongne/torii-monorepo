import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  Inject,
  OnModuleInit,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import { AppConfigService, PrismaService } from '@server/shared';
import { Notification } from '@prisma/generated';
import { Prisma } from '@prisma/generated';
import {
  NotificationResponseDTO,
  NotificationQueryDTO,
  NotificationCreateDTO,
  NotificationUnreadCountResponseDTO,
  PaginatedResponseDTO,
} from '@workspace/schemas';
import type { INotificationService } from '@server/identity/interfaces/services';
import type { INotificationRepository } from '@server/identity/interfaces/repositories';
import { NOTIFICATION_REPOSITORY_TOKEN } from '@server/identity/interfaces/repositories';

@Injectable()
export class NotificationService implements INotificationService, OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);
  private firebaseApp: admin.app.App | null = null;

  constructor(
    @Inject(NOTIFICATION_REPOSITORY_TOKEN)
    private readonly notificationRepository: INotificationRepository,
    private readonly prisma: PrismaService, // Still needed for cross-service queries (blog, user)
    private readonly appConfig: AppConfigService,
  ) {}

  /**
   * Initialize Firebase Admin SDK
   */
  onModuleInit() {
    try {
      const serviceAccountPath = this.appConfig.firebase.serviceAccountKey;

      if (!serviceAccountPath) {
        this.logger.warn(
          'Firebase service account key path not provided. Push notifications will be disabled.',
        );
        return;
      }

      // Check if file exists with fallback locations (to ensure it works on Linux/VPS/Docker)
      let fullPath = serviceAccountPath;

      if (!path.isAbsolute(serviceAccountPath)) {
        const fallbacks = [
          // 1. Primary: Relative to project root (process.cwd())
          path.resolve(process.cwd(), serviceAccountPath),
          // 2. Relative to dist root in monorepo where Nest CLI might place things during deployment
          path.join(process.cwd(), 'dist', serviceAccountPath),
          // 3. Relative to current file (helpful in local dev)
          path.join(__dirname, '../../../../', serviceAccountPath),
          // 4. Relative to identity service root in source
          path.join(
            process.cwd(),
            'apps/server/services/identity',
            serviceAccountPath,
          ),
          // 5. Absolute path fallback for containerized environments
          path.join('/app', serviceAccountPath),
        ];

        for (const fallback of fallbacks) {
          if (fs.existsSync(fallback)) {
            this.logger.debug(
              `Found Firebase service account key at: ${fallback}`,
            );
            fullPath = fallback;
            break;
          }
        }
      }

      if (!fs.existsSync(fullPath)) {
        this.logger.warn(
          `Firebase service account key not found at ${fullPath}. Push notifications will be disabled.`,
        );
        return;
      }

      const serviceAccount = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      this.logger.log('Firebase Admin SDK initialized successfully');
    } catch (error: any) {
      this.logger.error('Failed to initialize Firebase Admin SDK', error);
    }
  }

  /**
   * Map Notification entity to NotificationResponseDto
   */
  private toNotificationResponseDto(
    notification: Notification,
  ): NotificationResponseDTO {
    return {
      id: notification.id,
      userId: notification.userId,
      title: notification.title,
      message: notification.message,
      notificationType: notification.notificationType as any,
      metadata: notification.metadata || undefined,
      isRead: notification.isRead,
      readAt: notification.readAt || undefined,
      sentVia: notification.sentVia || [],
      createdAt: notification.createdAt,
    };
  }

  /**
   * Get all notifications for a user with pagination and filtering
   */
  async findAll(
    userId: string,
    query: NotificationQueryDTO,
  ): Promise<PaginatedResponseDTO<NotificationResponseDTO>> {
    try {
      const { page = 1, limit = 10, isRead } = query;
      const pageNum =
        typeof page === 'string' ? parseInt(page, 10) : Number(page) || 1;
      const limitNum =
        typeof limit === 'string' ? parseInt(limit, 10) : Number(limit) || 10;
      const validPage = pageNum > 0 ? pageNum : 1;
      const validLimit = limitNum > 0 ? limitNum : 10;
      const skip = (validPage - 1) * validLimit;

      const whereClause: Record<string, any> = {
        userId,
      };

      // Filter by read status if provided
      // Convert string to boolean if needed (query params come as strings)
      if (isRead !== undefined) {
        // Handle string values from query params
        if (typeof isRead === 'string') {
          whereClause.isRead = isRead === 'true' || isRead === '1';
        } else {
          whereClause.isRead = Boolean(isRead);
        }
      }

      const [total, notifications] = await Promise.all([
        this.notificationRepository.count(whereClause),
        this.notificationRepository.findMany({
          skip,
          take: validLimit,
          where: whereClause,
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      const totalPages = Math.ceil(total / validLimit);

      return {
        data: notifications.map((n) => this.toNotificationResponseDto(n)),
        total,
        page: validPage,
        limit: validLimit,
        totalPages,
      };
    } catch (error: any) {
      this.logger.error('Failed to retrieve notifications', error);
      throw new BadRequestException(
        `Failed to retrieve notifications: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(
    notificationId: string,
    userId: string,
  ): Promise<NotificationResponseDTO> {
    try {
      // Verify notification exists and belongs to user
      const existing = await this.notificationRepository.findByIdAndUserId(
        notificationId,
        userId,
      );

      if (!existing) {
        throw new NotFoundException(
          `Notification with id ${notificationId} not found`,
        );
      }

      // Update notification
      const notification = await this.notificationRepository.update(
        notificationId,
        {
          isRead: true,
          readAt: new Date(),
        },
      );

      return this.toNotificationResponseDto(notification);
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error marking notification as read', error);
      throw new BadRequestException(
        `Failed to mark notification as read: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(
    userId: string,
  ): Promise<{ success: boolean; message: string; count: number }> {
    try {
      const result = await this.notificationRepository.updateMany(
        {
          userId,
          isRead: false,
        },
        {
          isRead: true,
          readAt: new Date(),
        },
      );

      return {
        success: true,
        message: `${result.count} notification(s) marked as read`,
        count: result.count,
      };
    } catch (error: any) {
      this.logger.error('Error marking all notifications as read', error);
      throw new BadRequestException(
        `Failed to mark all notifications as read: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(
    userId: string,
  ): Promise<NotificationUnreadCountResponseDTO> {
    try {
      const count = await this.notificationRepository.count({
        userId,
        isRead: false,
      });

      return {
        count,
      };
    } catch (error: any) {
      this.logger.error('Error getting unread count', error);
      throw new BadRequestException(
        `Failed to get unread count: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Delete a notification
   */
  async delete(
    notificationId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Verify notification exists and belongs to user
      const existing = await this.notificationRepository.findByIdAndUserId(
        notificationId,
        userId,
      );

      if (!existing) {
        throw new NotFoundException(
          `Notification with id ${notificationId} not found`,
        );
      }

      // Hard delete the notification
      await this.notificationRepository.delete(notificationId);

      return {
        success: true,
        message: 'Notification deleted successfully',
      };
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error deleting notification', error);
      throw new BadRequestException(
        `Failed to delete notification: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Create a notification (for event-driven use cases)
   */
  async create(data: NotificationCreateDTO): Promise<NotificationResponseDTO> {
    try {
      let notification: Notification;
      try {
        notification = await this.notificationRepository.create({
          userId: data.userId,
          title: data.title,
          message: data.message,
          notificationType: data.notificationType,
          dedupeKey: (data as any).dedupeKey ?? null,
          metadata: data.metadata || null,
          sentVia: data.sentVia || ['in_app'],
          isRead: false,
        } as any);
      } catch (err: any) {
        // Idempotency: if (userId, dedupeKey) already exists, return existing and skip push.
        if (
          (data as any).dedupeKey &&
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          const existing = await this.prisma.notification.findFirst({
            where: {
              userId: data.userId,
              dedupeKey: (data as any).dedupeKey,
            } as any,
          });
          if (existing) {
            return this.toNotificationResponseDto(existing);
          }
        }
        throw err;
      }

      // If push is requested, send via FCM
      if (
        data.sentVia?.includes('push') ||
        (!data.sentVia && notification.sentVia.includes('in_app'))
      ) {
        // For now, let's just try to send push if device tokens exist for the user
        await this.sendPushNotification(notification);
      }

      return this.toNotificationResponseDto(notification);
    } catch (error: any) {
      this.logger.error('Error creating notification', error);
      throw new BadRequestException(
        `Failed to create notification: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Handle course published event - create notifications for interested learners
   */
  async handleCoursePublished(payload: {
    courseProfileId: string;
    courseTitle: string;
    courseJlptLevel: string;
    userIds?: string[]; // Optional: specific user IDs to notify
  }): Promise<void> {
    try {
      this.logger.log(
        `Handling course published event for course profile: ${payload.courseProfileId}`,
      );

      let userIdsToNotify: string[] = [];

      // If specific user IDs provided, use them (preferred method)
      if (payload.userIds && payload.userIds.length > 0) {
        userIdsToNotify = payload.userIds;
        this.logger.log(
          `Using provided user IDs: ${userIdsToNotify.length} users`,
        );
      } else {
        // No user IDs provided; wishlist fallback removed
        userIdsToNotify = [];
      }

      if (userIdsToNotify.length === 0) {
        this.logger.log('No users to notify for this course');
        return;
      }

      // Create notifications for all interested users
      const notifications = userIdsToNotify.map((userId) => ({
        userId,
        title: 'Khóa học mới đã được phát hành',
        message: `Khóa học "${payload.courseTitle}" đã được phát hành và sẵn sàng để bạn học tập!`,
        notificationType: 'course' as const,
        metadata: {
          courseProfileId: payload.courseProfileId,
          courseTitle: payload.courseTitle,
          courseJlptLevel: payload.courseJlptLevel,
        },
        sentVia: ['in_app'],
        isRead: false,
      }));

      // Bulk create notifications
      await this.notificationRepository.createMany(notifications);

      this.logger.log(
        `Successfully created ${notifications.length} notifications for course profile: ${payload.courseProfileId}`,
      );
    } catch (error: any) {
      this.logger.error('Error handling course published event:', error);
      // Don't throw - event-driven should be fire-and-forget
    }
  }

  /**
   * Handle unified send_notification event
   * Pattern: send_notification
   * Supports: COMMENT_REPLY, DAILY_SUMMARY
   */
  async handleSendNotification(payload: {
    recipientId: string;
    type: 'COMMENT_REPLY' | 'DAILY_SUMMARY';
    payload: {
      title: string;
      body: string;
      metadata: Record<string, any>;
    };
  }): Promise<void> {
    try {
      this.logger.log(
        `Handling send_notification event: type=${payload.type}, recipientId=${payload.recipientId}`,
      );

      // Map notification type to database type
      const notificationType =
        payload.type === 'COMMENT_REPLY' ? 'comment' : 'blog_analytics';

      // Create notification
      await this.notificationRepository.create({
        userId: payload.recipientId,
        title: payload.payload.title,
        message: payload.payload.body,
        notificationType,
        metadata: payload.payload.metadata,
        sentVia: ['in_app'],
        isRead: false,
      });

      this.logger.log(
        `Successfully created notification: type=${payload.type}, recipientId=${payload.recipientId}`,
      );
    } catch (error: any) {
      this.logger.error('Error handling send_notification event:', error);
      // Don't throw - event-driven should be fire-and-forget
    }
  }

  /**
   * Handle comment reply event - create notification for the person being replied to
   * @deprecated Use handleSendNotification instead
   *
   * Business Rules: Send notification if recipient ≠ reply author and recipient ≠ blog author
   * Skip if: replying to self or replying to staff
   */
  async handleCommentReply(payload: {
    commentId: string;
    blogId: string;
    parentCommentId: string;
    repliedToUserId: string;
    replyAuthorId: string;
    content: string;
  }): Promise<void> {
    try {
      this.logger.log(
        `Handling comment reply event for comment: ${payload.commentId}`,
      );

      // Double-check business rules (defense in depth)
      const isReplyingSelf = payload.repliedToUserId === payload.replyAuthorId;
      if (isReplyingSelf) {
        this.logger.log(
          `Skipping notification: User ${payload.replyAuthorId} is replying to their own comment`,
        );
        return;
      }

      // Get blog info to check if replied user is staff
      const blog = await this.prisma.blog.findUnique({
        where: { id: payload.blogId },
        select: {
          title: true,
          authorId: true,
        },
      });

      if (!blog) {
        this.logger.warn(
          `Blog ${payload.blogId} not found, skipping notification`,
        );
        return;
      }

      // Check if replied user is the blog owner (staff)
      const isReplyingStaff = payload.repliedToUserId === blog.authorId;
      if (isReplyingStaff) {
        this.logger.log(
          `Skipping notification: User ${payload.repliedToUserId} is the blog owner (staff) - will receive summary notification instead`,
        );
        return;
      }

      // Get reply author info for notification message
      const replyAuthor = await this.prisma.user.findUnique({
        where: { id: payload.replyAuthorId },
        select: {
          displayName: true,
          email: true,
        },
      });

      const authorName =
        replyAuthor?.displayName || replyAuthor?.email || 'Someone';
      const blogTitle = blog.title || 'bài viết';

      // Create notification for the person being replied to (user, not staff)
      await this.notificationRepository.create({
        userId: payload.repliedToUserId,
        title: 'Bình luận của bạn có phản hồi mới',
        message: `${authorName} đã phản hồi bình luận của bạn trong bài viết "${blogTitle}"`,
        notificationType: 'comment',
        metadata: {
          commentId: payload.commentId,
          blogId: payload.blogId,
          parentCommentId: payload.parentCommentId,
          replyAuthorId: payload.replyAuthorId,
        },
        sentVia: ['in_app'],
        isRead: false,
      });

      this.logger.log(
        `Successfully created realtime notification for comment reply: ${payload.commentId} (user: ${payload.repliedToUserId})`,
      );
    } catch (error: any) {
      this.logger.error('Error handling comment reply event:', error);
      // Don't throw - event-driven should be fire-and-forget
    }
  }

  /**
   * Handle blog interaction stats event - create notification for staff about daily blog interactions
   */
  async handleBlogInteractionStats(payload: {
    blogId: string;
    blogTitle: string;
    authorId: string;
    commentCount: number;
    likeCount: number;
    viewCount: number;
    date: string;
  }): Promise<void> {
    try {
      this.logger.log(
        `Handling blog interaction stats event for blog: ${payload.blogId}`,
      );

      const totalInteractions = payload.commentCount + payload.likeCount;

      if (totalInteractions === 0) {
        this.logger.log(
          `No interactions for blog ${payload.blogId}, skipping notification`,
        );
        return;
      }

      // Create notification for blog author (staff)
      await this.notificationRepository.create({
        userId: payload.authorId,
        title: 'Thống kê tương tác bài viết',
        message: `Bài viết "${payload.blogTitle}" của bạn đã nhận được ${payload.commentCount} bình luận và ${payload.likeCount} lượt thích sau 1 ngày`,
        notificationType: 'blog_analytics',
        metadata: {
          blogId: payload.blogId,
          blogTitle: payload.blogTitle,
          commentCount: payload.commentCount,
          likeCount: payload.likeCount,
          viewCount: payload.viewCount,
          date: payload.date,
          totalInteractions,
        },
        sentVia: ['in_app'],
        isRead: false,
      });

      this.logger.log(
        `Successfully created notification for blog interaction stats: ${payload.blogId}`,
      );
    } catch (error: any) {
      this.logger.error('Error handling blog interaction stats event:', error);
      // Don't throw - event-driven should be fire-and-forget
    }
  }

  /**
   * Register a user device token for FCM
   */
  async registerDeviceToken(payload: {
    userId: string;
    token: string;
    platform?: string;
    deviceName?: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(
        `Registering device token for user ${payload.userId}: ${payload.token.substring(0, 10)}...`,
      );

      // Upsert token (update if exists, create if not)
      await this.prisma.userDeviceToken.upsert({
        where: { token: payload.token },
        update: {
          userId: payload.userId,
          platform: payload.platform ?? undefined,
          deviceName: payload.deviceName ?? undefined,
          updatedAt: new Date(),
        },
        create: {
          userId: payload.userId,
          token: payload.token,
          platform: payload.platform ?? undefined,
          deviceName: payload.deviceName ?? undefined,
        },
      });

      return {
        success: true,
        message: 'Device token registered successfully',
      };
    } catch (error: any) {
      this.logger.error('Failed to register device token', error);
      throw new BadRequestException(
        `Failed to register device token: ${error.message}`,
      );
    }
  }

  /**
   * Helper to send push notification to all devices of a user
   */
  private async sendPushNotification(
    notification: Notification,
  ): Promise<void> {
    if (!this.firebaseApp) {
      this.logger.debug('FCM skipped: Firebase not initialized');
      return;
    }

    try {
      // Get all device tokens for this user
      const deviceTokens = await this.prisma.userDeviceToken.findMany({
        where: { userId: notification.userId },
        select: { token: true },
      });

      if (deviceTokens.length === 0) {
        this.logger.debug(
          `No device tokens found for user ${notification.userId}`,
        );
        return;
      }

      const tokens = deviceTokens.map((t) => t.token);

      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title: notification.title,
          body: notification.message,
        },
        data: {
          notificationId: notification.id,
          type: notification.notificationType || 'general',
          metadata: JSON.stringify(notification.metadata || {}),
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'high_importance_channel', // Matches strings.xml on Android
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);

      this.logger.log(
        `Sent push notifications to ${deviceTokens.length} devices for user ${notification.userId}. ` +
          `Success: ${response.successCount}, Failure: ${response.failureCount}`,
      );

      // Optionally cleanup invalid tokens
      if (response.failureCount > 0) {
        const tokensToRemove: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (
            !resp.success &&
            (resp.error?.code === 'messaging/invalid-registration-token' ||
              resp.error?.code ===
                'messaging/registration-token-not-registered')
          ) {
            tokensToRemove.push(tokens[idx]);
          }
        });

        if (tokensToRemove.length > 0) {
          await this.prisma.userDeviceToken.deleteMany({
            where: { token: { in: tokensToRemove } },
          });
          this.logger.log(`Cleaned up ${tokensToRemove.length} invalid tokens`);
        }
      }
    } catch (error: any) {
      this.logger.error('Error sending push notifications via FCM', error);
    }
  }
}
