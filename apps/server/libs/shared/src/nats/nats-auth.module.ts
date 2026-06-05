/**
 * NATS Auth Module
 * Handles LiveKit authentication callouts via NATS
 *
 * Only imported by the Gateway module
 * Listens for auth requests from LiveKit and validates tokens
 */

import { Module } from '@nestjs/common';
import { NatsAuthService } from './nats-auth.service';

@Module({
  providers: [NatsAuthService],
  exports: [NatsAuthService],
})
export class NatsAuthModule {}
