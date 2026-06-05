import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from '@server/shared/prisma/prisma.service';
import { Prisma } from '@prisma/generated';
import {
  AcademyCourseProfileCreateDTO,
  AcademyCourseProfileQueryDTO,
  AcademyCourseProfileUpdateDTO,
} from '@workspace/schemas';
import { AuditLoggerService } from '../audit-logger.service';

/**
 * CourseProfileService - The "Product" Layer
 *
 * BUSINESS LOGIC MANIFEST (Extreme Lean - Japanese Center Optimization):
 * 1. 1-to-1 Content Mapping: Each CourseProfile represents a single blueprint.
 *    Modules and Lessons are linked DIRECTLY to the CourseProfile.
 * 2. No Syllabus Entity: The Syllabus table has been removed to simplify the schema.
 * 3. Major Updates via Duplication: To create a new curriculum version (e.g., for a new year),
 *    use the `duplicate` method. This clones the Profile, Modules, and Lessons.
 * 4. Operational Clarity: Staff manages "Products" (CourseProfiles), not version IDs.
 * 5. Archive Policy: Archived profiles are immutable for new classes/sales but readable for old ones.
 */
@Injectable()
export class CourseProfileService {
  private readonly logger = new Logger(CourseProfileService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLoggerService,
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) { }

  private notifyRejected(payload: {
    recipientId: string;
    profileId: string;
    profileCode: string;
    profileTitle: string;
    reason: string;
  }) {
    this.natsClient.emit(
      { cmd: 'send_notification' },
      {
        recipientId: payload.recipientId,
        type: 'system',
        payload: {
          title: 'Yêu cầu của bạn đã bị từ chối',
          body: `Yêu cầu duyệt Course Profile ${payload.profileCode} đã bị từ chối.`,
          metadata: {
            entityType: 'COURSE_PROFILE',
            entityId: payload.profileId,
            code: payload.profileCode,
            title: payload.profileTitle,
            status: 'REJECTED',
            rejectionReason: payload.reason,
          },
        },
      },
    );
  }

  private notifyApproved(payload: {
    recipientId: string;
    profileId: string;
    profileCode: string;
    profileTitle: string;
  }) {
    this.natsClient.emit(
      { cmd: 'send_notification' },
      {
        recipientId: payload.recipientId,
        type: 'system',
        payload: {
          title: 'Yêu cầu của bạn đã được duyệt',
          body: `Yêu cầu duyệt Course Profile ${payload.profileCode} đã được duyệt.`,
          metadata: {
            entityType: 'COURSE_PROFILE',
            entityId: payload.profileId,
            code: payload.profileCode,
            title: payload.profileTitle,
            status: 'PUBLISHED',
          },
        },
      },
    );
  }

