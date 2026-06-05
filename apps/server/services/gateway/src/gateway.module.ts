import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import KeyvRedis from '@keyv/redis';
import {
  SharedModule,
  NatsAuthModule,
  NatsClientModule,
  AppConfigService,
} from '@server/shared';
import { ApiKeyGuard } from '@server/shared/guards/api-key.guard';

// Meet Module - Meet service routes via NATS
import { MeetModule } from './modules/meet/meet.module';
import { IdentityModule } from './modules/identity/identity.module';
import { StorageModule } from './modules/storage/storage.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AcademyModule } from './modules/academy/academy.module';
import { AgentsModule } from './modules/agents/agents.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { CommentModule } from './modules/comment/comment.module';

/**
 * API Gateway Module
 * Routes requests to microservices (HTTP proxy pattern)
 */
@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async (appConfig: AppConfigService) => {
        const { host, port, password } = appConfig.redis;
        const url = `redis://${password ? `:${password}@` : ''}${host}:${port}`;
        return {
          stores: [new KeyvRedis(url)],
        };
      },
      inject: [AppConfigService],
    }),

    NatsClientModule,
    SharedModule,
    NatsAuthModule, // Auth callout handler - only in Gateway

    // AI Module - AI Agents Service
    AgentsModule,

    // Analytics Module
    AnalyticsModule,
    // Meet Module - Handles Meet service routes via NATS
    MeetModule,
    // Identity Module - Handles Identity service routes via NATS
    IdentityModule,
    // Academy Module - New core LMS via NATS
    AcademyModule,
    // Gamification Module
    GamificationModule,
    // Storage Module
    StorageModule,

    // Comments
    CommentModule,
  ],
  controllers: [],
  providers: [ApiKeyGuard],
  exports: [],
})
export class GatewayModule {}
