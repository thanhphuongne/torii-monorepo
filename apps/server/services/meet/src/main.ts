import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { createNatsServiceConfig } from '@server/shared';
import { MeetModule } from '@server/meet/meet.module';

async function bootstrap() {
  // Create NATS microservice (NATS-only mode - no HTTP server)
  const natsApp = await NestFactory.createMicroservice<MicroserviceOptions>(
    MeetModule,
    createNatsServiceConfig('meet_queue'),
  );

  await natsApp.listen();
  console.log('📡 Meet Service NATS microservice listening');
}

bootstrap();
