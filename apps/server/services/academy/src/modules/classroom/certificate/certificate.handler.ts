import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CertificateService } from './certificate.service';

@Controller()
export class CertificateHandler {
  constructor(private readonly certificates: CertificateService) {}

  @MessagePattern({ cmd: 'academy.certificate.findAll' })
  findAll(@Payload() query: any) {
    return this.certificates.findAll(query);
  }

  @MessagePattern({ cmd: 'academy.certificate.findById' })
  findById(@Payload() data: { id: string }) {
    return this.certificates.findById(data.id);
  }

  @MessagePattern({ cmd: 'academy.certificate.findByUserId' })
  findByUserId(
    @Payload() data: { userId: string; page?: string; limit?: string },
  ) {
    return this.certificates.findAll({ ...data, userId: data.userId });
  }

  @MessagePattern({ cmd: 'academy.certificate.verify' })
  verify(@Payload() data: { code: string }) {
    return this.certificates.verifyByCode(data.code);
  }
}
