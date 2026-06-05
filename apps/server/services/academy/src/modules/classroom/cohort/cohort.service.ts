import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from '@server/shared/prisma/prisma.service';
import {
  AcademyCohortCreateDTO,
  AcademyCohortUpdateDTO,
  AcademyCohortQueryDTO,
} from '@workspace/schemas';
import { AuditLoggerService } from '../../audit-logger.service';

@Injectable()
export class CohortService {
  private readonly logger = new Logger(CohortService.name);

  constructor(
    private prisma: PrismaService,
    private readonly audit: AuditLoggerService,
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  private async resolveRejectRecipient(
    cohortId: string,
    reviewerId?: string,
  ): Promise<string | null> {
    const latestActor = await this.prisma.auditLog.findFirst({
      where: {
        entity: 'Cohort',
        entityId: cohortId,
        userId: reviewerId ? { not: reviewerId } : undefined,
      },
      orderBy: { createdAt: 'desc' },
      select: { userId: true },
    });
    return latestActor?.userId ?? null;
  }

  private notifyRejected(payload: {
    recipientId: string;
    cohortId: string;
    cohortCode: string;
    cohortName: string;
    reason?: string | null;
  }) {
    this.natsClient.emit(
      { cmd: 'send_notification' },
      {
        recipientId: payload.recipientId,
        type: 'system',
        payload: {
          title: 'Yêu cầu của bạn đã bị từ chối',
          body: `Yêu cầu duyệt Cohort ${payload.cohortCode} đã bị từ chối.`,
          metadata: {
            entityType: 'COHORT',
            entityId: payload.cohortId,
            code: payload.cohortCode,
            name: payload.cohortName,
            status: 'REJECTED',
            rejectionReason: payload.reason ?? '',
          },
        },
      },
    );
  }

  private notifyApproved(payload: {
    recipientId: string;
    cohortId: string;
    cohortCode: string;
    cohortName: string;
  }) {
    this.natsClient.emit(
      { cmd: 'send_notification' },
      {
        recipientId: payload.recipientId,
        type: 'system',
        payload: {
          title: 'Yêu cầu của bạn đã được duyệt',
          body: `Yêu cầu duyệt Cohort ${payload.cohortCode} đã được duyệt.`,
          metadata: {
            entityType: 'COHORT',
            entityId: payload.cohortId,
            code: payload.cohortCode,
            name: payload.cohortName,
            status: 'OPENING',
          },
        },
      },
    );
  }

  async findAll(query: AcademyCohortQueryDTO) {
    const and: any[] = [];
    if (query.courseProfileId) and.push({ courseProfileId: query.courseProfileId });
    if (query.status) and.push({ status: query.status });

    if (query.onlyAvailable) {
      const now = new Date();
      and.push({
        status: { notIn: ['DRAFT', 'PENDING_APPROVAL', 'COMPLETED', 'ARCHIVED'] },
        AND: [
          {
            OR: [
              { enrollmentOpenAt: null },
              { enrollmentOpenAt: { lte: now } },
            ],
          },
          {
            OR: [
              { enrollmentCloseAt: null },
              { enrollmentCloseAt: { gte: now } },
            ],
          },
        ],
      });
    }

    if (query.q) {
      and.push({
        OR: [
          { code: { contains: query.q, mode: 'insensitive' } },
          { name: { contains: query.q, mode: 'insensitive' } },
        ],
      });
    }

    const where = and.length > 0 ? { AND: and } : {};

    const [items, total] = await Promise.all([
      this.prisma.cohort.findMany({
        where,
        include: {
          courseProfile: { select: { id: true, title: true } },
          _count: { select: { liveClasses: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.cohort.count({ where }),
    ]);
    return { items, total };
  }

  async findById(id: string) {
    const item = await this.prisma.cohort.findUnique({
      where: { id },
      include: {
        courseProfile: { include: { modules: { include: { lessons: true } } } },
        liveClasses: {
          include: {
            instructor: { select: { id: true, displayName: true } },
            _count: { select: { enrollments: true } },
          },
        },
      },
    });
    if (!item) throw new NotFoundException('Cohort not found');
    return item;
  }

  async findByIdPublic(id: string) {
    const item = await this.prisma.cohort.findUnique({
      where: { id },
      select: {
        id: true,
        courseProfileId: true,
        code: true,
        name: true,
        status: true,
        rejectionReason: true,
        submittedForApprovalAt: true,
        enrollmentOpenAt: true,
        enrollmentCloseAt: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        updatedAt: true,
        courseProfile: {
          select: {
            id: true,
            code: true,
            title: true,
            description: true,
            level: true,
            thumbnailUrl: true,
            status: true,
            submittedForApprovalAt: true,
            submittedBy: true,
            approvedAt: true,
            approvedBy: true,
            createdAt: true,
            updatedAt: true,
            modules: {
              select: {
                id: true,
                courseProfileId: true,
                title: true,
                orderIndex: true,
                createdAt: true,
                updatedAt: true,
                lessons: {
                  select: {
                    id: true,
                    moduleId: true,
                    type: true,
                    title: true,
                    orderIndex: true,
                    createdAt: true,
                    updatedAt: true,
                  },
                },
              },
            },
          },
        },
        liveClasses: {
          select: {
            id: true,
            cohortId: true,
            code: true,
            name: true,
            status: true,
            instructorId: true,
            maxStudents: true,
            price: true,
            discountPrice: true,
            thumbnailUrl: true,
            createdAt: true,
            updatedAt: true,
            instructor: { select: { id: true, displayName: true } },
            _count: { select: { enrollments: true } },
          },
        },
      },
    });
    if (!item) throw new NotFoundException('Cohort not found');
    return item;
  }

  async create(data: AcademyCohortCreateDTO) {
    if (data.status === 'PENDING_APPROVAL') {
      throw new BadRequestException(
        'Không thể tạo Đợt khai giảng ở trạng thái Chờ duyệt ngay lập tức. Vui lòng tạo bản nháp và thêm lớp học trước.',
      );
    }

    return this.prisma.cohort.create({
      data: {
        courseProfileId: data.courseProfileId,
        code: data.code,
        name: data.name,
        enrollmentOpenAt: data.enrollmentOpenAt ? new Date(data.enrollmentOpenAt) : null,
        enrollmentCloseAt: data.enrollmentCloseAt ? new Date(data.enrollmentCloseAt) : null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        status: (data.status as any) ?? 'DRAFT',
        rejectionReason: (data as any).rejectionReason,
        submittedForApprovalAt:
          data.status === 'PENDING_APPROVAL' ? new Date() : undefined,
      },
    });
  }

  async update(
    id: string,
    data: AcademyCohortUpdateDTO,
    requesterId?: string,
  ) {
    const before = await this.prisma.cohort.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Cohort not found');

    // State-machine tối thiểu cho Cohort:
    // - ARCHIVED là trạng thái cuối (immutable)
    // - Chỉ cho phép:
    //   DRAFT -> PENDING_APPROVAL
    //   PENDING_APPROVAL -> OPENING (approve)
    //   PENDING_APPROVAL -> DRAFT (reject)
    //   OPENING -> COMPLETED | ARCHIVED
    //   COMPLETED -> ARCHIVED
    // - Các cập nhật không đổi status vẫn cho phép (ví dụ chỉnh metadata khi còn mutable)
    if (data.status && data.status !== before.status) {
      if (before.status === 'ARCHIVED') {
        throw new BadRequestException(
          'Đợt khai giảng đã được lưu trữ, không thể thay đổi trạng thái.',
        );
      }

      const from = before.status;
      const to = data.status;
      const allowed: Record<string, string[]> = {
        DRAFT: ['PENDING_APPROVAL', 'ARCHIVED'],
        PENDING_APPROVAL: ['OPENING', 'DRAFT', 'ARCHIVED'],
        OPENING: ['COMPLETED', 'ARCHIVED'],
        COMPLETED: ['ARCHIVED'],
      };

      const ok = (allowed[from] ?? []).includes(to);
      if (!ok) {
        throw new BadRequestException(
          `Không hỗ trợ chuyển trạng thái Cohort từ ${from} sang ${to}.`,
        );
      }
    }

    if (data.status === 'PENDING_APPROVAL' || data.status === 'OPENING') {
      await this.validateHasLiveClasses(id);
      await this.validateCourseProfilePublished(id);
    }

    const clearRejectionReason =
      data.status === 'PENDING_APPROVAL' || data.status === 'OPENING';

    const item = await this.prisma.cohort.update({
      where: { id },
      data: {
        code: data.code,
        name: data.name,
        status: data.status as any,
        ...(clearRejectionReason
          ? { rejectionReason: null }
          : (data as any).rejectionReason !== undefined
            ? { rejectionReason: (data as any).rejectionReason }
            : {}),
        submittedForApprovalAt:
          data.status === 'PENDING_APPROVAL' ? new Date() : undefined,
        enrollmentOpenAt: data.enrollmentOpenAt
          ? new Date(data.enrollmentOpenAt)
          : undefined,
        enrollmentCloseAt: data.enrollmentCloseAt
          ? new Date(data.enrollmentCloseAt)
          : undefined,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });

    if (
      requesterId &&
      data.status !== undefined &&
      data.status !== before.status
    ) {
      const action =
        data.status === 'OPENING' && before.status === 'PENDING_APPROVAL'
          ? 'APPROVE'
          : data.status === 'DRAFT' && before.status === 'PENDING_APPROVAL'
            ? 'REJECT'
            : 'UPDATE_STATUS';
      await this.audit.log({
        userId: requesterId,
        action,
        entity: 'Cohort',
        entityId: id,
        description: `${action} cohort ${before.code}`,
        oldValues: { status: before.status },
        newValues: { status: item.status },
        metadata:
          action === 'REJECT'
            ? { reason: (data as any).rejectionReason }
            : undefined,
      });
    }

    if (
      before.status === 'PENDING_APPROVAL' &&
      item.status === 'DRAFT' &&
      requesterId
    ) {
      try {
        const recipientId = await this.resolveRejectRecipient(id, requesterId);
        if (recipientId && recipientId !== requesterId) {
          this.notifyRejected({
            recipientId,
            cohortId: item.id,
            cohortCode: item.code,
            cohortName: item.name,
            reason: (data as any).rejectionReason ?? null,
          });
        }
      } catch (error: any) {
        this.logger.warn(
          `Failed to send reject notification for cohort ${id}: ${error?.message || String(error)}`,
        );
      }
    }

    if (
      before.status === 'PENDING_APPROVAL' &&
      item.status === 'OPENING' &&
      requesterId
    ) {
      try {
        const recipientId = await this.resolveRejectRecipient(id, requesterId);
        if (recipientId && recipientId !== requesterId) {
          this.notifyApproved({
            recipientId,
            cohortId: item.id,
            cohortCode: item.code,
            cohortName: item.name,
          });
        }
      } catch (error: any) {
        this.logger.warn(
          `Failed to send approve notification for cohort ${id}: ${error?.message || String(error)}`,
        );
      }
    }

    return item;
  }

  async delete(id: string) {
    await this.prisma.cohort.delete({ where: { id } });
    return { ok: true };
  }

  private async validateHasLiveClasses(id: string) {
    const classCount = await this.prisma.liveClass.count({
      where: { cohortId: id },
    });
    if (classCount === 0) {
      throw new BadRequestException(
        'Đợt khai giảng cần có ít nhất 1 Lớp học LIVE trước khi chuyển sang trạng thái này',
      );
    }
  }

  private async validateCourseProfilePublished(cohortId: string) {
    const cohort = await this.prisma.cohort.findUnique({
      where: { id: cohortId },
      include: { courseProfile: { select: { status: true } } },
    });
    if (!cohort) throw new NotFoundException('Cohort not found');
    if (cohort.courseProfile.status !== 'PUBLISHED') {
      throw new BadRequestException(
        'Hồ sơ nội dung (Course Profile) cần được xuất bản trước khi gửi duyệt hoặc mở đợt khai giảng.',
      );
    }
  }
}
