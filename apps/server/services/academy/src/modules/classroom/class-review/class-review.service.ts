import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@server/shared/prisma/prisma.service';
import { GamificationService } from '../../gamification/gamification.service';
import { AuditLoggerService } from '../../audit-logger.service';
import type {
  ClassReviewCreateDto,
  ClassReviewUpdateDto,
  ClassReviewQueryDto,
  ClassReviewAdminQueryDto,
  ClassReviewModerateDto,
} from './dto/class-review.dto';
import {
  ActivityType,
  GamificationCurrency,
  GamificationTransactionType,
} from '@prisma/generated';

@Injectable()
export class ClassReviewService {
  private readonly logger = new Logger(ClassReviewService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gamification: GamificationService,
    private readonly audit: AuditLoggerService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Public / Learner operations
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * List published reviews for a specific LIVE class.
   * Scope by enrollment.liveClassId to avoid sharing reviews across classes in the same cohort.
   */
  async listCourseReviewsByLiveClass(
    liveClassId: string,
    query: ClassReviewQueryDto,
  ) {
    const status = query.status ?? 'PUBLISHED';

    const [items, total] = await this.prisma.$transaction([
      this.prisma.courseReview.findMany({
        where: {
          status,
          enrollment: { liveClassId },
        },
        include: {
          user: {
            select: { id: true, displayName: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: Number(query.limit || 10),
        skip: Number(query.offset || 0),
      }),
      this.prisma.courseReview.count({
        where: {
          status,
          enrollment: { liveClassId },
        },
      }),
    ]);

    return {
      items: items.map((r) => this._maskAnonymous(r)),
      total,
      limit: query.limit,
      offset: query.offset,
    };
  }

  /**
   * List published reviews for a VOD package.
   */
  async listCourseReviewsByVodPackage(
    vodPackageId: string,
    query: ClassReviewQueryDto,
  ) {
    const status = query.status ?? 'PUBLISHED';

    const [items, total] = await this.prisma.$transaction([
      this.prisma.courseReview.findMany({
        where: {
          vodPackageId,
          status,
        },
        include: {
          user: {
            select: { id: true, displayName: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: Number(query.limit || 10),
        skip: Number(query.offset || 0),
      }),
      this.prisma.courseReview.count({
        where: {
          vodPackageId,
          status,
        },
      }),
    ]);

    return {
      items: items.map((r) => this._maskAnonymous(r)),
      total,
      limit: query.limit,
      offset: query.offset,
    };
  }

  /** Return all reviews belonging to the current user */
  async listMyReviews(userId: string) {
    const items = await this.prisma.courseReview.findMany({
      where: { userId },
      include: {
        user: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
        liveClass: {
          select: {
            id: true,
            name: true,
            cohort: {
              select: {
                courseProfile: {
                  select: { id: true, title: true, thumbnailUrl: true },
                },
              },
            },
          },
        },
        vodPackage: {
          select: {
            id: true,
            title: true,
            courseProfile: {
              select: { id: true, title: true, thumbnailUrl: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Map to unified structure for frontend to simplify UI logic
    return items.map((r) => {
      const unifiedClass = r.liveClass
        ? {
            id: r.liveClass.id,
            name: r.liveClass.name,
            courseProfile: r.liveClass.cohort?.courseProfile,
          }
        : r.vodPackage
          ? {
              id: r.vodPackage.id,
              name: r.vodPackage.title,
              courseProfile: r.vodPackage.courseProfile,
            }
          : null;

      const { liveClass, vodPackage, ...rest } = r;
      return {
        ...rest,
        class: unifiedClass,
      };
    });
  }

  /**
   * Create a review.
   * Validates: enrollment ownership, class match, eligibility status,
   * uniqueness per enrollment.
   */
  async createReview(userId: string, dto: ClassReviewCreateDto) {
    // 1. Fetch enrollment
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: dto.enrollmentId },
      include: {
        liveClass: { include: { cohort: true } },
        vodPackage: true,
      },
    });

    if (!enrollment) throw new NotFoundException('Enrollment not found');
    if (enrollment.userId !== userId) {
      throw new ForbiddenException('Enrollment does not belong to you');
    }

    // 2. Derive liveClassId or vodPackageId from enrollment
    const liveClassId = enrollment.liveClassId || null;
    const vodPackageId = enrollment.vodPackageId || null;
    const targetId = (liveClassId || vodPackageId) as string;

    if (!targetId) {
      throw new BadRequestException(
        'Enrollment is not attached to a liveClass or vodPackage',
      );
    }

    // 2b. Validate eligibility
    await this._validateEligibility({
      status: enrollment.status,
      targetId,
      userId: enrollment.userId,
      type: vodPackageId ? 'VOD' : 'LIVE_CLASS',
    });

    // 3. Ensure no existing review for this enrollment
    const existing = await this.prisma.courseReview.findUnique({
      where: { enrollmentId: dto.enrollmentId },
    });
    if (existing) {
      throw new BadRequestException(
        'REVIEW_ALREADY_EXISTS: A review already exists for this enrollment',
      );
    }

    // 4. Determine status (simple mode: auto PUBLISHED)
    const status = dto.rating <= 2 ? 'PENDING' : 'PUBLISHED';
    const publishedAt = status === 'PUBLISHED' ? new Date() : null;

    // 5. Create review
    const review = await this.prisma.courseReview.create({
      data: {
        liveClassId,
        vodPackageId,
        enrollmentId: dto.enrollmentId,
        userId,
        rating: dto.rating,
        title: dto.title,
        content: dto.content,
        isAnonymous: dto.isAnonymous ?? false,
        status,
        publishedAt,
      },
    });

    // 6. Award gamification points if review is immediately PUBLISHED
    if (status === 'PUBLISHED') {
      await this.gamification
        .trackActivity(userId, ActivityType.REVIEW, {
          reviewId: review.id,
          targetId: liveClassId || vodPackageId,
          enrollmentId: dto.enrollmentId,
          rating: dto.rating,
        })
        .catch((err) => {
          this.logger.error(
            `Failed to award gamification for review ${review.id}`,
            err,
          );
        });
    }

    return review;
  }

  /**
   * Update a review.
   * Only owner or admin can update.
   */
  async updateReview(
    id: string,
    userId: string,
    dto: ClassReviewUpdateDto,
    isAdmin = false,
  ) {
    const review = await this._findOrThrow(id);

    if (!isAdmin && review.userId !== userId) {
      throw new ForbiddenException('Not allowed to edit this review');
    }

    // Determine new status after edit
    let newStatus = review.status;
    if (review.status === 'REJECTED') {
      // Allow user to resubmit for moderation after editing
      newStatus = 'PENDING';
    } else if (review.status === 'HIDDEN' && review.userId === userId) {
      // If user soft-deleted, restore on edit
      newStatus = 'PUBLISHED';
    }

    const publishedAt =
      newStatus === 'PUBLISHED' && !review.publishedAt
        ? new Date()
        : review.publishedAt;

    return this.prisma.courseReview.update({
      where: { id },
      data: {
        rating: dto.rating,
        title: dto.title,
        content: dto.content,
        isAnonymous: dto.isAnonymous,
        status: newStatus,
        publishedAt,
      },
    });
  }

  /**
   * Soft-delete (hide) a review. Only owner can call this.
   */
  async hideReview(id: string, userId: string) {
    const review = await this._findOrThrow(id);
    if (review.userId !== userId) {
      throw new ForbiddenException('Not allowed to delete this review');
    }

    return this.prisma.courseReview.update({
      where: { id },
      data: { status: 'HIDDEN', publishedAt: null },
    });
  }

  /**
   * Hard-delete a review. Only owner can call this.
   *
   * NOTE: this removes the row entirely so the user can submit a new review
   * for the same enrollment later (unique constraint is on courseReview.enrollmentId).
   */
  async deleteReview(id: string, userId: string) {
    const review = await this._findOrThrow(id);
    if (review.userId !== userId) {
      throw new ForbiddenException('Not allowed to delete this review');
    }

    await this.audit.log({
      userId,
      action: 'delete',
      entity: 'class_review',
      entityId: id,
      description: `Review ${id} deleted`,
      metadata: { enrollmentId: review.enrollmentId },
    });

    return this.prisma.courseReview.delete({
      where: { id },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Admin operations
  // ─────────────────────────────────────────────────────────────────────────

  async adminListReviews(query: ClassReviewAdminQueryDto) {
    const where: any = {};
    if (query.liveClassId) where.liveClassId = query.liveClassId;
    if (query.vodPackageId) where.vodPackageId = query.vodPackageId;
    if (query.userId) where.userId = query.userId;
    if (query.status) where.status = query.status;
    if (query.rating) where.rating = query.rating;
    if (query.fromDate || query.toDate) {
      where.createdAt = {};
      if (query.fromDate) where.createdAt.gte = new Date(query.fromDate);
      if (query.toDate) where.createdAt.lte = new Date(query.toDate);
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.courseReview.findMany({
        where,
        include: {
          user: { select: { id: true, displayName: true, email: true } },
          liveClass: {
            select: {
              id: true,
              name: true,
              cohortId: true,
            },
          },
          vodPackage: {
            select: {
              id: true,
              title: true,
              courseProfileId: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: Number(query.limit || 20),
        skip: Number(query.offset || 0),
      }),
      this.prisma.courseReview.count({ where }),
    ]);

    return { items, total, limit: query.limit, offset: query.offset };
  }

  async moderateReview(
    id: string,
    moderatorId: string,
    dto: ClassReviewModerateDto,
  ) {
    const review = await this._findOrThrow(id);

    let newStatus: string;
    let publishedAt = review.publishedAt;

    switch (dto.action) {
      case 'publish':
        newStatus = 'PUBLISHED';
        if (!publishedAt) publishedAt = new Date();
        break;
      case 'hide':
        newStatus = 'HIDDEN';
        publishedAt = null;
        break;
      case 'reject':
        newStatus = 'REJECTED';
        publishedAt = null;
        break;
    }

    const updated = await this.prisma.courseReview.update({
      where: { id },
      data: {
        status: newStatus,
        publishedAt,
      },
    });

    // If review is being published for the first time (was PENDING), award gamification
    if (dto.action === 'publish' && review.status === 'PENDING') {
      await this.gamification
        .trackActivity(review.userId, ActivityType.REVIEW, {
          reviewId: review.id,
          targetId: review.liveClassId || review.vodPackageId,
          enrollmentId: review.enrollmentId,
          rating: review.rating,
        })
        .catch((err) => {
          this.logger.error(
            `Failed to award gamification for review ${review.id}`,
            err,
          );
        });
    }

    await this.audit.log({
      userId: moderatorId,
      action: `moderate.${dto.action}`,
      entity: 'class_review',
      entityId: id,
      description: `Review ${id} moderated: ${dto.action}${dto.reason ? ` – ${dto.reason}` : ''}`,
      metadata: { action: dto.action, reason: dto.reason },
    });

    return updated;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────────────

  private async _findOrThrow(id: string) {
    const review = await this.prisma.courseReview.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    return review;
  }

  private async _validateEligibility(enrollment: {
    status: string;
    targetId: string;
    userId: string;
    type: 'VOD' | 'LIVE_CLASS';
  }) {
    const VALID_STATUSES = ['ACTIVE', 'COMPLETED'];

    if (!VALID_STATUSES.includes(enrollment.status)) {
      throw new BadRequestException(
        'REVIEW_NOT_ELIGIBLE: Enrollment must be ACTIVE or COMPLETED',
      );
    }

    // For ACTIVE VOD enrollments: require ≥ 70% progress
    if (enrollment.status === 'ACTIVE' && enrollment.type === 'VOD') {
      const progressData = await this._getProgressPercent(
        enrollment.userId,
        enrollment.targetId,
      );
      if (progressData < 70) {
        throw new BadRequestException(
          'REVIEW_NOT_ELIGIBLE: Must complete at least 70% of lessons before reviewing',
        );
      }
    }
  }

  private async _getProgressPercent(
    userId: string,
    targetId: string,
  ): Promise<number> {
    const totalLessons = await this.prisma.lesson.count({
      where: {
        module: {
          courseProfile: {
            OR: [
              { cohorts: { some: { liveClasses: { some: { id: targetId } } } } },
              { vodPackages: { some: { id: targetId } } },
            ],
          },
        },
      },
    });
    if (totalLessons === 0) return 0;

    const completedLessons = await this.prisma.userLessonProgress.count({
      where: {
        userId,
        enrollment: {
          OR: [
            { liveClassId: targetId },
            { vodPackageId: targetId },
          ],
        },
        isCompleted: true,
      },
    });

    return Math.round((completedLessons / totalLessons) * 100);
  }

  private _maskAnonymous(review: any) {
    if (review.isAnonymous) {
      return {
        ...review,
        user: { id: null, displayName: 'Người học ẩn danh', avatarUrl: null },
      };
    }
    return review;
  }
}
