import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@server/shared/prisma/prisma.service';
import type { Prisma } from '@prisma/generated';
import { AuditLoggerService } from '../audit-logger.service';

export interface CourseModuleCreateDto {
  courseProfileId: string;
  title: string;
  orderIndex?: number;
}

export interface CourseModuleUpdateDto {
  title?: string;
  orderIndex?: number;
}

/**
 * CourseModuleService - Manages modules (chapters) directly linked to CourseProfile.
 * The Syllabus middleman has been removed to simplify management.
 */
@Injectable()
export class CourseModuleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLoggerService,
  ) { }

  async create(input: CourseModuleCreateDto, requesterId?: string) {
    const profile = await this.prisma.courseProfile.findUnique({
      where: { id: input.courseProfileId },
      select: {
        id: true,
        status: true,
        code: true,
      },
    });

    if (!profile) {
      throw new BadRequestException('Invalid courseProfileId');
    }

    if (profile.status !== 'DRAFT') {
      throw new BadRequestException(
        'Không thể thêm/chỉnh sửa Module khi CourseProfile chưa ở trạng thái DRAFT.',
      );
    }

    const nextOrder =
      input.orderIndex ??
      (await this.prisma.module.count({
        where: { courseProfileId: input.courseProfileId },
      })) + 1;

    const item = await this.prisma.module.create({
      data: {
        courseProfileId: input.courseProfileId,
        title: input.title,
        orderIndex: nextOrder,
      },
    });

    if (requesterId) {
      await this.audit.log({
        userId: requesterId,
        action: 'module.create',
        entity: 'Module',
        entityId: item.id,
        description: `Tạo module "${item.title}" trong CourseProfile ${profile.code}`,
        newValues: item,
      });
    }

    return item;
  }

  async update(id: string, input: CourseModuleUpdateDto, requesterId?: string) {
    const before = await this.prisma.module.findUnique({
      where: { id },
      include: {
        courseProfile: {
          select: { status: true, code: true },
        },
      },
    });

    if (!before) {
      throw new NotFoundException('Module not found');
    }

    if (before.courseProfile.status !== 'DRAFT') {
      throw new BadRequestException(
        'Không thể chỉnh sửa Module khi CourseProfile chưa ở trạng thái DRAFT.',
      );
    }

    const data: Prisma.ModuleUpdateInput = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.orderIndex !== undefined) data.orderIndex = input.orderIndex;

    const item = await this.prisma.module.update({
      where: { id },
      data,
    });

    if (requesterId) {
      await this.audit.log({
        userId: requesterId,
        action: 'module.update',
        entity: 'Module',
        entityId: id,
        description: `Cập nhật module "${before.title}" trong CourseProfile ${before.courseProfile.code}`,
        oldValues: before,
        newValues: item,
      });
    }

    return item;
  }

  async delete(id: string, requesterId?: string) {
    const before = await this.prisma.module.findUnique({
      where: { id },
      include: {
        courseProfile: {
          select: { status: true, code: true },
        },
        _count: { select: { lessons: true } },
      },
    });

    if (!before) {
      throw new NotFoundException('Module not found');
    }

    if (before.courseProfile.status !== 'DRAFT') {
      throw new BadRequestException(
        'Không thể xóa Module khi CourseProfile chưa ở trạng thái DRAFT.',
      );
    }

    await this.prisma.module.delete({ where: { id } });

    if (requesterId) {
      await this.audit.log({
        userId: requesterId,
        action: 'module.delete',
        entity: 'Module',
        entityId: id,
        description: `Xóa module "${before.title}" (bao gồm ${before._count.lessons} lessons) khỏi CourseProfile ${before.courseProfile.code}`,
        oldValues: before,
      });
    }
    return { ok: true };
  }

  async reorder(
    courseProfileId: string,
    moduleIds: string[],
    requesterId?: string,
  ) {
    const profile = await this.prisma.courseProfile.findUnique({
      where: { id: courseProfileId },
      select: { status: true, code: true },
    });
    if (!profile) throw new NotFoundException('CourseProfile not found');
    if (profile.status !== 'DRAFT') {
      throw new BadRequestException(
        'Chỉ có thể thay đổi thứ tự khi CourseProfile ở trạng thái DRAFT.',
      );
    }

    await this.prisma.$transaction([
      // Pass 1: Set temporary negative orderIndex to avoid unique constraint violation
      ...moduleIds.map((id, index) =>
        this.prisma.module.update({
          where: { id, courseProfileId },
          data: { orderIndex: -(index + 1) },
        }),
      ),
      // Pass 2: Set final positive orderIndex
      ...moduleIds.map((id, index) =>
        this.prisma.module.update({
          where: { id, courseProfileId },
          data: { orderIndex: index + 1 },
        }),
      ),
    ]);

    if (requesterId) {
      await this.audit.log({
        userId: requesterId,
        action: 'module.reorder',
        entity: 'Module',
        entityId: courseProfileId,
        description: `Thay đổi thứ tự các module trong CourseProfile ${profile.code}`,
        metadata: { moduleIds },
      });
    }

    return { ok: true };
  }
}
