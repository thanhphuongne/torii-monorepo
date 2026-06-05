import { Module, forwardRef } from '@nestjs/common';
import { ExternalDisplayService } from './external-display.service';
import { ExternalDisplayNatsController } from '@server/meet/transport/nats/handlers/external-display.nats.controller';
import { AnalyticsModule } from '@server/meet/modules/analytics/analytics.module';
import { SharedModule } from '@server/shared';
import { RoomModule } from '@server/meet/modules/room/room.module';

@Module({
  imports: [
    forwardRef(() => AnalyticsModule),
    SharedModule,
    forwardRef(() => RoomModule),
  ],
  controllers: [ExternalDisplayNatsController],
  providers: [ExternalDisplayService],
  exports: [ExternalDisplayService],
})
export class ExternalDisplayModule {}
