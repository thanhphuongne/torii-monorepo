import {
  Body,
  Controller,
  Inject,
  Post,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import type { ClientProxy } from '@nestjs/microservices/client';

import { firstValueFrom } from 'rxjs';
import {
  GatewayAuthGuard,
  ZodValidationPipe,
  successResponse,
  successPaginatedResponse,
  Permissions,
  PermissionsGuard,
  ReqWithRequester,
} from '@server/shared';
import { orderCheckoutSchema, orderPreviewSchema } from './order.schema';

@Controller('api/academy/orders')
@UseGuards(GatewayAuthGuard, PermissionsGuard)
export class OrderController {
  constructor(@Inject('NATS_SERVICE') private readonly nats: ClientProxy) {}

  @Post('preview')
  async preview(
    @Body(new ZodValidationPipe(orderPreviewSchema))
    dto: any,
    @Req() req: ReqWithRequester,
  ) {
    const result = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.order.preview' },
        { userId: req.requester?.sub, input: dto },
      ),
    );
    return successResponse(result);
  }

  @Post('checkout')
  async checkout(
    @Body(new ZodValidationPipe(orderCheckoutSchema))
    dto: any,
    @Req() req: ReqWithRequester,
  ) {
    const result = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.order.checkout' },
        { userId: req.requester?.sub, input: dto },
      ),
    );
    return successResponse(result);
  }

  @Get('by-code/:orderCode')
  async findByCodeForUser(
    @Param('orderCode') orderCode: string,
    @Req() req: ReqWithRequester,
  ) {
    const result = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.order.findByCodeForUser' },
        { userId: req.requester?.sub, orderCode },
      ),
    );
    return successResponse(result);
  }

  @Get('my')
  async findAllForUser(@Req() req: ReqWithRequester, @Query() query: any) {
    const result = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.order.findAllForUser' },
        { userId: req.requester?.sub, query },
      ),
    );
    return successResponse(result);
  }

  @Get('my/:id')
  async findOneForUser(@Param('id') id: string, @Req() req: ReqWithRequester) {
    const result = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.order.findOneForUser' },
        { userId: req.requester?.sub, id },
      ),
    );
    return successResponse({ item: result });
  }

  @Post(':id/repay')
  async repay(@Param('id') id: string, @Req() req: ReqWithRequester) {
    const result = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.order.repay' },
        { userId: req.requester?.sub, orderId: id },
      ),
    );
    return successResponse(result);
  }

  // --- Admin CRUD ---

  @Get('admin')
  @Permissions('ops.order.manage')
  async admin_findAll(@Query() query: any) {
    const result = await firstValueFrom(
      this.nats.send({ cmd: 'academy.order.admin.findAll' }, query),
    );
    return successPaginatedResponse(result as any);
  }
  @Get('stats')
  @Permissions('ops.order.manage')
  async admin_getStats(@Query() query: any) {
    const result = await firstValueFrom(
      this.nats.send({ cmd: 'academy.order.admin.getStats' }, query),
    );
    return successResponse(result);
  }

  /** Đặt trước `admin/:id` để tránh khớp nhầm `.../admin/export` → id = "export" */
  @Get('export')
  @Permissions('ops.order.manage')
  async admin_export(@Query() query: any, @Res() res: any) {
    const buffer = await firstValueFrom(
      this.nats.send({ cmd: 'academy.order.admin.export' }, query),
    );

    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename=orders-export-${new Date().getTime()}.csv`,
    });
    return res.send(buffer);
  }

  @Get('admin/:id')
  @Permissions('ops.order.manage')
  async admin_findOne(@Param('id') id: string) {
    const result = await firstValueFrom(
      this.nats.send({ cmd: 'academy.order.admin.findOne' }, { id }),
    );
    return successResponse(result);
  }

  @Patch('admin/:id/status')
  @Permissions('ops.order.manage')
  async admin_updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @Req() req: ReqWithRequester,
  ) {
    const result = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.order.admin.updateStatus' },
        { id, status: body.status, requesterId: req.requester?.sub },
      ),
    );
    return successResponse(result);
  }

  @Post(':id/cancel')
  @Permissions('ops.order.manage')
  async admin_cancel(@Param('id') id: string, @Req() req: ReqWithRequester) {
    const result = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.order.admin.cancel' },
        { id, requesterId: req.requester?.sub },
      ),
    );
    return successResponse(result);
  }
}

