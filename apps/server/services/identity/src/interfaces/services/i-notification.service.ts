import type {
  NotificationResponseDTO,
  NotificationQueryDTO,
  NotificationCreateDTO,
  NotificationUnreadCountResponseDTO,
  PaginatedResponseDTO,
} from '@workspace/schemas';

/**
 * Notification Service Interface
 * Defines the contract for notification business logic operations
 */
export interface INotificationService {
  /**
   * Get all notifications for a user with pagination and filtering
   */
  findAll(
    userId: string,
    query: NotificationQueryDTO,
  ): Promise<PaginatedResponseDTO<NotificationResponseDTO>>;

  /**
   * Mark a notification as read
   */
  markAsRead(
    notificationId: string,
    userId: string,
  ): Promise<NotificationResponseDTO>;

  /**
   * Mark all notifications as read for a user
   */
  markAllAsRead(
    userId: string,
  ): Promise<{ success: boolean; message: string; count: number }>;

  /**
   * Get unread count for a user
   */
  getUnreadCount(userId: string): Promise<NotificationUnreadCountResponseDTO>;

  /**
   * Delete a notification
   */
  delete(
    notificationId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }>;

  /**
   * Create a notification (for event-driven use cases)
   */
  create(data: NotificationCreateDTO): Promise<NotificationResponseDTO>;

  /**
   * Handle course published event - create notifications for interested learners
   */
  handleCoursePublished(payload: {
    courseProfileId: string;
    courseTitle: string;
    courseJlptLevel: string;
    userIds?: string[];
  }): Promise<void>;

  /**
   * Handle unified send_notification event
   * Pattern: send_notification
   * Supports: COMMENT_REPLY, DAILY_SUMMARY
   */
  handleSendNotification(payload: {
    recipientId: string;
    type: 'COMMENT_REPLY' | 'DAILY_SUMMARY';
    payload: {
      title: string;
      body: string;
      metadata: Record<string, any>;
    };
  }): Promise<void>;

  /**
   * Handle comment reply event - create notification for the person being replied to
   * @deprecated Use handleSendNotification instead
   */
  handleCommentReply(payload: {
    commentId: string;
    blogId: string;
    parentCommentId: string;
    repliedToUserId: string;
    replyAuthorId: string;
    content: string;
  }): Promise<void>;

  /**
   * Handle blog interaction stats event - create notification for staff about blog interactions
   * @deprecated Use handleSendNotification instead
   */
  handleBlogInteractionStats(payload: {
    blogId: string;
    blogTitle: string;
    authorId: string;
    commentCount: number;
    likeCount: number;
    viewCount: number;
    date: string;
  }): Promise<void>;

  /**
   * Register a device token for push notifications
   */
  registerDeviceToken(payload: {
    userId: string;
    token: string;
    platform?: string;
    deviceName?: string;
  }): Promise<{ success: boolean; message: string }>;
}
