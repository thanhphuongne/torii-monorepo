import { Module, forwardRef } from '@nestjs/common';
import { FileService } from './file.service';
import { SharedModule } from '@server/shared';
import { NatsRoomService } from '@server/meet/infrastructure/nats/nats-room.service';
import { NatsRoomEventsService } from '@server/meet/infrastructure/nats/nats-room-events.service';
import { NatsService } from '@server/meet/infrastructure/nats/nats.service';
import { NatsCacheService } from '@server/meet/infrastructure/nats/nats-cache.service';
import { NatsStreamService } from '@server/meet/infrastructure/nats/nats-stream.service';
import { NatsUserService } from '@server/meet/infrastructure/nats/nats-user.service';
import { NatsUserInfoService } from '@server/meet/infrastructure/nats/nats-user-info.service';
import { NatsSystemEventsService } from '@server/meet/infrastructure/nats/nats-system-events.service';
import { LiveKitService } from '@server/meet/infrastructure/livekit/livekit.service';
import { AnalyticsModule } from '@server/meet/modules/analytics/analytics.module';
import { WajlcAuthService } from '@server/meet/modules/auth/wajlc-auth.service';

@Module({
  imports: [SharedModule, forwardRef(() => AnalyticsModule)],
  providers: [
    FileService,
    NatsService,
    NatsCacheService,
    NatsStreamService,
    NatsUserInfoService,
    LiveKitService,
    WajlcAuthService,
    NatsSystemEventsService,
    NatsUserService,
    NatsRoomService,
    NatsRoomEventsService,
  ],
  controllers: [],
  exports: [FileService],
})
export class FileModule {}
