import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@server/shared/prisma/prisma.service';
import { LiveScheduleService } from '../live-schedule/live-schedule.service';
import {
  AcademyLiveClassCreateDTO,
  AcademyLiveClassUpdateDTO,
  AcademyLiveClassQueryDTO,
} from '@workspace/schemas';

@Injectable()
export class LiveClassService {
  constructor(
    private prisma: PrismaService,
    private liveSchedules: LiveScheduleService,
  ) { }

  async findAll(query: AcademyLiveClassQueryDTO) {
    const and: any[] = [];
    const q = query as any;

    if (query.cohortId) and.push({ cohortId: query.cohortId });
    if (query.status) and.push({ status: query.status });
    if (query.instructorId) and.push({ instructorId: query.instructorId });

    const cohortConditions: any[] = [];

    if (q.month) {
      const [year, month] = q.month.split('-').map(Number);
      const start = new Date(Date.UTC(year, month - 1, 1));
      const end = new Date(Date.UTC(year, month, 0, 23, 59, 59));
      cohortConditions.push({
        startDate: {
          gte: start,
          lte: end,
        },
      });
    }

    if (q.level) {
      cohortConditions.push({
        courseProfile: {
          level: q.level,
        },
      });
    }

    if (q.onlyAvailable) {
      const now = new Date();
      cohortConditions.push({
        status: 'OPENING',
        AND: [
          { OR: [{ enrollmentOpenAt: null }, { enrollmentOpenAt: { lte: now } }] },
          {
            OR: [
              { enrollmentCloseAt: null },
              { enrollmentCloseAt: { gte: now } },
            ],
          },
        ],
      });
    }

    if (q.upcomingRegistration) {
      const now = new Date();
      const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59);

      cohortConditions.push({
        AND: [
          {
            OR: [
              { enrollmentOpenAt: null },
              { enrollmentOpenAt: { lte: endOfNextMonth } },
            ],
          },
          {
            OR: [
              { enrollmentCloseAt: null },
              { enrollmentCloseAt: { gte: startOfThisMonth } },
            ],
          },
        ],
      });
    }

    if (q.courseProfileId) {
      cohortConditions.push({
        courseProfileId: q.courseProfileId,
      });
    }

