import { Controller, Logger, Inject } from '@nestjs/common';
import {
  EventPattern,
  MessagePattern,
  Payload,
  ClientProxy,
} from '@nestjs/microservices';
import { NotificationType, Requester } from '@workspace/schemas';
import type { SendNotificationEvent } from '@server/identity/infrastructure/events/notification.event';
import type {
  OrderPaymentSuccessEvent,
  OrderStatusChangedEvent,
} from '@server/identity/infrastructure/events/order.event';
import type {
  CourseEnrollmentSuccessEvent,
  CourseGiftReceivedEvent,
} from '@server/identity/infrastructure/events/enrollment.event';

import { NOTIFICATION_SERVICE_TOKEN } from '@server/identity/interfaces/services';
import type { INotificationService } from '@server/identity/interfaces/services';
import { AppConfigService } from '@server/shared';

/**
 * Notification Event Data (for NATS payload)
 */
export interface NotificationEventData {
  recipientId: string;
  type: 'COMMENT_REPLY' | 'DAILY_SUMMARY';
  payload: {
    title: string;
    body: string;
    metadata: Record<string, any>;
  };
}

/**
 * Notification Controller
 * Handles NATS events and messages for notifications
 */
@Controller()
export class NotificationHandler {
  private readonly logger = new Logger(NotificationHandler.name);

