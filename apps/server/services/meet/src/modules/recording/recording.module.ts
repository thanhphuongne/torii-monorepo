import { Module, forwardRef } from '@nestjs/common';
import { RecordingService } from './recording.service';
import { RecordingInfoService } from './recording-info.service';
import { SharedModule } from '@server/shared';
import { RoomModule } from '@server/meet/modules/room/room.module';
import { ArtifactsModule } from '@server/meet/modules/artifacts/artifacts.module';
import { AnalyticsModule } from '@server/meet/modules/analytics/analytics.module';
import { WebhookModule } from '@server/meet/infrastructure/webhook/webhook.module';

@Module({
  imports: [
    SharedModule,
    forwardRef(() => RoomModule),
    forwardRef(() => ArtifactsModule),
    forwardRef(() => AnalyticsModule),
    forwardRef(() => WebhookModule),
  ],
  providers: [RecordingService, RecordingInfoService],
  controllers: [],
  exports: [RecordingService, RecordingInfoService],
})
export class RecordingModule {}
