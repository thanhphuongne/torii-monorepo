import { Module, forwardRef } from '@nestjs/common';
import { ArtifactsService } from './artifacts.service';
import { SharedModule } from '@server/shared';
import { WebhookModule } from '@server/meet/infrastructure/webhook/webhook.module';

import { NatsModule } from '@server/meet/services/nats.module';
import { RedisModule } from '@server/meet/infrastructure/redis/redis.module';

@Module({
  imports: [
    SharedModule,
    forwardRef(() => WebhookModule),
    NatsModule,
    RedisModule,
  ],
  controllers: [],
  providers: [ArtifactsService],
  exports: [ArtifactsService],
})
export class ArtifactsModule {}