  constructor(
    private readonly appConfig: AppConfigService,
    @Inject(NOTIFICATION_SERVICE_TOKEN)
    private readonly notificationService: INotificationService,
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  /**
   * Handle generic send_notification event/message
   */
  @EventPattern({ cmd: 'send_notification' })
  async handleSendNotificationEvent(
    @Payload() event: SendNotificationEvent,
  ): Promise<void> {
    this.logger.log(
      `Received send_notification event for user ${event.recipientId}, type: ${event.type}`,
    );

    try {
      await this.notificationService.create({
        userId: event.recipientId,
        title: event.payload.title,
        message: event.payload.body,
        notificationType: event.type as any,
        metadata: event.payload.metadata || {},
      });

      this.logger.log(`Notification created for user ${event.recipientId}`);

      // Optionally send email if requested
      if (event.sendEmail) {
        this.natsClient.emit(
          { cmd: 'send_email' },
          {
            type: 'notification',
            to: event.recipientId, // Should be email, handled by email service
            data: {
              title: event.payload.title,
              body: event.payload.body,
            },
          },
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to create notification: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle unified send_notification message (Request-Response)
   * Pattern: send_notification
   * Supports: COMMENT_REPLY, DAILY_SUMMARY
   */
  @MessagePattern({ cmd: 'send_notification' })
  async handleSendNotificationMessage(
    @Payload() payload: NotificationEventData,
  ): Promise<void> {
    try {
      this.logger.log(
        `Received send_notification message: type=${payload.type}, recipientId=${payload.recipientId}`,
      );
      await this.notificationService.handleSendNotification(payload);
    } catch (error: any) {
      this.logger.error(
        `Error handling send_notification message: ${error?.message}`,
        error,
      );
    }
  }

  /**
   * Khóa học (course profile) phát hành — thông báo học viên.
   * Pattern: course.published
   */
  @MessagePattern({ cmd: 'course.published' })
  async handleCoursePublished(
    @Payload()
    payload: {
      courseProfileId: string;
      courseTitle: string;
      courseJlptLevel: string;
      userIds?: string[];
    },
  ): Promise<void> {
    try {
      this.logger.log(
        `Received course.published event for course profile: ${payload.courseProfileId}`,
      );
      await this.notificationService.handleCoursePublished(payload);
    } catch (error: any) {
      this.logger.error(
        `Error handling course.published event: ${error?.message}`,
        error,
      );
    }
  }

  // --- Message Patterns for API Gateway ---

  @MessagePattern({ cmd: 'identity.notification.findAll' })
  async findAll(
    @Payload()
    data: {
      query: {
        page?: number;
        limit?: number;
        isRead?: boolean;
        [key: string]: any;
      };
      requester: Requester;
    },
  ) {
    return this.notificationService.findAll(data.requester.sub, {
      page: data.query.page ?? 1,
      limit: data.query.limit ?? 10,
      isRead: data.query.isRead,
    });
  }

  @MessagePattern({ cmd: 'identity.notification.getUnreadCount' })
  async getUnreadCount(@Payload() data: { requester: Requester }) {
    return this.notificationService.getUnreadCount(data.requester.sub);
  }

  @MessagePattern({ cmd: 'identity.notification.markAsRead' })
  async markAsRead(
    @Payload() data: { notificationId: string; requester: Requester },
  ) {
    return this.notificationService.markAsRead(
      data.notificationId,
      data.requester.sub,
    );
  }

  @MessagePattern({ cmd: 'identity.notification.markAllAsRead' })
  async markAllAsRead(@Payload() data: { requester: Requester }) {
    return this.notificationService.markAllAsRead(data.requester.sub);
  }

  @MessagePattern({ cmd: 'identity.notification.delete' })
  async delete(
    @Payload() data: { notificationId: string; requester: Requester },
  ) {
    return this.notificationService.delete(
      data.notificationId,
      data.requester.sub,
    );
  }

  @MessagePattern({ cmd: 'identity.notification.create' })
  async create(@Payload() payload: any) {
    return this.notificationService.create(payload);
  }

  @MessagePattern({ cmd: 'identity.notification.registerToken' })
  async registerToken(
    @Payload()
    data: {
      token: string;
      platform?: string;
      deviceName?: string;
      requester: Requester;
    },
  ) {
    return this.notificationService.registerDeviceToken({
      userId: data.requester.sub,
      token: data.token,
      platform: data.platform,
      deviceName: data.deviceName,
    });
  }

  // --- Event Patterns for internal microservices ---

  /**
   * Handle order_payment_success event
   */
  @EventPattern({ cmd: 'order_payment_success' })
  async handleOrderPaymentSuccess(
    @Payload() event: OrderPaymentSuccessEvent,
  ): Promise<void> {
    this.logger.log(
      `Received order_payment_success event for order ${event.orderId}, user: ${event.userId}`,
    );

    try {
      const isGift = !!event.isGift;
      const message = isGift
        ? `Bạn đã thanh toán khóa học và gửi tặng cho ${event.recipientName || 'người nhận'} thành công!`
        : `Bạn đã thanh toán thành công khóa học "${event.courseName}". Bắt đầu học ngay!`;

      await this.notificationService.create({
        userId: event.userId,
        title: 'Thanh toán thành công! 🎉',
        message,
        notificationType: NotificationType.SYSTEM,
        metadata: {
          orderId: event.orderId,
          courseId: event.courseId,
          courseName: event.courseName,
          amount: event.amount,
          isGift,
          recipientName: event.recipientName,
        },
      });

      this.natsClient.emit(
        { cmd: 'send_email' },
        {
          type: 'order_success',
          to: event.userEmail,
          data: {
            displayName: event.userName,
            courseName: event.courseName,
            courseUrl: `${this.appConfig.server.webUrl}/courses/${event.courseId}`,
            amount: event.amount,
            currency: event.currency,
            orderId: event.orderId,
          },
        },
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to handle order payment success: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle course_gift_received event
   */
  @EventPattern({ cmd: 'course_gift_received' })
  async handleCourseGiftReceived(
    @Payload() event: CourseGiftReceivedEvent,
  ): Promise<void> {
    this.logger.log(
      `Received course_gift_received event for user ${event.recipientId}, from ${event.senderName}`,
    );

    try {
      await this.notificationService.create({
        userId: event.recipientId,
        title: 'Bạn nhận được món quà kiến thức! 🎁',
        message: `Bạn vừa nhận được khóa học "${event.courseName}" từ ${event.senderName}. Hãy bắt đầu học nào!`,
        notificationType: NotificationType.SYSTEM,
        metadata: {
          senderId: event.senderId,
          senderName: event.senderName,
          courseId: event.courseId,
          courseName: event.courseName,
          enrollmentId: event.enrollmentId,
          giftMessage: event.giftMessage,
        },
      });

      this.natsClient.emit(
        { cmd: 'send_email' },
        {
          type: 'course_enrollment',
          to: event.recipientEmail,
          data: {
            displayName: 'Học viên',
            courseName: event.courseName,
            courseUrl: `${this.appConfig.server.webUrl}/courses/${event.courseId}`,
            senderName: event.senderName,
            isGift: true,
            giftMessage: event.giftMessage,
          },
        },
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to handle course gift received: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle order_status_changed event
   */
  @EventPattern({ cmd: 'order_status_changed' })
  async handleOrderStatusChanged(
    @Payload() event: OrderStatusChangedEvent,
  ): Promise<void> {
    this.logger.log(
      `Received order_status_changed event for order ${event.orderId}, status: ${event.oldStatus} → ${event.newStatus}`,
    );

    try {
      await this.notificationService.create({
        userId: event.userId,
        title: 'Trạng thái đơn hàng thay đổi',
        message: `Đơn hàng ${event.orderId} đã chuyển từ ${event.oldStatus} sang ${event.newStatus}`,
        notificationType: NotificationType.ORDER_STATUS_UPDATE,
        metadata: {
          orderId: event.orderId,
          oldStatus: event.oldStatus,
          newStatus: event.newStatus,
        },
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to handle order status changed: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle course_enrollment_success event
   */
  @EventPattern({ cmd: 'course_enrollment_success' })
  async handleCourseEnrollmentSuccess(
    @Payload() event: CourseEnrollmentSuccessEvent,
  ): Promise<void> {
    this.logger.log(
      `Received course_enrollment_success event for enrollment ${event.enrollmentId}, user: ${event.userId}`,
    );

    try {
      await this.notificationService.create({
        userId: event.userId,
        title: 'Tham gia khóa học thành công! 🎉',
        message: `Bạn đã tham gia thành công khóa học "${event.courseName}". Bắt đầu học ngay!`,
        notificationType: NotificationType.SYSTEM,
        metadata: {
          enrollmentId: event.enrollmentId,
          courseId: event.courseId,
          courseName: event.courseName,
        },
      });

      if (event.userEmail) {
        this.natsClient.emit(
          { cmd: 'send_email' },
          {
            type: 'course_enrollment',
            to: event.userEmail,
            data: {
              displayName: event.userName,
              courseName: event.courseName,
              courseUrl: `${this.appConfig.server.webUrl}/courses/${event.courseId}`,
            },
          },
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to handle course enrollment success: ${error.message}`,
        error.stack,
      );
    }
  }
}
