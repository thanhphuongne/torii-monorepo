import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { ActivityType } from '@prisma/generated';
import { GamificationService } from './gamification.service';

/** Nhận `user.activity` từ Identity (ví dụ LOGIN) để ghi streak + thưởng XP/points. */
@Controller()
export class GamificationActivityListener {
  private readonly logger = new Logger(GamificationActivityListener.name);

  constructor(private readonly gamification: GamificationService) {}

  @EventPattern('user.activity')
  async handleUserActivity(
    @Payload()
    data: {
      userId: string;
      activityType: string;
      meta?: Record<string, unknown>;
      timestamp?: string;
    },
  ) {
    if (!data?.userId || !data?.activityType) {
      return;
    }
    if (!this.isActivityType(data.activityType)) {
      this.logger.warn(
        `Bỏ qua activity type không hợp lệ: ${data.activityType}`,
      );
      return;
    }
    try {
      await this.gamification.trackActivity(
        data.userId,
        data.activityType,
        data.meta ?? {},
      );
    } catch (e: unknown) {
      const err = e as Error;
      this.logger.error(
        `user.activity thất bại userId=${data.userId}: ${err.message}`,
        err.stack,
      );
    }
  }

  private isActivityType(v: string): v is ActivityType {
    return (Object.values(ActivityType) as string[]).includes(v);
  }
}
