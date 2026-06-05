import { Module } from '@nestjs/common';
import { NatsClientModule } from '@server/shared';

// Controllers
import { AuthRoomController } from './controllers/auth-room.controller';
import { PollsController } from './controllers/polls.controller';
import {
  RoomController,
  RoomApiController,
} from './controllers/room.controller';
import { RoomAdminController } from './controllers/room-admin.controller';
import { UserRoomSettingController } from './controllers/user-room-setting.controller';
import { WaitingRoomController } from './controllers/waiting-room.controller';
import { WebhookController } from './controllers/webhook.controller';
import { FileController } from './controllers/file.controller';
import { ArtifactController } from './controllers/artifact.controller';
import { ArtifactsAdminController } from './controllers/artifacts-admin.controller';
import { BreakoutController } from './controllers/breakout.controller';
import { EtherpadController } from './controllers/etherpad.controller';
import { ExternalMediaController } from './controllers/external-media.controller';
import { RecordingController } from './controllers/recording.controller';
import { RecordingApiController } from './controllers/recording-api.controller';
import { RtmpController } from './controllers/rtmp.controller';
import { DownloadController } from './controllers/download.controller';
import { IngressController } from './controllers/ingress.controller';
import { InsightsController } from './controllers/insights.controller';
import { SpeechToTextController } from './controllers/speech-to-text.controller';

/**
 * Meet Module for Gateway
 * Handles all Meet service HTTP endpoints and routes to NATS
 */
@Module({
  imports: [NatsClientModule],
  controllers: [
    AuthRoomController,
    PollsController,
    RoomController,
    RoomApiController,
    RoomAdminController,
    UserRoomSettingController,
    WaitingRoomController,
    WebhookController,
    FileController,
    ArtifactController,
    ArtifactsAdminController,
    BreakoutController,
    EtherpadController,
    ExternalMediaController,
    RecordingController,
    RecordingApiController,
    RtmpController,
    DownloadController,
    IngressController,
    InsightsController,
    SpeechToTextController,
  ],
})
export class MeetModule {}
