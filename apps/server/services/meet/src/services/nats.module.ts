/**
 * NATS Module
 *
 * Provides NATS general services and JetStream client
 */

import { Module, Global, forwardRef } from '@nestjs/common';
import { NatsService } from '@server/meet/infrastructure/nats/nats.service';
import { NatsCacheService } from '@server/meet/infrastructure/nats/nats-cache.service';
import { NatsRoomService } from '@server/meet/infrastructure/nats/nats-room.service';
import { NatsRoomEventsService } from '@server/meet/infrastructure/nats/nats-room-events.service';
import { NatsSystemEventsService } from '@server/meet/infrastructure/nats/nats-system-events.service';
import { NatsStreamService } from '@server/meet/infrastructure/nats/nats-stream.service';
import { NatsUserService } from '@server/meet/infrastructure/nats/nats-user.service';
import { NatsUserInfoService } from '@server/meet/infrastructure/nats/nats-user-info.service';
import { NatsAuthCalloutService } from '@server/meet/infrastructure/nats/nats-auth-callout.service';
import { NatsConsumerService } from '@server/meet/infrastructure/nats/nats-consumer.service';
import { NatsController } from '@server/meet/infrastructure/nats/nats.controller';
import { AnalyticsModule } from '@server/meet/modules/analytics/analytics.module';
import { LiveKitModule } from '@server/meet/infrastructure/livekit/livekit.module';
import { WajlcAuthModule } from '@server/meet/modules/auth/wajlc-auth.module';
import { RoomModule } from '@server/meet/modules/room/room.module';

@Global()
@Module({
  imports: [
    forwardRef(() => AnalyticsModule),
    forwardRef(() => RoomModule),
    LiveKitModule,
    forwardRef(() => WajlcAuthModule),
  ],
  providers: [
    NatsService,
    NatsCacheService,
    NatsRoomService,
    NatsRoomEventsService,
    NatsSystemEventsService,
    NatsStreamService,
    NatsUserService,
    NatsUserInfoService,
    NatsAuthCalloutService,
    NatsConsumerService,
    NatsController,
  ],
  exports: [
    NatsService,
    NatsCacheService,
    NatsRoomService,
    NatsRoomEventsService,
    NatsSystemEventsService,
    NatsStreamService,
    NatsUserService,
    NatsUserInfoService,
    NatsAuthCalloutService,
    NatsConsumerService,
    NatsController,
  ],
})
export class NatsModule {}
