import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CourseProfileService } from './course-profile.service';
import type {
  AcademyCourseProfileCreateDTO,
  AcademyCourseProfileQueryDTO,
  AcademyCourseProfileUpdateDTO,
} from '@workspace/schemas';

/**
 * CourseProfileHandler - Exposed NATS handlers for Product (CourseProfile) operations.
 */
@Controller()
export class CourseProfileHandler {
  constructor(private readonly courseProfiles: CourseProfileService) {}

  @MessagePattern({ cmd: 'academy.courseProfile.findAll' })
  findAll(@Payload() query: AcademyCourseProfileQueryDTO) {
    return this.courseProfiles.findAll(query);
  }

  @MessagePattern({ cmd: 'academy.courseProfile.findById' })
  findById(@Payload() data: { id: string }) {
    return this.courseProfiles.findById(data.id);
  }

  @MessagePattern({ cmd: 'academy.courseProfile.create' })
  create(
    @Payload() data: AcademyCourseProfileCreateDTO & { requesterId?: string },
  ) {
    const { requesterId, ...input } = data;
    return this.courseProfiles.create(input, requesterId);
  }

  @MessagePattern({ cmd: 'academy.courseProfile.update' })
  update(
    @Payload()
    data: {
      id: string;
      input: AcademyCourseProfileUpdateDTO;
      requesterId?: string;
    },
  ) {
    return this.courseProfiles.update(data.id, data.input, data.requesterId);
  }

  @MessagePattern({ cmd: 'academy.courseProfile.submitForApproval' })
  submitForApproval(@Payload() data: { id: string; requesterId?: string }) {
    return this.courseProfiles.submitForApproval(data.id, data.requesterId);
  }

  @MessagePattern({ cmd: 'academy.courseProfile.approve' })
  approve(@Payload() data: { id: string; requesterId?: string }) {
    return this.courseProfiles.approve(data.id, data.requesterId);
  }

  @MessagePattern({ cmd: 'academy.courseProfile.reject' })
  reject(
    @Payload() data: { id: string; reason: string; requesterId?: string },
  ) {
    return this.courseProfiles.reject(data.id, data.reason, data.requesterId);
  }

  @MessagePattern({ cmd: 'academy.courseProfile.duplicate' })
  duplicate(
    @Payload()
    data: {
      id: string;
      newCode: string;
      newTitle: string;
      requesterId?: string;
    },
  ) {
    return this.courseProfiles.duplicate(
      data.id,
      data.newCode,
      data.newTitle,
      data.requesterId,
    );
  }

  @MessagePattern({ cmd: 'academy.courseProfile.archive' })
  archive(@Payload() data: { id: string; requesterId?: string }) {
    return this.courseProfiles.archive(data.id, data.requesterId);
  }

  @MessagePattern({ cmd: 'academy.courseProfile.delete' })
  delete(@Payload() data: { id: string; requesterId?: string }) {
    return this.courseProfiles.delete(data.id, data.requesterId);
  }
}
