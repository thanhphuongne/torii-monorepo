import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { WalletService } from './wallet.service';

@Controller()
export class WalletHandler {
  constructor(private readonly walletService: WalletService) {}

  @MessagePattern({ cmd: 'academy.wallet.getBalance' })
  async getBalance(@Payload() payload: { userId: string }) {
    return this.walletService.getBalance(payload.userId);
  }

  @MessagePattern({ cmd: 'academy.wallet.getTransactions' })
  async getTransactions(@Payload() payload: { userId: string; query: any }) {
    return this.walletService.getTransactions(payload.userId, payload.query);
  }
}
