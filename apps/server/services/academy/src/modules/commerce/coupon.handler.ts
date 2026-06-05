import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { CouponService } from './coupon.service';

@Controller()
export class CouponHandler {
  private readonly logger = new Logger(CouponHandler.name);

  constructor(private readonly couponService: CouponService) {}

  @MessagePattern({ cmd: 'academy.coupon.validate' })
  validate(
    @Payload()
    data: {
      code: string;
      userId: string;
      orderValue: number;
    },
  ) {
    try {
      if (
        !data?.code ||
        !data?.userId ||
        typeof data.orderValue !== 'number' ||
        data.orderValue < 0
      ) {
        throw new RpcException('Invalid coupon validation payload');
      }
      return this.couponService.validateCoupon(
        data.code,
        data.userId,
        data.orderValue,
      );
    } catch (error) {
      this.logger.error(`Error validating coupon: ${error.message}`);
      throw new RpcException(error.message);
    }
  }

  @MessagePattern({ cmd: 'academy.coupon.getMyCoupons' })
  getMyCoupons(@Payload() data: { userId: string }) {
    return this.couponService.getMyCoupons(data.userId);
  }

  // --- Admin CRUD ---

  @MessagePattern({ cmd: 'academy.coupon.admin.findAll' })
  admin_findAll() {
    return this.couponService.admin_findAll();
  }

  @MessagePattern({ cmd: 'academy.coupon.admin.findOne' })
  admin_findOne(@Payload() data: { id: string }) {
    return this.couponService.admin_findOne(data.id);
  }

  @MessagePattern({ cmd: 'academy.coupon.admin.create' })
  admin_create(@Payload() data: any) {
    const { requesterId, ...input } = data;
    return this.couponService.admin_create(input, requesterId);
  }

  @MessagePattern({ cmd: 'academy.coupon.admin.update' })
  admin_update(
    @Payload() data: { id: string; data: any; requesterId?: string },
  ) {
    return this.couponService.admin_update(
      data.id,
      data.data,
      data.requesterId,
    );
  }

  @MessagePattern({ cmd: 'academy.coupon.admin.delete' })
  admin_delete(@Payload() data: { id: string; requesterId?: string }) {
    return this.couponService.admin_delete(data.id, data.requesterId);
  }
}
