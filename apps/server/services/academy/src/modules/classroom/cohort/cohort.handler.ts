import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CohortService } from './cohort.service';

@Controller()
export class CohortHandler {
  constructor(private readonly service: CohortService) {}

  @MessagePattern({ cmd: 'academy.cohort.findAll' })
  findAll(@Payload() query: any) {
    return this.service.findAll(query);
  }

  @MessagePattern({ cmd: 'academy.cohort.findById' })
  findById(@Payload() data: { id: string }) {
    return this.service.findById(data.id);
  }

  @MessagePattern({ cmd: 'academy.cohort.findByIdPublic' })
  findByIdPublic(@Payload() data: { id: string }) {
    return this.service.findByIdPublic(data.id);
  }

  @MessagePattern({ cmd: 'academy.cohort.create' })
  create(@Payload() data: any) {
    return this.service.create(data);
  }

  @MessagePattern({ cmd: 'academy.cohort.update' })
  update(
    @Payload() data: { id: string; input: any; requesterId?: string },
  ) {
    return this.service.update(data.id, data.input, data.requesterId);
  }

  @MessagePattern({ cmd: 'academy.cohort.delete' })
  delete(@Payload() data: { id: string }) {
    return this.service.delete(data.id);
  }
}
