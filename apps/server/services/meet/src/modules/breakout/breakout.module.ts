import { Module, forwardRef } from '@nestjs/common';
import { BreakoutService } from './breakout.service';
import { BreakoutNatsController } from '@server/meet/transport/nats/handlers/breakout.nats.controller';
import { SharedModule } from '@server/shared';
import { RoomModule } from '@server/meet/modules/room/room.module';
import { AnalyticsModule } from '@server/meet/modules/analytics/analytics.module';
import { LiveKitModule } from '@server/meet/infrastructure/livekit/livekit.module';
import { NatsModule } from '@server/meet/services/nats.module';

@Module({
  imports: [
    SharedModule,
    forwardRef(() => RoomModule),
    forwardRef(() => AnalyticsModule),
    LiveKitModule,
    forwardRef(() => NatsModule),
  ],
  controllers: [BreakoutNatsController],
  providers: [BreakoutService],
  exports: [BreakoutService],
})
export class BreakoutModule {}
