import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { createNatsServiceConfig } from '@server/shared';
import { AgentsModule } from '@server/agents/agents.module';

async function bootstrap() {
  console.log('🚀 Agents Service starting...');

  // Create NATS microservice (connection only, no HTTP server)
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AgentsModule,
    createNatsServiceConfig('agents_queue'),
  );

  // Enable validation for NATS incoming messages
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Start Microservice
  await app.listen();
  console.log('📡 Agents Service NATS microservice listening');
}

bootstrap();
