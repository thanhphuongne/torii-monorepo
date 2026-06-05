import { Module, Global } from '@nestjs/common';
import { RoomServiceClient, IngressClient } from 'livekit-server-sdk';
import { LiveKitService } from './livekit.service';
import {
  LIVEKIT_ROOM_SERVICE,
  LIVEKIT_INGRESS_CLIENT,
} from './livekit.constants';
import { AppConfigService } from '@server/shared';

@Global()
@Module({
  imports: [],
  providers: [
    {
      provide: LIVEKIT_ROOM_SERVICE,
      useFactory: (appConfig: AppConfigService) => {
        const { apiUrl, apiKey, apiSecret } = appConfig.livekit;
        return new RoomServiceClient(apiUrl, apiKey, apiSecret);
      },
      inject: [AppConfigService],
    },
    {
      provide: LIVEKIT_INGRESS_CLIENT,
      useFactory: (appConfig: AppConfigService) => {
        const { apiUrl, apiKey, apiSecret } = appConfig.livekit;
        return new IngressClient(apiUrl, apiKey, apiSecret);
      },
      inject: [AppConfigService],
    },
    LiveKitService,
  ],
  exports: [LiveKitService, LIVEKIT_ROOM_SERVICE, LIVEKIT_INGRESS_CLIENT],
})
export class LiveKitModule {}
