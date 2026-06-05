/**
 * Speech To Text Module
 */

import { Module, forwardRef } from '@nestjs/common';
import { SpeechToTextService } from './speech-to-text.service';
import { RedisSpeechToTextService } from '@server/meet/infrastructure/redis/redis-speech-to-text.service';
import { NatsModule } from '@server/meet/services/nats.module';
import { SpeechToTextHandler } from '@server/meet/transport/nats/handlers/speech-to-text.handler';
import { WebhookModule } from '@server/meet/infrastructure/webhook/webhook.module';
import { AnalyticsModule } from '@server/meet/modules/analytics/analytics.module';
import { SharedModule } from '@server/shared';

@Module({
  imports: [
    SharedModule,
    NatsModule,
    forwardRef(() => WebhookModule),
    forwardRef(() => AnalyticsModule),
  ],
  controllers: [SpeechToTextHandler],
  providers: [SpeechToTextService, RedisSpeechToTextService],
  exports: [SpeechToTextService, RedisSpeechToTextService],
})
export class SpeechToTextModule {}
