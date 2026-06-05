import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { createNatsServiceConfig } from '@server/shared';
import { IdentityModule } from '@server/identity/identity.module';

async function bootstrap() {
  console.log('🚀 Identity Service starting...');

  // Create NATS microservice (connection only)
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    IdentityModule,
    createNatsServiceConfig('identity_queue'),
  );

  // Enable validation pipe for DTOs in NATS messages
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.listen();
  console.log('📡 Identity Service NATS microservice listening');
}

bootstrap();