  async findAll(query: AcademyCourseProfileQueryDTO) {
    const andFilters: Prisma.CourseProfileWhereInput[] = [];

    if (query.level) {
      andFilters.push({ level: query.level });
    }

    if ((query as any).status) {
      andFilters.push({ status: (query as any).status });
    }

    if (query.q) {
      andFilters.push({
        OR: [
          { code: { contains: query.q, mode: 'insensitive' } },
          { title: { contains: query.q, mode: 'insensitive' } },
        ],
      });
    }

    const where: Prisma.CourseProfileWhereInput =
      andFilters.length > 0 ? { AND: andFilters } : {};

    return this.prisma.courseProfile.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async findById(id: string) {
    const item = await this.prisma.courseProfile.findUnique({
      where: { id },
      include: {
        modules: {
          include: {
            lessons: { orderBy: { orderIndex: 'asc' } },
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });
    if (!item) throw new NotFoundException('CourseProfile not found');
    return item;
  }

  async create(input: AcademyCourseProfileCreateDTO, requesterId?: string) {
    const exists = await this.prisma.courseProfile.findUnique({
      where: { code: input.code },
      select: { id: true },
    });
    if (exists)
      throw new BadRequestException('CourseProfile code already exists');

    const item = await this.prisma.courseProfile.create({
      data: {
        code: input.code,
        title: input.title,
        description: input.description ?? null,
        level: input.level ?? null,
        thumbnailUrl: input.thumbnailUrl ?? null,
        // CourseProfile không nên auto-PUBLISHED khi tạo mới (phải qua trạng thái duyệt theo workflow).
        status: (input as any).status ?? 'DRAFT',
      },
    });

    if (requesterId) {
      await this.audit.log({
        userId: requesterId,
        action: 'CREATE',
        entity: 'CourseProfile',
        entityId: item.id,
        description: `Create course profile ${item.code}`,
        newValues: item,
      });
    }

    return item;
  }

  async update(
    id: string,
    input: AcademyCourseProfileUpdateDTO,
    requesterId?: string,
  ) {
    const before = await this.prisma.courseProfile.findUnique({
      where: { id },
    });
    if (!before) throw new NotFoundException('CourseProfile not found');

    // Khi đã gửi duyệt hoặc đã publish (PUBLISHED), khóa chỉnh sửa để đảm bảo tính bất biến của curriculum.
    if (before.status !== 'DRAFT') {
      throw new BadRequestException(
        'Không thể chỉnh sửa CourseProfile khi khóa đã được duyệt (chỉ cho phép ở trạng thái DRAFT).',
      );
    }

    const item = await this.prisma.courseProfile.update({
      where: { id },
      data: {
        title: input.title ?? undefined,
        description: input.description ?? undefined,
        level: input.level ?? undefined,
        thumbnailUrl: input.thumbnailUrl ?? undefined,
        status: (input as any).status || undefined,
      },
    });

    if (requesterId) {
      await this.audit.log({
        userId: requesterId,
        action: 'UPDATE',
        entity: 'CourseProfile',
        entityId: id,
        description: `Update course profile ${before.code}`,
        oldValues: before,
        newValues: item,
      });
    }

    return item;
  }

  async submitForApproval(id: string, requesterId?: string) {
    const before = await this.prisma.courseProfile.findUnique({
      where: { id },
    });
    if (!before) throw new NotFoundException('CourseProfile not found');

    if (before.status !== 'DRAFT') {
      throw new BadRequestException(
        'Chỉ có CourseProfile ở trạng thái DRAFT mới có thể gửi duyệt.',
      );
    }

    const moduleCount = await this.prisma.module.count({
      where: { courseProfileId: id },
    });

    if (moduleCount === 0) {
      throw new BadRequestException(
        'Chương trình học trống. Vui lòng tạo ít nhất một module và thêm bài học trước khi gửi duyệt.',
      );
    }

    const emptyModule = await this.prisma.module.findFirst({
      where: {
        courseProfileId: id,
        lessons: { none: {} },
      },
      select: { title: true },
    });

    if (emptyModule) {
      throw new BadRequestException(
        `Bạn phải thêm bài học vào bên trong module trước khi gửi duyệt (không được để module trống).`,
      );
    }

    const item = await this.prisma.courseProfile.update({
      where: { id },
      data: {
        status: 'PENDING_APPROVAL',
        submittedForApprovalAt: new Date(),
        submittedBy: requesterId ?? undefined,
      },
    });

    if (requesterId) {
      await this.audit.log({
        userId: requesterId,
        action: 'SUBMIT_FOR_APPROVAL',
        entity: 'CourseProfile',
        entityId: id,
        description: `Submit course profile ${before.code} for approval`,
        oldValues: before,
        newValues: item,
      });
    }

    return item;
  }

  async approve(id: string, requesterId?: string) {
    const before = await this.prisma.courseProfile.findUnique({
      where: { id },
    });
    if (!before) throw new NotFoundException('CourseProfile not found');

    if (before.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException(
        'Chỉ có CourseProfile ở trạng thái PENDING_APPROVAL mới có thể được duyệt.',
      );
    }

    const item = await this.prisma.courseProfile.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        approvedAt: new Date(),
        approvedBy: requesterId ?? undefined,
      },
    });

    if (requesterId) {
      await this.audit.log({
        userId: requesterId,
        action: 'APPROVE',
        entity: 'CourseProfile',
        entityId: id,
        description: `Approve course profile ${before.code}`,
        oldValues: before,
        newValues: item,
      });
    }

    const recipientId = before.submittedBy;
    if (recipientId && recipientId !== requesterId) {
      try {
        this.notifyApproved({
          recipientId,
          profileId: item.id,
          profileCode: item.code,
          profileTitle: item.title,
        });
      } catch (error: any) {
        this.logger.warn(
          `Failed to send approve notification for course profile ${id}: ${error?.message || String(error)}`,
        );
      }
    }

    return item;
  }

  async reject(id: string, reason: string, requesterId?: string) {
    const before = await this.prisma.courseProfile.findUnique({
      where: { id },
    });
    if (!before) throw new NotFoundException('CourseProfile not found');

    if (before.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException(
        'Chỉ có CourseProfile ở trạng thái PENDING_APPROVAL mới có thể từ chối.',
      );
    }

    const item = await this.prisma.courseProfile.update({
      where: { id },
      data: {
        status: 'DRAFT',
      },
    });

    if (requesterId) {
      await this.audit.log({
        userId: requesterId,
        action: 'REJECT',
        entity: 'CourseProfile',
        entityId: id,
        description: `Rejected course profile ${before.code}. Reason: ${reason}`,
        oldValues: before,
        newValues: item,
        metadata: { reason },
      });
    }

    const recipientId = before.submittedBy;
    if (recipientId && recipientId !== requesterId) {
      try {
        this.notifyRejected({
          recipientId,
          profileId: item.id,
          profileCode: item.code,
          profileTitle: item.title,
          reason,
        });
      } catch (error: any) {
        this.logger.warn(
          `Failed to send reject notification for course profile ${id}: ${error?.message || String(error)}`,
        );
      }
    }

    return item;
  }

  /**
   * DUPLICATE - The "Yearly Update" Engine
   * Clones a CourseProfile and all its Modules/Lessons.
   */
  async duplicate(
    id: string,
    newCode: string,
    newTitle: string,
    requesterId?: string,
  ) {
    const source = await this.prisma.courseProfile.findUnique({
      where: { id },
      include: {
        modules: {
          include: {
            lessons: { orderBy: { orderIndex: 'asc' } },
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!source) throw new NotFoundException('Source CourseProfile not found');

    const exists = await this.prisma.courseProfile.findUnique({
      where: { code: newCode },
    });
    if (exists)
      throw new BadRequestException(`Course code ${newCode} already exists`);

    return this.prisma.$transaction(async (tx) => {
      // 1. Create New Profile
      const newProfile = await tx.courseProfile.create({
        data: {
          code: newCode,
          title: newTitle,
          description: source.description,
          level: source.level,
          thumbnailUrl: source.thumbnailUrl,
          status: 'DRAFT',
        },
      });

      // 2. Clone Modules and Lessons
      for (const mod of source.modules) {
        const newModule = await tx.module.create({
          data: {
            courseProfileId: newProfile.id,
            title: mod.title,
            orderIndex: mod.orderIndex,
          },
        });

        if (mod.lessons.length > 0) {
          await tx.lesson.createMany({
            data: mod.lessons.map((l) => ({
              moduleId: newModule.id,
              title: l.title,
              type: l.type,
              orderIndex: l.orderIndex,
              videoUrl: l.videoUrl,
              content: l.content,
            })),
          });
        }
      }

      if (requesterId) {
        await this.audit.log({
          userId: requesterId,
          action: 'DUPLICATE',
          entity: 'CourseProfile',
          entityId: newProfile.id,
          description: `Duplicated from ${source.code} to ${newCode}`,
          metadata: { sourceId: id, newCode },
        });
      }

      return newProfile;
    });
  }

  async archive(id: string, requesterId?: string) {
    const before = await this.prisma.courseProfile.findUnique({
      where: { id },
    });
    if (!before) throw new NotFoundException('CourseProfile not found');

    const item = await this.prisma.courseProfile.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    if (requesterId) {
      await this.audit.log({
        userId: requesterId,
        action: 'ARCHIVE',
        entity: 'CourseProfile',
        entityId: id,
        description: `Archived course profile ${before.code}`,
        oldValues: before,
        newValues: item,
      });
    }

    return item;
  }

  async delete(id: string, requesterId?: string) {
    const before = await this.prisma.courseProfile.findUnique({
      where: { id },
    });
    if (!before) throw new NotFoundException('CourseProfile not found');

    const [cohorts, vods, modules] = await this.prisma.$transaction([
      this.prisma.cohort.count({ where: { courseProfileId: id } }),
      this.prisma.vodPackage.count({ where: { courseProfileId: id } }),
      this.prisma.module.count({ where: { courseProfileId: id } }),
    ]);

    if (cohorts || vods || modules) {
      throw new BadRequestException(
        'Không thể xoá CourseProfile vì đã có dữ liệu liên quan.',
      );
    }

    await this.prisma.courseProfile.delete({ where: { id } });

    if (requesterId) {
      await this.audit.log({
        userId: requesterId,
        action: 'DELETE',
        entity: 'CourseProfile',
        entityId: id,
        description: `Delete course profile ${before.code}`,
        oldValues: before,
      });
    }

    return { ok: true };
  }
}
