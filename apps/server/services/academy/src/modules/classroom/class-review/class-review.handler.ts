import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ClassReviewService } from './class-review.service';
import type {
  ClassReviewCreateDto,
  ClassReviewUpdateDto,
  ClassReviewQueryDto,
  ClassReviewAdminQueryDto,
  ClassReviewModerateDto,
} from './dto/class-review.dto';

@Controller()
export class CourseReviewHandler {
  constructor(private readonly reviews: ClassReviewService) {}

  // ── Learner ─────────────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'academy.courseReview.listByLiveClass' })
  listByLiveClass(
    @Payload() data: { liveClassId: string; query: ClassReviewQueryDto },
  ) {
    return this.reviews.listCourseReviewsByLiveClass(
      data.liveClassId,
      data.query,
    );
  }

  @MessagePattern({ cmd: 'academy.courseReview.listByVodPackage' })
  listByVodPackage(
    @Payload() data: { vodPackageId: string; query: ClassReviewQueryDto },
  ) {
    return this.reviews.listCourseReviewsByVodPackage(
      data.vodPackageId,
      data.query,
    );
  }

  @MessagePattern({ cmd: 'academy.courseReview.listMine' })
  listMine(@Payload() data: { userId: string }) {
    return this.reviews.listMyReviews(data.userId);
  }

  @MessagePattern({ cmd: 'academy.courseReview.create' })
  create(
    @Payload()
    data: {
      userId: string;
      dto: ClassReviewCreateDto;
    },
  ) {
    return this.reviews.createReview(data.userId, data.dto);
  }

  @MessagePattern({ cmd: 'academy.courseReview.update' })
  update(
    @Payload()
    data: {
      id: string;
      userId: string;
      dto: ClassReviewUpdateDto;
      isAdmin?: boolean;
    },
  ) {
    return this.reviews.updateReview(
      data.id,
      data.userId,
      data.dto,
      data.isAdmin,
    );
  }

  @MessagePattern({ cmd: 'academy.courseReview.hide' })
  hide(@Payload() data: { id: string; userId: string }) {
    return this.reviews.hideReview(data.id, data.userId);
  }

  @MessagePattern({ cmd: 'academy.courseReview.delete' })
  delete(@Payload() data: { id: string; userId: string }) {
    return this.reviews.deleteReview(data.id, data.userId);
  }

  // ── Admin ────────────────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'academy.courseReview.adminList' })
  adminList(@Payload() query: ClassReviewAdminQueryDto) {
    return this.reviews.adminListReviews(query);
  }

  @MessagePattern({ cmd: 'academy.courseReview.moderate' })
  moderate(
    @Payload()
    data: {
      id: string;
      moderatorId: string;
      dto: ClassReviewModerateDto;
    },
  ) {
    return this.reviews.moderateReview(data.id, data.moderatorId, data.dto);
  }
}
