import { Module } from '@nestjs/common';

import { QuotaModule } from './quota/quota.module';
import { OrderService } from './order/order.service';
import { OrderHandler } from './order/order.handler';
import { OrderListener } from './order.listener';
import { CouponService } from './coupon.service';
import { CouponHandler } from './coupon.handler';
import { PayOSService } from './payos.service';
import { CouponCronService } from './coupon-cron.service';
import { OrderCronService } from './order/order-cron.service';
import { EnrollmentModule } from '../classroom/enrollment/enrollment.module';
import { NatsClientModule } from '@server/shared';

@Module({
  imports: [EnrollmentModule, NatsClientModule, QuotaModule],
  controllers: [OrderHandler, OrderListener, CouponHandler],
  providers: [
    OrderService,
    CouponService,
    PayOSService,
    CouponCronService,
    OrderCronService,
  ],
  exports: [OrderService, CouponService, QuotaModule],
})
export class CommerceModule {}
