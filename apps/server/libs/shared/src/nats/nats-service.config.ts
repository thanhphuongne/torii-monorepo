/**
 * NATS Service Configuration
 * Provides configuration for NestJS NATS microservices
 *
 * Used by all microservices (room-service, ai-service, etc.) in their main.ts
 */

import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { nkeyAuthenticator } from 'nats';
import { loadConfig } from '../config/app.config';

/**
 * Creates NATS microservice configuration
 * Used in microservice main.ts files with NestFactory.createMicroservice()
 *
 * @param queue - Optional queue group name, defaults to 'torii_queue'
 * @returns MicroserviceOptions for Transport.NATS
 */
export function createNatsServiceConfig(
  queue: string = 'torii_queue',
): MicroserviceOptions {
  const config = loadConfig();
  const natsUrl = config.nats.url;
  const nkeySeed = config.nats.nkeySeed;

  const options: any = {
    servers: [natsUrl],
    queue: queue, // IMPORTANT: Queue group for load balancing across instances of the SAME service
  };

  // Add NKEY authentication if provided
  if (nkeySeed) {
    options.authenticator = nkeyAuthenticator(
      new TextEncoder().encode(nkeySeed),
    );
  }

  return {
    transport: Transport.NATS,
    options,
  };
}
