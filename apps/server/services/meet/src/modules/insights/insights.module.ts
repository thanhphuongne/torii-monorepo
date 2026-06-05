/**
 * Insights Module
 */

import { Module, forwardRef } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { InsightsService } from './insights.service';
import { RedisInsightsService } from '@server/meet/infrastructure/redis/redis-insights.service';
import { InsightsProviderService } from './insights.provider';
import { NatsModule } from '@server/meet/services/nats.module';
import { InsightsHandler } from '@server/meet/transport/nats/handlers/insights.handler';
import { ArtifactsModule } from '@server/meet/modules/artifacts/artifacts.module';
import { AnalyticsModule } from '@server/meet/modules/analytics/analytics.module';
import { AppConfigService } from '@server/shared';

@Module({
  imports: [
    NatsModule,
    forwardRef(() => ArtifactsModule),
    forwardRef(() => AnalyticsModule),
    ClientsModule.registerAsync([
      {
        name: 'NATS_CLIENT',
        imports: [],
        useFactory: (appConfig: AppConfigService) => ({
          transport: Transport.NATS,
          options: {
            servers: [appConfig.nats.url],
          },
        }),
        inject: [AppConfigService],
      },
    ]),
  ],
  controllers: [InsightsHandler],
  providers: [InsightsService, RedisInsightsService, InsightsProviderService],
  exports: [InsightsService, RedisInsightsService],
})
export class InsightsModule {}
