/**
 * Ingress Module
 */

import { Module, forwardRef } from '@nestjs/common';
import { IngressService } from './ingress.service';
import { LiveKitModule } from '@server/meet/infrastructure/livekit/livekit.module';
import { AnalyticsModule } from '@server/meet/modules/analytics/analytics.module';
import { NatsModule } from '@server/meet/services/nats.module';
import { IngressHandler } from '@server/meet/transport/nats/handlers/ingress.handler';

@Module({
  imports: [LiveKitModule, forwardRef(() => AnalyticsModule), NatsModule],
  controllers: [IngressHandler],
  providers: [IngressService],
  exports: [IngressService],
})
export class IngressModule {}
