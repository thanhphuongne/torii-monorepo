import { Module } from '@nestjs/common';
import { PrismaModule } from '@server/shared';
import { WalletService } from './wallet.service';
import { WalletHandler } from './wallet.handler';

@Module({
  imports: [PrismaModule],
  controllers: [WalletHandler],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
