import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CourseModuleCreateDto,
  CourseModuleService,
  CourseModuleUpdateDto,
} from './course-module.service';

/**
 * CourseModuleHandler - Exposed NATS handlers for Module operations.
 * These now point directly to CourseProfile-linked modules.
 */
@Controller()
export class CourseModuleHandler {
  constructor(private readonly modules: CourseModuleService) { }

  @MessagePattern({ cmd: 'academy.module.create' })
  create(
    @Payload()
    data: CourseModuleCreateDto & { requesterId?: string },
  ) {
    const { requesterId, ...input } = data;
    return this.modules.create(input, requesterId);
  }

  @MessagePattern({ cmd: 'academy.module.update' })
  update(
    @Payload()
    data: {
      id: string;
      input: CourseModuleUpdateDto;
      requesterId?: string;
    },
  ) {
    return this.modules.update(data.id, data.input, data.requesterId);
  }

  @MessagePattern({ cmd: 'academy.module.delete' })
  delete(@Payload() data: { id: string; requesterId?: string }) {
    return this.modules.delete(data.id, data.requesterId);
  }

  @MessagePattern({ cmd: 'academy.module.reorder' })
  reorder(
    @Payload()
    data: {
      courseProfileId: string;
      moduleIds: string[];
      requesterId?: string;
    },
  ) {
    return this.modules.reorder(
      data.courseProfileId,
      data.moduleIds,
      data.requesterId,
    );
  }
}
