import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { SharedModule, GlobalRpcExceptionFilter } from '@server/shared';

// Feature Modules
import { RoomModule } from '@server/meet/modules/room/room.module';
import { FileModule } from '@server/meet/modules/file/file.module';
import { ArtifactsModule } from '@server/meet/modules/artifacts/artifacts.module';
import { WebhookModule } from '@server/meet/infrastructure/webhook/webhook.module';
import { BreakoutModule } from '@server/meet/modules/breakout/breakout.module';
import { ExternalMediaModule } from '@server/meet/modules/external-media/external-media.module';
import { ExternalDisplayModule } from '@server/meet/modules/external-display/external-display.module';
import { RecordingModule } from '@server/meet/modules/recording/recording.module';
import { PollsModule } from '@server/meet/modules/polls/polls.module';
import { AnalyticsModule } from '@server/meet/modules/analytics/analytics.module';
import { IngressModule } from '@server/meet/modules/ingress/ingress.module';
import { InsightsModule } from '@server/meet/modules/insights/insights.module';
import { SpeechToTextModule } from '@server/meet/modules/speech-to-text/speech-to-text.module';
import { JanitorModule } from '@server/meet/modules/janitor/janitor.module';

@Module({
  imports: [
    SharedModule,
    RoomModule,
    FileModule,
    PollsModule,
    AnalyticsModule,
    BreakoutModule,
    ExternalMediaModule,
    ExternalDisplayModule,
    RecordingModule,
    ArtifactsModule,
    WebhookModule,
    IngressModule,
    InsightsModule,
    SpeechToTextModule,
    JanitorModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalRpcExceptionFilter,
    },
  ],
})
export class MeetModule {}
