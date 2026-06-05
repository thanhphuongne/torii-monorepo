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
  AcademyVodPackageCreateDTO,
  AcademyVodPackageUpdateDTO,
  AcademyVodPackageQueryDTO,
} from '@workspace/schemas';
import { AuditLoggerService } from '../../audit-logger.service';

@Injectable()
export class VodPackageService {
  private readonly logger = new Logger(VodPackageService.name);

  constructor(
    private prisma: PrismaService,
    private readonly audit: AuditLoggerService,
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) { }

  private async resolveRejectRecipient(
    packageId: string,
    reviewerId?: string,
  ): Promise<string | null> {
    const latestActor = await this.prisma.auditLog.findFirst({
      where: {
        entity: 'VodPackage',
        entityId: packageId,
        userId: reviewerId ? { not: reviewerId } : undefined,
      },
      orderBy: { createdAt: 'desc' },
      select: { userId: true },
    });
    return latestActor?.userId ?? null;
  }

  private notifyRejected(payload: {
    recipientId: string;
    packageId: string;
    packageCode: string;
    packageTitle: string;
    reason?: string | null;
  }) {
    this.natsClient.emit(
      { cmd: 'send_notification' },
      {
        recipientId: payload.recipientId,
        type: 'system',
        payload: {
          title: 'Yêu cầu của bạn đã bị từ chối',
          body: `Yêu cầu duyệt VOD Package ${payload.packageCode} đã bị từ chối.`,
          metadata: {
            entityType: 'VOD_PACKAGE',
            entityId: payload.packageId,
            code: payload.packageCode,
            title: payload.packageTitle,
            status: 'REJECTED',
            rejectionReason: payload.reason ?? '',
          },
        },
      },
    );
  }

  private notifyApproved(payload: {
    recipientId: string;
    packageId: string;
    packageCode: string;
    packageTitle: string;
  }) {
    this.natsClient.emit(
      { cmd: 'send_notification' },
      {
        recipientId: payload.recipientId,
        type: 'system',
        payload: {
          title: 'Yêu cầu của bạn đã được duyệt',
          body: `Yêu cầu duyệt VOD Package ${payload.packageCode} đã được duyệt.`,
          metadata: {
            entityType: 'VOD_PACKAGE',
            entityId: payload.packageId,
            code: payload.packageCode,
            title: payload.packageTitle,
            status: 'PUBLISHED',
          },
        },
      },
    );
  }

