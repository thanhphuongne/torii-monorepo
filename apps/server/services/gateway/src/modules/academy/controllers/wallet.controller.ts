import { Controller, Get, Query, UseGuards, Inject, Req, Param } from '@nestjs/common';
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

@Controller('api/academy/wallet')
@UseGuards(GatewayAuthGuard, PermissionsGuard)
export class WalletController {
  constructor(
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) { }

  @Get('balance')
  async getBalance(@Req() req: ReqWithRequester) {
    const requester = req.requester;
    const result = await firstValueFrom(
      this.natsClient.send(
        { cmd: 'academy.wallet.getBalance' },
        { userId: requester.sub },
      ),
    );
    return successResponse(result);
  }

  @Get('transactions')
  async getTransactions(@Query() query: any, @Req() req: ReqWithRequester) {
    const requester = req.requester;
    const result = await firstValueFrom(
      this.natsClient.send(
        { cmd: 'academy.wallet.getTransactions' },
        { userId: requester.sub, query },
      ),
    );
    return successPaginatedResponse(result);
  }

  @Get(':userId/balance')
  @Permissions('ops.user.manage')
  async getUserBalance(@Param('userId') userId: string) {
    const result = await firstValueFrom(
      this.natsClient.send({ cmd: 'academy.wallet.getBalance' }, { userId }),
    );
    return successResponse(result);
  }

  @Get(':userId/transactions')
  @Permissions('ops.user.view')
  async getUserTransactions(
    @Param('userId') userId: string,
    @Query() query: any,
  ) {
    const result = await firstValueFrom(
      this.natsClient.send(
        { cmd: 'academy.wallet.getTransactions' },
        { userId, query },
      ),
    );
    return successPaginatedResponse(result);
  }
}
