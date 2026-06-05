import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { EnrollmentService } from './enrollment.service';

@Controller()
export class EnrollmentHandler {
  constructor(private readonly enrollments: EnrollmentService) { }

  @MessagePattern({ cmd: 'academy.enrollment.getStats' })
  getStats(@Payload() data: { userId: string }) {
    return this.enrollments.getStatsForUser(data.userId);
  }

  @MessagePattern({ cmd: 'academy.enrollment.findAll' })
  findAll(@Payload() query: any) {
    return this.enrollments.findAll(query);
  }

  @MessagePattern({ cmd: 'academy.enrollment.findById' })
  findById(@Payload() data: { id: string }) {
    return this.enrollments.findById(data.id);
  }

  @MessagePattern({ cmd: 'academy.enrollment.create' })
  enroll(@Payload() data: any & { requesterId?: string }) {
    const { requesterId, ...input } = data;
    return this.enrollments.enroll(input, requesterId);
  }

  @MessagePattern({ cmd: 'academy.enrollment.cancel' })
  cancel(@Payload() data: { id: string; requesterId?: string }) {
    return this.enrollments.cancelEnrollment(data.id, data.requesterId);
  }

  @MessagePattern({ cmd: 'academy.enrollment.complete' })
  complete(@Payload() data: { id: string; requesterId?: string }) {
    return this.enrollments.completeEnrollment(data.id, data.requesterId);
  }

  /**
   * New explicit check command (no legacy aliases).
   * Prefer this over `academy.enrollment.check`.
   */
  @MessagePattern({ cmd: 'academy.enrollment.checkByTarget' })
  checkByTarget(
    @Payload()
    data: {
      userId: string;
      targetId: string;
      targetType: 'CLASS' | 'VOD_PACKAGE';
    },
  ) {
    return this.enrollments.checkEligibility(
      data.userId,
      data.targetId,
      data.targetType,
    );
  }

  @MessagePattern({ cmd: 'academy.enrollment.checkEligibility' })
  checkEligibility(
    @Payload()
    data: {
      userId: string;
      targetId: string;
      targetType: 'CLASS' | 'VOD_PACKAGE' | 'COURSE_PROFILE';
    },
  ) {
    return this.enrollments.checkEligibility(
      data.userId,
      data.targetId,
      data.targetType,
    );
  }

  @MessagePattern({ cmd: 'academy.enrollment.updateStatus' })
  updateStatus(
    @Payload()
    data: {
      id: string;
      status: string;
      requesterId?: string;
    },
  ) {
    return this.enrollments.updateStatus(data.id, data.status, data.requesterId);
  }

  @MessagePattern({ cmd: 'academy.enrollment.delete' })
  delete(@Payload() data: { id: string; requesterId?: string }) {
    return this.enrollments.delete(data.id, data.requesterId);
  }

  @MessagePattern({ cmd: 'academy.enrollment.trackLessonProgress' })
  trackLessonProgress(
    @Payload()
    data: {
      userId: string;
      targetId: string;
      lessonId: string;
    },
  ) {
    return this.enrollments.trackLessonProgress(data.userId, data.targetId, data.lessonId);
  }

  @MessagePattern({ cmd: 'academy.enrollment.getCompletedLessons' })
  getCompletedLessons(
    @Payload()
    data: {
      userId: string;
      targetId: string;
    },
  ) {
    return this.enrollments.getCompletedLessons(data.userId, data.targetId);
  }

  @MessagePattern({ cmd: 'academy.enrollment.checkGiftRecipient' })
  checkGiftRecipient(
    @Payload()
    data: {
      recipientEmail: string;
      courseId: string;
    },
  ) {
    return this.enrollments.checkGiftRecipient(data.recipientEmail, data.courseId);
  }
}
