/**
 * Ingress NATS Handler
 */

import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { IngressService } from '@server/meet/modules/ingress/ingress.service';
import { create } from '@bufbuild/protobuf';
import { CreateIngressReq, CommonResponseSchema } from '@workspace/protocol';

@Controller()
export class IngressHandler {
  private readonly logger = new Logger(IngressHandler.name);

  constructor(private readonly ingressService: IngressService) {}

  @MessagePattern({ cmd: 'ingress.create' })
  async handleCreateIngress(@Payload() data: CreateIngressReq): Promise<any> {
    try {
      return await this.ingressService.createIngress(data);
    } catch (error) {
      this.logger.error(`Error handling ingress.create: ${error.message}`);
      return create(CommonResponseSchema, {
        status: false,
        msg: error.message,
      });
    }
  }
}

