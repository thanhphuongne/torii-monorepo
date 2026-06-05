import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule, NatsClientModule } from '@server/shared';
import { NotificationService } from '@server/identity/modules/notification/notification.service';
import { NotificationRepository } from '@server/identity/modules/notification/notification.repository';
import { NotificationHandler } from '@server/identity/modules/notification/notification.handler';
import { NOTIFICATION_SERVICE_TOKEN } from '@server/identity/interfaces/services';
import { NOTIFICATION_REPOSITORY_TOKEN } from '@server/identity/interfaces/repositories';

/**
 * Notification Feature Module
 * Handles notification operations
 */
@Module({
  imports: [PrismaModule, NatsClientModule, ConfigModule],
  controllers: [NotificationHandler],
  providers: [
    {
      provide: NOTIFICATION_REPOSITORY_TOKEN,
      useClass: NotificationRepository,
    },
    {
      provide: NOTIFICATION_SERVICE_TOKEN,
      useClass: NotificationService,
    },
  ],
  exports: [NOTIFICATION_SERVICE_TOKEN],
})
export class NotificationModule {}
