import { Module, forwardRef } from '@nestjs/common';
import { WebhookNotifierService } from './webhook-notifier.service';
import { WebhookService } from './webhook.service';
import { SharedModule } from '@server/shared';
import { RedisRoomService } from '@server/meet/infrastructure/redis/redis-room.service';
import { AnalyticsModule } from '@server/meet/modules/analytics/analytics.module';
import { RoomModule } from '@server/meet/modules/room/room.module';
import { SpeechToTextModule } from '@server/meet/modules/speech-to-text/speech-to-text.module';
import { NatsModule } from '@server/meet/services/nats.module';
import { LiveKitModule } from '@server/meet/infrastructure/livekit/livekit.module';
import { WajlcAuthModule } from '@server/meet/modules/auth/wajlc-auth.module';
import { BreakoutModule } from '@server/meet/modules/breakout/breakout.module';

@Module({
  imports: [
    SharedModule,
    forwardRef(() => AnalyticsModule),
    forwardRef(() => RoomModule),
    forwardRef(() => SpeechToTextModule),
    forwardRef(() => NatsModule),
    forwardRef(() => BreakoutModule),
    LiveKitModule,
    WajlcAuthModule,
  ],
  controllers: [],
  providers: [
    // Redis
    RedisRoomService,

    // Webhook services
    WebhookNotifierService,
    WebhookService,
  ],
  exports: [WebhookNotifierService, WebhookService],
})
export class WebhookModule {}
