import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Inject,
  Req,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  GatewayAuthGuard,
  PermissionsGuard,
  Permissions,
  successResponse,
  successPaginatedResponse,
  ReqWithRequester,
} from '@server/shared';
import { RefundQueryDTO, UpdateRefundStatusDTO } from '@workspace/schemas';

@Controller('api/refunds')
@UseGuards(GatewayAuthGuard, PermissionsGuard)
export class RefundController {
  constructor(
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  @Get()
  @Permissions('ops.support.handle')
  async getRefunds(@Query() query: RefundQueryDTO) {
    const result = await firstValueFrom(
      this.natsClient.send({ cmd: 'academy.refund.findAll' }, query),
    );
    return successPaginatedResponse(result);
  }

  @Get(':id')
  @Permissions('ops.support.handle')
  async getRefund(@Param('id') id: string) {
    const result = await firstValueFrom(
      this.natsClient.send({ cmd: 'academy.refund.findById' }, { id }),
    );
    return successResponse(result);
  }

  @Patch(':id/status')
  @Permissions('ops.support.handle')
  async updateRefundStatus(
    @Param('id') id: string,
    @Body() dto: UpdateRefundStatusDTO,
    @Req() req: ReqWithRequester,
  ) {
    const requester = req.requester;
    const result = await firstValueFrom(
      this.natsClient.send(
        { cmd: 'academy.refund.updateStatus' },
        { id, dto, requesterId: requester.sub },
      ),
    );
    return successResponse(result, 'Refund status updated successfully');
  }
}
