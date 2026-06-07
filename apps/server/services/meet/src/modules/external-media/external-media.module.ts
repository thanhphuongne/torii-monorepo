import { Module, forwardRef } from '@nestjs/common';
import { ExternalMediaService } from './external-media.service';
import { SharedModule } from '@server/shared';
import { RoomModule } from '@server/meet/modules/room/room.module';
import { AnalyticsModule } from '@server/meet/modules/analytics/analytics.module';

@Module({
  imports: [
    SharedModule,
    forwardRef(() => RoomModule),
    forwardRef(() => AnalyticsModule),
  ],
  controllers: [],
  providers: [ExternalMediaService],
  exports: [ExternalMediaService],
})
export class ExternalMediaModule {}
