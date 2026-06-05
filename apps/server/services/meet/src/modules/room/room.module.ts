import { Module, forwardRef } from '@nestjs/common';
import { SharedModule } from '@server/shared';
import { FileModule } from '@server/meet/modules/file/file.module';
import { WebhookModule } from '@server/meet/infrastructure/webhook/webhook.module';
import { ArtifactsModule } from '@server/meet/modules/artifacts/artifacts.module';
import { AnalyticsModule } from '@server/meet/modules/analytics/analytics.module';
import { PollsModule } from '@server/meet/modules/polls/polls.module';
import { BreakoutModule } from '@server/meet/modules/breakout/breakout.module';
import { InsightsModule } from '@server/meet/modules/insights/insights.module';
import { RecordingModule } from '@server/meet/modules/recording/recording.module';
import { SpeechToTextModule } from '@server/meet/modules/speech-to-text/speech-to-text.module';

import { NatsModule } from '@server/meet/services/nats.module';
import { LiveKitModule } from '@server/meet/infrastructure/livekit/livekit.module';
import { WajlcAuthModule } from '@server/meet/modules/auth/wajlc-auth.module';

// Services
import { RoomCreateService } from './room-create.service';
import { RoomInfoService } from './room-info.service';
import { RoomModifyService } from './room-modify.service';
import { RoomEndService } from './room-end.service';
import { RoomDurationService } from './room-duration.service';
import { RoomUserService } from './room-user.service';
import { WaitingRoomService } from '@server/meet/modules/waiting-room/waiting-room.service';

// Redis Services
import { RedisLockService } from '@server/meet/infrastructure/redis/redis-lock.service';
import { RedisRoomService } from '@server/meet/infrastructure/redis/redis-room.service';

// Handlers
import { RoomHandler } from '@server/meet/transport/nats/handlers/room.handler';
import { UserHandler } from '@server/meet/transport/nats/handlers/user.handler';
import { WaitingRoomHandler } from '@server/meet/transport/nats/handlers/waiting-room.handler';

@Module({
  imports: [
    SharedModule,
    forwardRef(() => FileModule),
    forwardRef(() => WebhookModule),
    forwardRef(() => ArtifactsModule),
    forwardRef(() => AnalyticsModule),
    forwardRef(() => PollsModule),
    forwardRef(() => BreakoutModule),
    forwardRef(() => InsightsModule),
    forwardRef(() => RecordingModule),
    forwardRef(() => SpeechToTextModule),
    forwardRef(() => NatsModule),
    LiveKitModule,
    WajlcAuthModule,
  ],
  controllers: [RoomHandler, UserHandler, WaitingRoomHandler],
  providers: [
    // Room services
    RoomCreateService,
    RoomInfoService,
    RoomModifyService,
    RoomEndService,
    RoomDurationService,
    RoomUserService,
    WaitingRoomService,

    // Redis services
    RedisLockService,
    RedisRoomService,
  ],
  exports: [
    RoomInfoService,
    RoomCreateService,
    RoomEndService,
    RoomModifyService,
    RoomUserService,
    RoomDurationService,
    WaitingRoomService,
  ],
})
export class RoomModule {}
