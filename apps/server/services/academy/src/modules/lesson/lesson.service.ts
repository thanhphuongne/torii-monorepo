import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from '@server/shared/prisma/prisma.service';
import { LessonType } from '@prisma/generated';
import { AuditLoggerService } from '../audit-logger.service';

export interface LessonCreateDto {
  moduleId: string;
  type: 'VIDEO' | 'READING';
  title: string;
  orderIndex?: number;
  videoUrl?: string;
  content?: string;
}

export interface LessonUpdateDto {
  title?: string;
  type?: 'VIDEO' | 'READING';
  orderIndex?: number;
  videoUrl?: string;
  content?: string | null;
}

export interface LessonQueryDto {
  moduleId?: string;
  courseProfileId?: string;
  q?: string;
}

/**
 * LessonService - Manages actual learning content (Videos, Readings).
 * Refactored to link indirectly to CourseProfile via Module.
 */
@Injectable()
export class LessonService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLoggerService,
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) { }

  async findAll(query: LessonQueryDto) {
    const q = query.q?.trim();

    return this.prisma.lesson.findMany({
      where: {
        moduleId: query.moduleId ?? undefined,
        module: query.courseProfileId
          ? { courseProfileId: query.courseProfileId }
          : undefined,
        ...(q ? { title: { contains: q, mode: 'insensitive' } } : {}),
      },
      include: {
        module: {
          select: {
            id: true,
            title: true,
            courseProfileId: true,
            orderIndex: true,
          },
        },
      },
      orderBy: [{ module: { orderIndex: 'asc' } }, { orderIndex: 'asc' }],
    });
  }

  async findById(id: string) {
    const item = await this.prisma.lesson.findUnique({
      where: { id },
      include: {
        module: {
          select: { id: true, title: true, courseProfileId: true },
        },
      },
    });
    if (!item) throw new NotFoundException('Lesson not found');

    // --- SEQUENTIAL ASR TRIGGER ---
    // Khi người học (findById) truy cập video lần đầu, kích hoạt chuỗi bóc băng nếu chưa hoàn thành
    // Lưu ý: SenseiService sẽ tự động bỏ qua nếu đã có tiến trình bóc băng đang chạy (RAM Lock)
    if (item.type === 'VIDEO' && item.videoUrl && item.transcriptionStatus !== 'COMPLETED') {
      this.natsClient.emit(
        { cmd: 'agents.sensei.processTranscription' },
        { lessonId: item.id, chain: true },
      );
    }

    return item;
  }

  async create(input: LessonCreateDto, requesterId?: string) {
    const module = await this.prisma.module.findUnique({
      where: { id: input.moduleId },
      select: { id: true, courseProfile: { select: { status: true } } },
    });
    if (!module) throw new BadRequestException('Invalid moduleId');

    if (module.courseProfile.status !== 'DRAFT') {
      throw new BadRequestException(
        'Không thể thêm/chỉnh sửa Lesson khi CourseProfile chưa ở trạng thái DRAFT.',
      );
    }

    const nextOrder =
      input.orderIndex ??
      (await this.prisma.lesson.count({
        where: { moduleId: input.moduleId },
      })) + 1;

    const item = await this.prisma.lesson.create({
      data: {
        moduleId: input.moduleId,
        type: input.type as LessonType,
        title: input.title,
        orderIndex: nextOrder,
        videoUrl: input.videoUrl ?? null,
        content: input.content ?? null,
      },
    });

    if (requesterId) {
      await this.audit.log({
        userId: requesterId,
        action: 'lesson.create',
        entity: 'Lesson',
        entityId: item.id,
        description: `Created ${item.type} lesson "${item.title}" in module ${input.moduleId}`,
        newValues: item,
      });
    }

    return item;
  }

  async update(id: string, input: LessonUpdateDto, requesterId?: string) {
    const before = await this.findById(id);

    const module = await this.prisma.module.findUnique({
      where: { id: before.moduleId },
      select: { courseProfile: { select: { status: true } } },
    });
    if (module?.courseProfile.status !== 'DRAFT') {
      throw new BadRequestException(
        'Không thể chỉnh sửa Lesson khi CourseProfile chưa ở trạng thái DRAFT.',
      );
    }

    const item = await this.prisma.lesson.update({
      where: { id },
      data: {
        title: input.title ?? undefined,
        type: (input.type as LessonType) ?? undefined,
        orderIndex: input.orderIndex ?? undefined,
        videoUrl: input.videoUrl !== undefined ? input.videoUrl : undefined,
        content: input.content !== undefined ? input.content : undefined,
      },
    });

    if (requesterId) {
      await this.audit.log({
        userId: requesterId,
        action: 'lesson.update',
        entity: 'Lesson',
        entityId: id,
        description: `Updated lesson "${before.title}"`,
        oldValues: before,
        newValues: item,
      });
    }

    return item;
  }

  async delete(id: string, requesterId?: string) {
    const before = await this.findById(id);

    const module = await this.prisma.module.findUnique({
      where: { id: before.moduleId },
      select: { courseProfile: { select: { status: true } } },
    });
    if (module?.courseProfile.status !== 'DRAFT') {
      throw new BadRequestException(
        'Không thể xóa Lesson khi CourseProfile chưa ở trạng thái DRAFT.',
      );
    }

    await this.prisma.lesson.delete({ where: { id } });

    if (requesterId) {
      await this.audit.log({
        userId: requesterId,
        action: 'lesson.delete',
        entity: 'Lesson',
        entityId: id,
        description: `Deleted lesson "${before.title}"`,
        oldValues: before,
      });
    }
    return { ok: true };
  }

  async reorder(moduleId: string, lessonIds: string[], requesterId?: string) {
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      select: { courseProfile: { select: { status: true } } },
    });
    if (!module) throw new NotFoundException('Module not found');
    if (module.courseProfile.status !== 'DRAFT') {
      throw new BadRequestException(
        'Chỉ có thể thay đổi thứ tự khi CourseProfile ở trạng thái DRAFT.',
      );
    }

    await this.prisma.$transaction([
      // Pass 1: Set temporary negative orderIndex to avoid unique constraint violation
      ...lessonIds.map((id, index) =>
        this.prisma.lesson.update({
          where: { id, moduleId },
          data: { orderIndex: -(index + 1) },
        }),
      ),
      // Pass 2: Set final positive orderIndex
      ...lessonIds.map((id, index) =>
        this.prisma.lesson.update({
          where: { id, moduleId },
          data: { orderIndex: index + 1 },
        }),
      ),
    ]);

    if (requesterId) {
      await this.audit.log({
        userId: requesterId,
        action: 'lesson.reorder',
        entity: 'Lesson',
        entityId: moduleId,
        description: `Thay đổi thứ tự các bài học trong module ${moduleId}`,
        metadata: { lessonIds },
      });
    }

    return { ok: true };
  }
}
