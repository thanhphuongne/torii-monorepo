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

// Local Client Proxy
import { LocalClientProxy } from './services/local-client-proxy.service';

// HTTP Controllers
import { WebhookController } from './controllers/webhook.controller';
import { WaitingRoomController } from './controllers/waiting-room.controller';
import { UserRoomSettingController } from './controllers/user-room-setting.controller';
import { SpeechToTextController } from './controllers/speech-to-text.controller';
import { RtmpController } from './controllers/rtmp.controller';
import { RoomController, RoomApiController } from './controllers/room.controller';
import { RoomAdminController } from './controllers/room-admin.controller';
import { RecordingController } from './controllers/recording.controller';
import { RecordingApiController } from './controllers/recording-api.controller';
import { PollsController } from './controllers/polls.controller';
import { InsightsController } from './controllers/insights.controller';
import { IngressController } from './controllers/ingress.controller';
import { FileController } from './controllers/file.controller';
import { ExternalMediaController } from './controllers/external-media.controller';
import { EtherpadController } from './controllers/etherpad.controller';
import { DownloadController } from './controllers/download.controller';
import { BreakoutController } from './controllers/breakout.controller';
import { AuthRoomController } from './controllers/auth-room.controller';
import { ArtifactsAdminController } from './controllers/artifacts-admin.controller';
import { ArtifactController } from './controllers/artifact.controller';

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
  controllers: [
    WebhookController,
    WaitingRoomController,
    UserRoomSettingController,
    SpeechToTextController,
    RtmpController,
    RoomController,
    RoomApiController,
    RoomAdminController,
    RecordingController,
    RecordingApiController,
    PollsController,
    InsightsController,
    IngressController,
    FileController,
    ExternalMediaController,
    EtherpadController,
    DownloadController,
    BreakoutController,
    AuthRoomController,
    ArtifactsAdminController,
    ArtifactController,
  ],
  providers: [
    LocalClientProxy,
    {
      provide: 'NATS_SERVICE',
      useClass: LocalClientProxy,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalRpcExceptionFilter,
    },
  ],
})
export class MeetModule {}
