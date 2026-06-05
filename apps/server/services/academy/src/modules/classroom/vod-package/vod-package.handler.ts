import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { VodPackageService } from './vod-package.service';

@Controller()
export class VodPackageHandler {
  constructor(private readonly service: VodPackageService) {}

  @MessagePattern({ cmd: 'academy.vod.findAll' })
  findAll(@Payload() query: any) {
    return this.service.findAll(query);
  }

  @MessagePattern({ cmd: 'academy.vod.findById' })
  findById(@Payload() data: { id: string }) {
    return this.service.findById(data.id);
  }

  @MessagePattern({ cmd: 'academy.vod.create' })
  create(@Payload() data: any) {
    return this.service.create(data);
  }

  @MessagePattern({ cmd: 'academy.vod.update' })
  update(
    @Payload() data: { id: string; input: any; requesterId?: string },
  ) {
    return this.service.update(data.id, data.input, data.requesterId);
  }

  @MessagePattern({ cmd: 'academy.vod.delete' })
  delete(@Payload() data: { id: string }) {
    return this.service.delete(data.id);
  }
}
