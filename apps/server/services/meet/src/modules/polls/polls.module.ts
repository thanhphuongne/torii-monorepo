import { Module, forwardRef } from '@nestjs/common';
import { PollsService } from './polls.service';
import { SharedModule } from '@server/shared';
import { RedisPollService } from '@server/meet/infrastructure/redis/redis-poll.service';
import { RedisLockService } from '@server/meet/infrastructure/redis/redis-lock.service';

import { AnalyticsModule } from '@server/meet/modules/analytics/analytics.module';
import { NatsModule } from '@server/meet/services/nats.module';
import { LiveKitModule } from '@server/meet/infrastructure/livekit/livekit.module';
import { WajlcAuthModule } from '@server/meet/modules/auth/wajlc-auth.module';

@Module({
  imports: [
    SharedModule,
    forwardRef(() => AnalyticsModule),
    forwardRef(() => NatsModule),
    LiveKitModule,
    WajlcAuthModule,
  ],
  controllers: [],
  providers: [PollsService, RedisPollService, RedisLockService],
  exports: [PollsService],
})
export class PollsModule {}
