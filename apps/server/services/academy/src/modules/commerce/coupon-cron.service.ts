import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@server/shared/prisma/prisma.service';
import { CouponStatus, Prisma } from '@prisma/generated';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class CouponCronService {
  private readonly logger = new Logger(CouponCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async notifyExpiringCoupons() {
    this.logger.log('Checking for coupons expiring soon...');
    try {
      const now = new Date();
      const twoDaysLater = new Date();
      twoDaysLater.setDate(now.getDate() + 2);

      // Find coupons that:
      // 1. Are personal (have an ownerId)
      // 2. Are ACTIVE
      // 3. Expire in the next 2 days
      // 4. Haven't been notified yet
      const expiringCoupons = await this.prisma.coupon.findMany({
        where: {
          ownerId: { not: null },
          status: CouponStatus.ACTIVE,
          endDate: {
            gt: now,
            lte: twoDaysLater,
          },
        },
      });

      for (const coupon of expiringCoupons) {
        const metadata = (coupon.metadata as any) || {};
        if (metadata.expiryNotified) continue;

        if (coupon.ownerId) {
          try {
            this.natsClient.emit(
              { cmd: 'send_notification' },
              {
                recipientId: coupon.ownerId,
                type: 'system',
                payload: {
                  title: 'Mã giảm giá sắp hết hạn',
                  body: `Mã giảm giá ${coupon.code} của bạn sẽ hết hạn vào lúc ${coupon.endDate?.toLocaleString('vi-VN')}. Hãy sử dụng ngay!`,
                  metadata: { couponCode: coupon.code, couponId: coupon.id },
                },
              },
            );

            // Mark as notified
            await this.prisma.coupon.update({
              where: { id: coupon.id },
              data: {
                metadata: {
                  ...metadata,
                  expiryNotified: true,
                  notifiedAt: new Date().toISOString(),
                },
              },
            });
            this.logger.log(
              `Notified user ${coupon.ownerId} about expiring coupon ${coupon.code}`,
            );
          } catch (e: any) {
            this.logger.error(`Failed to notify expiring coupon: ${e.message}`);
          }
        }
      }
    } catch (error) {
      this.logger.error('Error in notifyExpiringCoupons:', error);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleCouponExpirations() {
    this.logger.log('Starting scheduled coupon expiration check...');
    try {
      const now = new Date();

      // 1. Expire by date
      const expiredByDate = await this.prisma.coupon.updateMany({
        where: {
          status: CouponStatus.ACTIVE,
          endDate: { lte: now },
        },
        data: { status: CouponStatus.INACTIVE },
      });

      if (expiredByDate.count > 0) {
        this.logger.log(
          `Deactivated ${expiredByDate.count} coupons due to expiration date reached.`,
        );
      }

      // 2. Expire by usage limit
      const deactivatedUsageCount = await this.deactivateCouponsReachedLimit();

      if (deactivatedUsageCount === 0 && expiredByDate.count === 0) {
        this.logger.log('No coupons needed deactivation.');
      }

      this.logger.log('Scheduled coupon expiration check completed.');
    } catch (error) {
      this.logger.error(
        'Error during scheduled coupon expiration check:',
        error,
      );
    }
  }

  private async deactivateCouponsReachedLimit(): Promise<number> {
    // Find coupons where usageCount >= usageLimit
    const couponsToDeactivate = await this.prisma.coupon.findMany({
      where: {
        status: CouponStatus.ACTIVE,
        usageLimit: { not: null },
      },
      select: { id: true, usageCount: true, usageLimit: true },
    });

    const idsToDeactivate = couponsToDeactivate
      .filter((c) => c.usageCount >= (c.usageLimit as number))
      .map((c) => c.id);

    if (idsToDeactivate.length > 0) {
      await this.prisma.coupon.updateMany({
        where: { id: { in: idsToDeactivate } },
        data: { status: CouponStatus.INACTIVE },
      });
      this.logger.log(
        `Deactivated ${idsToDeactivate.length} coupons due to usage limit reached.`,
      );
      return idsToDeactivate.length;
    }
    return 0;
  }
}
