import { Module } from '@nestjs/common';
import { NatsClientModule } from '@server/shared/nats/nats-client.module';
import { CertificateService } from './certificate.service';
import { CertificateListener } from './certificate.listener';
import { CertificateHandler } from './certificate.handler';

@Module({
  imports: [NatsClientModule],
  providers: [CertificateService],
  controllers: [CertificateListener, CertificateHandler],
  exports: [CertificateService],
})
export class CertificateModule {}