  async findAll(query: AcademyVodPackageQueryDTO) {
    const queryAny = query as AcademyVodPackageQueryDTO & { instructorId?: string };
    const where: any = {};
    if (query.courseProfileId) where.courseProfileId = query.courseProfileId;
    if (queryAny.instructorId) where.instructorId = queryAny.instructorId;
    if (query.status) where.status = query.status;
    if ((query as any).level) {
      where.courseProfile = {
        ...where.courseProfile,
        level: (query as any).level,
      };
    }
    if (query.q) {
      where.OR = [
        { code: { contains: query.q, mode: 'insensitive' } },
        { title: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.vodPackage.findMany({
        where,
        include: {
          courseProfile: {
            select: { id: true, title: true, thumbnailUrl: true, level: true },
          },
          instructor: {
            select: { id: true, displayName: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.vodPackage.count({ where }),
    ]);
    return { items, total };
  }

  async findById(id: string) {
    const item = await this.prisma.vodPackage.findUnique({
      where: { id },
      include: {
        courseProfile: { include: { modules: { include: { lessons: true } } } },
        instructor: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
      },
    });
    if (!item) throw new NotFoundException('VOD Package not found');
    return item;
  }

  async create(data: AcademyVodPackageCreateDTO) {
    if (data.status === 'PUBLISHED') {
      await this.assertNoOtherPublishedPackages(data.courseProfileId);
    }

    return this.prisma.vodPackage.create({
      data: {
        courseProfileId: data.courseProfileId,
        code: data.code,
        title: data.title,
        price: data.price,
        discountPrice: data.discountPrice,
        status: (data.status as any) ?? 'DRAFT',
        rejectionReason: data.rejectionReason,
        instructorId: data.instructorId,
        thumbnailUrl: data.thumbnailUrl,
        submittedForApprovalAt:
          data.status === 'PENDING_APPROVAL' ? new Date() : undefined,
      },
    });
  }

  async update(
    id: string,
    data: AcademyVodPackageUpdateDTO,
    requesterId?: string,
  ) {
    const before = await this.prisma.vodPackage.findUnique({
      where: { id },
      include: { courseProfile: { select: { status: true } } },
    });
    if (!before) throw new NotFoundException('VOD Package not found');

    // State-machine tối thiểu cho VOD Package:
    // - Không cho "hạ nháp" sau khi đã PUBLISHED (đã công khai/mở bán).
    // - Khi đã ARCHIVED thì không cho đổi status nữa (chỉ đọc).
    if (data.status && data.status !== before.status) {
      if (before.status === 'ARCHIVED') {
        throw new BadRequestException(
          'Gói VOD đã được lưu trữ, không thể thay đổi trạng thái.',
        );
      }
      if (before.status === 'PUBLISHED' && data.status === 'DRAFT') {
        throw new BadRequestException(
          'Gói VOD đã được xuất bản, không thể hạ về bản nháp. Vui lòng dùng Lưu trữ nếu muốn ngừng bán.',
        );
      }
    }

    if (data.status === 'PUBLISHED') {
      await this.assertNoOtherPublishedPackages(before.courseProfileId, id);
    }

    if (data.status === 'PUBLISHED' || data.status === 'PENDING_APPROVAL') {
      if (before.courseProfile.status !== 'PUBLISHED') {
        throw new BadRequestException(
          'Hồ sơ nội dung (Course Profile) cần được xuất bản trước khi gửi duyệt hoặc xuất bản gói VOD',
        );
      }
    }

    const clearRejectionReason =
      data.status === 'PUBLISHED' || data.status === 'PENDING_APPROVAL';

    const item = await this.prisma.vodPackage.update({
      where: { id },
      data: {
        code: data.code,
        title: data.title,
        price: data.price,
        discountPrice: data.discountPrice,
        status: data.status as any,
        ...(clearRejectionReason
          ? { rejectionReason: null }
          : data.rejectionReason !== undefined
            ? { rejectionReason: data.rejectionReason }
            : {}),
        instructorId: data.instructorId,
        thumbnailUrl: data.thumbnailUrl,
        submittedForApprovalAt:
          data.status === 'PENDING_APPROVAL' ? new Date() : undefined,
      },
    });

    // --- TRIGGER AUTOMATIC TRANSCRIPTION ON PUBLISH ---
    if (data.status === 'PUBLISHED' && before.status !== 'PUBLISHED') {
      try {
        const lessons = await this.prisma.lesson.findMany({
          where: {
            module: {
              courseProfileId: before.courseProfileId,
            },
            type: 'VIDEO',
            videoUrl: { not: null, notIn: [''] },
          },
          select: { id: true },
        });

        if (lessons.length > 0) {
          this.logger.log(
            `🚀 Course published! Auto-triggering transcription for ${lessons.length} lessons in background...`,
          );
          lessons.forEach((lesson, index) => {
            // Stagger emissions by 2 seconds to avoid overwhelming the Gemini API rate limit
            setTimeout(() => {
              this.natsClient.emit(
                { cmd: 'agents.sensei.processTranscription' },
                { lessonId: lesson.id },
              );
            }, index * 3000);
          });
        }
      } catch (err: any) {
        this.logger.error(
          `Failed to auto-trigger transcriptions on publish: ${err.message}`,
        );
      }
    }

    if (
      requesterId &&
      data.status !== undefined &&
      data.status !== before.status
    ) {
      const action =
        data.status === 'PUBLISHED' && before.status === 'PENDING_APPROVAL'
          ? 'APPROVE'
          : data.status === 'DRAFT' && before.status === 'PENDING_APPROVAL'
            ? 'REJECT'
            : 'UPDATE_STATUS';
      await this.audit.log({
        userId: requesterId,
        action,
        entity: 'VodPackage',
        entityId: id,
        description: `${action} VOD package ${before.code}`,
        oldValues: { status: before.status },
        newValues: { status: item.status },
        metadata:
          action === 'REJECT'
            ? { reason: data.rejectionReason }
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
            packageId: item.id,
            packageCode: item.code,
            packageTitle: item.title,
            reason: data.rejectionReason ?? null,
          });
        }
      } catch (error: any) {
        this.logger.warn(
          `Failed to send reject notification for VOD package ${id}: ${error?.message || String(error)}`,
        );
      }
    }

    if (
      before.status === 'PENDING_APPROVAL' &&
      item.status === 'PUBLISHED' &&
      requesterId
    ) {
      try {
        const recipientId = await this.resolveRejectRecipient(id, requesterId);
        if (recipientId && recipientId !== requesterId) {
          this.notifyApproved({
            recipientId,
            packageId: item.id,
            packageCode: item.code,
            packageTitle: item.title,
          });
        }
      } catch (error: any) {
        this.logger.warn(
          `Failed to send approve notification for VOD package ${id}: ${error?.message || String(error)}`,
        );
      }
    }

    return item;
  }

  async delete(id: string) {
    await this.prisma.vodPackage.delete({ where: { id } });
    return { ok: true };
  }

  private async assertNoOtherPublishedPackages(
    courseProfileId: string,
    currentPackageId?: string,
  ) {
    const existing = await this.prisma.vodPackage.findFirst({
      where: {
        courseProfileId,
        status: 'PUBLISHED' as any,
        id: currentPackageId ? { not: currentPackageId } : undefined,
      },
      select: { id: true, code: true },
    });

    if (existing) {
      throw new BadRequestException(
        `Hồ sơ khóa học này đã có gói VOD được xuất bản (mã: ${existing.code}). Vui lòng gỡ xuất bản gói cũ trước khi xuất bản gói mới.`,
      );
    }
  }
}