    if (cohortConditions.length > 0) {
      and.push({ cohort: { AND: cohortConditions } });
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
      this.prisma.liveClass.findMany({
        where,
        include: {
          instructor: {
            select: { id: true, displayName: true, avatarUrl: true },
          },
          cohort: {
            include: {
              courseProfile: {
                select: {
                  id: true,
                  title: true,
                  thumbnailUrl: true,
                  level: true,
                  description: true,
                },
              },
            },
          },
          liveSchedules: true,
          _count: { select: { enrollments: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.liveClass.count({ where }),
    ]);
    return { items, total };
  }

  async findById(id: string) {
    const item = await this.prisma.liveClass.findUnique({
      where: { id },
      include: {
        instructor: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
        cohort: {
          include: {
            liveClasses: {
              select: {
                id: true,
                name: true,
                code: true,
                thumbnailUrl: true,
                price: true,
                discountPrice: true,
                maxStudents: true,
                _count: { select: { enrollments: { where: { status: 'ACTIVE' } } } },
              },
            },
            courseProfile: {
              include: {
                modules: { include: { lessons: true } },
              },
            },
          },
        },
        liveSchedules: true,
        _count: { select: { enrollments: true } },
      },
    });
    if (!item) throw new NotFoundException('Live Class not found');
    return item;
  }

  async create(data: AcademyLiveClassCreateDTO) {
    if (data.price != null && Number(data.price) <= 0) {
      throw new BadRequestException('Giá lớp LIVE phải lớn hơn 0.');
    }
    if (
      data.price != null &&
      data.discountPrice != null &&
      Number(data.discountPrice) >= Number(data.price)
    ) {
      throw new BadRequestException('Giá giảm phải nhỏ hơn giá gốc.');
    }

    const cohort = await this.prisma.cohort.findUnique({
      where: { id: data.cohortId },
      select: { id: true, status: true },
    });
    if (!cohort) {
      throw new BadRequestException('Invalid cohortId');
    }
    const cohortStatus = String(cohort.status);
    if (['COMPLETED', 'ARCHIVED'].includes(cohortStatus)) {
      throw new BadRequestException(
        `Không thể tạo lớp LIVE trong Cohort đã kết thúc/lưu trữ (status=${cohortStatus}).`,
      );
    }

    const dataWithSchedules = data as AcademyLiveClassCreateDTO & { schedules?: any[] };
    if (dataWithSchedules.schedules?.length) {
      for (const s of dataWithSchedules.schedules) {
        await this.liveSchedules.assertNoScheduleConflicts({
          cohortId: data.cohortId,
          weekday: s.weekday,
          startTime: s.startTime,
          endTime: s.endTime,
          instructorId: data.instructorId,
        });
      }
    }

    const klass = await this.prisma.liveClass.create({
      data: {
        cohortId: data.cohortId,
        code: data.code,
        name: data.name,
        instructorId: data.instructorId ?? null,
        maxStudents: data.maxStudents,
        status: (data.status as any) ?? 'DRAFT',
        price: data.price,
        discountPrice: data.discountPrice,
        thumbnailUrl: data.thumbnailUrl,
      },
    });

    if (dataWithSchedules.schedules?.length) {
      for (const s of dataWithSchedules.schedules) {
        await this.liveSchedules.create({
          liveClassId: klass.id,
          weekday: s.weekday,
          startTime: s.startTime,
          endTime: s.endTime,
        }, 'SYSTEM');
      }
    }

    return klass;
  }

  async update(id: string, data: AcademyLiveClassUpdateDTO) {
    const before = await this.prisma.liveClass.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Live Class not found');

    const nextPrice =
      data.price !== undefined ? Number(data.price) : Number(before.price ?? 0);
    const nextDiscountPrice =
      data.discountPrice !== undefined
        ? (data.discountPrice == null ? null : Number(data.discountPrice))
        : (before.discountPrice == null ? null : Number(before.discountPrice));

    if (data.price !== undefined && data.price != null && nextPrice <= 0) {
      throw new BadRequestException('Giá lớp LIVE phải lớn hơn 0.');
    }
    if (
      nextDiscountPrice != null &&
      Number.isFinite(nextPrice) &&
      nextPrice > 0 &&
      nextDiscountPrice >= nextPrice
    ) {
      throw new BadRequestException('Giá giảm phải nhỏ hơn giá gốc.');
    }

    // State-machine tối thiểu cho LiveClass:
    // - ARCHIVED là trạng thái cuối (immutable)
    // - Chỉ cho phép:
    //   DRAFT -> OPENING
    //   OPENING -> IN_PROGRESS | ARCHIVED
    //   IN_PROGRESS -> COMPLETED | ARCHIVED
    //   COMPLETED -> ARCHIVED
    // - Các cập nhật không đổi status vẫn cho phép
    if (data.status && data.status !== before.status) {
      if (before.status === 'ARCHIVED') {
        throw new BadRequestException(
          'Lớp LIVE đã được lưu trữ, không thể thay đổi trạng thái.',
        );
      }

      const from = before.status;
      const to = data.status;
      const allowed: Record<string, string[]> = {
        DRAFT: ['OPENING', 'ARCHIVED'],
        OPENING: ['IN_PROGRESS', 'ARCHIVED'],
        IN_PROGRESS: ['COMPLETED', 'ARCHIVED'],
        COMPLETED: ['ARCHIVED'],
      };

      const ok = (allowed[from] ?? []).includes(to);
      if (!ok) {
        throw new BadRequestException(
          `Không hỗ trợ chuyển trạng thái LiveClass từ ${from} sang ${to}.`,
        );
      }
    }

    if (data.status === 'OPENING') {
      await this.validateForPublishing(id);
    }

    return this.prisma.liveClass.update({
      where: { id },
      data: {
        code: data.code,
        name: data.name,
        status: data.status as any,
        instructorId: data.instructorId,
        maxStudents: data.maxStudents,
        price: data.price,
        discountPrice: data.discountPrice,
        thumbnailUrl: data.thumbnailUrl,
      },
    });
  }

  private async validateForPublishing(id: string) {
    const schedules = await this.prisma.liveSchedule.count({
      where: { liveClassId: id },
    });
    if (schedules === 0) {
      throw new BadRequestException(
        'Lớp LIVE cần có ít nhất 1 lịch học tuần trước khi xuất bản',
      );
    }
  }

  async delete(id: string) {
    await this.prisma.liveClass.delete({ where: { id } });
    return { ok: true };
  }

  async findAssignments(id: string) {
    return this.prisma.liveClassAssignment.findMany({
      where: {
        OR: [{ liveClassId: id }, { vodPackageId: id }],
      },
      include: { assignment: true, _count: { select: { submissions: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addAssignment(data: any) {
    let assignmentId = data.assignmentId;

    // 1. If no assignmentId, create a master Assignment content first
    if (!assignmentId && data.title && data.instructions) {
      const assignment = await this.prisma.assignment.create({
        data: {
          title: data.title,
          instructions: data.instructions,
        },
      });
      assignmentId = assignment.id;
    }

    if (!assignmentId) {
      throw new BadRequestException('assignmentId or title/instructions required');
    }

    // 2. Link the assignment
    return this.prisma.liveClassAssignment.create({
      data: {
        liveClassId: data.liveClassId,
        vodPackageId: data.vodPackageId,
        assignmentId,
        titleOverride: data.titleOverride,
        openAt: data.openAt,
        deadline: data.deadline,
      },
      include: { assignment: true },
    });
  }

  async getAssignmentById(id: string) {
    const item = await this.prisma.liveClassAssignment.findUnique({
      where: { id },
      include: { assignment: true },
    });
    if (!item) throw new NotFoundException('LiveClassAssignment not found');
    return item;
  }

  async updateAssignment(id: string, input: any) {
    const existing = await this.getAssignmentById(id);

    // Update the link details
    const updatedLink = await this.prisma.liveClassAssignment.update({
      where: { id },
      data: {
        titleOverride: input.titleOverride,
        openAt: input.openAt,
        deadline: input.deadline,
      },
      include: { assignment: true },
    });

    // If title or instructions are provided, update the underlying master Assignment
    if (input.title || input.instructions) {
      await this.prisma.assignment.update({
        where: { id: existing.assignmentId },
        data: {
          title: input.title,
          instructions: input.instructions,
        },
      });

      // Refresh to get updated assignment content
      return this.getAssignmentById(id);
    }

    return updatedLink;
  }

  async removeAssignment(id: string) {
    await this.prisma.liveClassAssignment.delete({ where: { id } });
    return { ok: true };
  }
}
