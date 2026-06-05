import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AssignmentSubmissionService } from './assignment-submission.service';
import {
  AssignmentSubmissionCreateDto,
  AssignmentSubmissionQueryDto,
  AssignmentSubmissionUpdateDto,
} from './dto/assignment-submission.dto';

@Controller()
export class AssignmentSubmissionHandler {
  constructor(private readonly submissions: AssignmentSubmissionService) {}

  @MessagePattern({ cmd: 'academy.assignmentSubmission.findAll' })
  findAll(
    @Payload()
    data: AssignmentSubmissionQueryDto & {
      requesterId?: string;
      isExamManager?: boolean;
      canViewAll?: boolean;
    },
  ) {
    const { requesterId, isExamManager, canViewAll, ...query } = data;
    return this.submissions.findAll(
      query,
      requesterId,
      isExamManager,
      canViewAll,
    );
  }

  @MessagePattern({ cmd: 'academy.assignmentSubmission.findById' })
  findById(
    @Payload()
    data: {
      id: string;
      requesterId?: string;
      isExamManager?: boolean;
    },
  ) {
    return this.submissions.findById(
      data.id,
      data.requesterId,
      data.isExamManager,
    );
  }

  @MessagePattern({ cmd: 'academy.assignmentSubmission.create' })
  create(
    @Payload()
    data: AssignmentSubmissionCreateDto & {
      requesterId?: string;
      isExamManager?: boolean;
    },
  ) {
    const { requesterId, isExamManager, ...input } = data;
    return this.submissions.create(input, requesterId, isExamManager);
  }

  @MessagePattern({ cmd: 'academy.assignmentSubmission.update' })
  update(
    @Payload()
    data: {
      id: string;
      input: AssignmentSubmissionUpdateDto;
      requesterId?: string;
      isExamManager?: boolean;
    },
  ) {
    return this.submissions.update(
      data.id,
      data.input,
      data.requesterId,
      data.isExamManager,
    );
  }

  @MessagePattern({ cmd: 'academy.assignmentSubmission.delete' })
  delete(
    @Payload()
    data: {
      id: string;
      requesterId?: string;
      isExamManager?: boolean;
    },
  ) {
    return this.submissions.delete(
      data.id,
      data.requesterId,
      data.isExamManager,
    );
  }
}
