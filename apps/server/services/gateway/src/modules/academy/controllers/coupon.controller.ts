import {
  Body,
  Controller,
  Inject,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  GatewayAuthGuard,
  successResponse,
  Permissions,
  PermissionsGuard,
  ReqWithRequester,
  ZodValidationPipe,
} from '@server/shared';
import {
  couponCreateDTOSchema,
  couponUpdateDTOSchema,
  type CouponCreateDTO,
  type CouponUpdateDTO,
} from '@workspace/schemas';

@Controller('api/academy/coupons')
@UseGuards(GatewayAuthGuard, PermissionsGuard)
export class CouponController {
  constructor(@Inject('NATS_SERVICE') private readonly nats: ClientProxy) {}

  // ===================== USER ENDPOINTS =====================

  /**
   * Validate a coupon code
   */
  @Post('validate')
  async validate(@Body() body: any, @Req() req: ReqWithRequester) {
    const result = await firstValueFrom(
      this.nats.send({ cmd: 'academy.coupon.validate' }, {
        code: body?.code,
        orderValue: body?.orderValue,
        userId: req.requester?.sub,
      }),
    );
    return successResponse(result);
  }

  /**
   * Get user's owned coupons
   */
  @Get('my-coupons')
  async getMyCoupons(@Req() req: ReqWithRequester) {
    const userId = req.requester.sub;
    const result = await firstValueFrom(
      this.nats.send({ cmd: 'academy.coupon.getMyCoupons' }, { userId }),
    );
    return successResponse(result);
  }

  // ===================== ADMIN ENDPOINTS =====================

  @Get('admin')
  @Permissions('ops.coupon.manage')
  async findAll() {
    const result = await firstValueFrom(
      this.nats.send({ cmd: 'academy.coupon.admin.findAll' }, {}),
    );
    return successResponse(result);
  }

  @Get('admin/:id')
  @Permissions('ops.coupon.manage')
  async findOne(@Param('id') id: string) {
    const result = await firstValueFrom(
      this.nats.send({ cmd: 'academy.coupon.admin.findOne' }, { id }),
    );
    return successResponse(result);
  }

  @Post('admin')
  @Permissions('ops.coupon.manage')
  async create(
    @Body(new ZodValidationPipe(couponCreateDTOSchema)) body: CouponCreateDTO,
    @Req() req: ReqWithRequester,
  ) {
    const result = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.coupon.admin.create' },
        { ...body, requesterId: req.requester?.sub },
      ),
    );
    return successResponse(result);
  }

  @Patch('admin/:id')
  @Permissions('ops.coupon.manage')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(couponUpdateDTOSchema)) body: CouponUpdateDTO,
    @Req() req: ReqWithRequester,
  ) {
    const result = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.coupon.admin.update' },
        { id, data: body, requesterId: req.requester?.sub },
      ),
    );
    return successResponse(result);
  }

  @Delete('admin/:id')
  @Permissions('ops.coupon.manage')
  async delete(@Param('id') id: string, @Req() req: ReqWithRequester) {
    const result = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.coupon.admin.delete' },
        { id, requesterId: req.requester?.sub },
      ),
    );
    return successResponse(result);
  }
}
