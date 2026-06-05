import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule } from '@nestjs/config';
import { nkeyAuthenticator } from 'nats';
import { AppConfigService } from '../config/app-config.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'NATS_SERVICE',
        imports: [ConfigModule],
        useFactory: (appConfig: AppConfigService) => {
          const { url, nkeySeed } = appConfig.nats;

          const options: any = {
            servers: [url],
            queue: 'torii_queue',
          };

          if (nkeySeed) {
            options.authenticator = nkeyAuthenticator(
              new TextEncoder().encode(nkeySeed),
            );
          }

          return {
            transport: Transport.NATS,
            options,
          };
        },
        inject: [AppConfigService],
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class NatsClientModule {}
