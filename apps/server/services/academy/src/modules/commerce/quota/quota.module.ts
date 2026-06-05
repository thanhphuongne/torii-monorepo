import { Module } from '@nestjs/common';
import { QuotaService } from './quota.service';
import { QuotaHandler } from './quota.handler';
import { AiSubscriptionService } from './ai-subscription.service';

@Module({
  providers: [QuotaService, AiSubscriptionService],
  controllers: [QuotaHandler],
  exports: [QuotaService, AiSubscriptionService],
})
export class QuotaModule {}
