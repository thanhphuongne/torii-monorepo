import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from '@server/shared/prisma/prisma.service';

@Injectable()
export class CertificateService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('NATS_SERVICE') private readonly nats: ClientProxy,
  ) {}

  async generateForEnrollment(enrollmentId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        liveClass: {
          select: { id: true, code: true, name: true, cohort: { select: { courseProfileId: true } } },
        },
        vodPackage: {
          select: { id: true, code: true, title: true, courseProfileId: true },
        },
        user: {
          select: { id: true, displayName: true },
        },
      },
    });

    if (!enrollment) throw new NotFoundException('Enrollment not found');
    if (enrollment.status !== 'COMPLETED') {
      console.warn(
        `[Academy] Cannot generate certificate for non-completed enrollment: ${enrollmentId}`,
      );
      return;
    }

    const existing = await this.prisma.certificate.findUnique({
      where: { enrollmentId },
    });
    if (existing) return existing;

    // Calculate score (average of all required assessments)
    const courseProfileId = enrollment.vodPackage?.courseProfileId || enrollment.liveClass?.cohort.courseProfileId;
    let averageScore = 0;
    if (courseProfileId) {
      const assessments = await this.prisma.academyCourseProfileAssessment.findMany({
        where: { courseProfileId, isActive: true, isRequired: true },
        select: { examId: true },
      });
      const examIds = assessments.map(a => a.examId);
      
      if (examIds.length > 0) {
        const attempts = await this.prisma.academyExamAttempt.findMany({
          where: {
            userId: enrollment.userId,
            enrollmentId: enrollment.id,
            examId: { in: examIds },
          },
          orderBy: { startedAt: 'desc' },
          distinct: ['examId'],
          select: { percentage: true },
        });
        
        const sum = attempts.reduce((acc, curr) => acc + Number(curr.percentage || 0), 0);
        averageScore = attempts.length > 0 ? sum / attempts.length : 0;
      }
    }

    const classCode = enrollment.liveClass?.code || enrollment.vodPackage?.code || 'COURSE';
    const courseTitle = enrollment.liveClass?.name || enrollment.vodPackage?.title || 'Khóa học';
    const userPrefix = enrollment.user.id.substring(0, 8);
    const certificateCode =
      `CERT-${classCode}-${userPrefix}-${Date.now()}`.toUpperCase();

    const certificate = await this.prisma.certificate.create({
      data: {
        userId: enrollment.userId,
        liveClassId: enrollment.liveClassId,
        vodPackageId: enrollment.vodPackageId,
        enrollmentId: enrollment.id,
        certificateCode,
        issueDate: new Date(),
        score: averageScore,
        fileUrl: '', // TODO: integrate with PDF generation service later
      },
    });

    // Notify user
    try {
      this.nats.emit(
        { cmd: 'send_notification' },
        {
          recipientId: enrollment.userId,
          type: 'system',
          payload: {
            title: 'Chúc mừng! Bạn đã nhận được chứng chỉ mới 🎓',
            body: `Bạn đã hoàn thành khóa học "${courseTitle}" với điểm số trung bình là ${Math.round(averageScore)}%. Hãy kiểm tra tab Chứng chỉ để xem thành quả của mình.`,
            metadata: {
              certificateId: certificate.id,
              courseTitle,
              score: averageScore,
            },
          },
        },
      );
    } catch (err) {
      console.error(`[Academy] Failed to emit certificate notification: ${err.message}`);
    }

    return certificate;
  }

  async findByUserId(userId: string) {
    return this.prisma.certificate.findMany({
      where: { userId },
      include: {
        liveClass: true,
        enrollment: true,
      },
      orderBy: { issueDate: 'desc' },
    });
  }

  async findAll(query?: {
    page?: string | number;
    limit?: string | number;
    userId?: string;
    liveClassId?: string;
    vodPackageId?: string;
  }) {
    const page = Math.max(1, Number(query?.page ?? 1) || 1);
    const limit = Math.min(100, Math.max(1, Number(query?.limit ?? 20) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query?.userId) where.userId = query.userId;
    if (query?.liveClassId) where.liveClassId = query.liveClassId;
    if (query?.vodPackageId) where.vodPackageId = query.vodPackageId;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.certificate.findMany({
        where,
        include: {
          liveClass: true,
          vodPackage: true,
          enrollment: true,
          user: { select: { id: true, displayName: true, avatarUrl: true } },
        },
        orderBy: { issueDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.certificate.count({ where }),
    ]);

    return {
      data: items.map((item) => ({
        ...item,
        class: item.liveClass
          ? { id: item.liveClass.id, code: item.liveClass.code, name: item.liveClass.name }
          : item.vodPackage
          ? { id: item.vodPackage.id, code: item.vodPackage.code, name: item.vodPackage.title }
          : undefined,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findById(id: string) {
    const item = await this.prisma.certificate.findUnique({
      where: { id },
      include: { liveClass: true, vodPackage: true, user: true, enrollment: true },
    });
    if (!item) throw new NotFoundException('Certificate not found');
    return {
      ...item,
      class: item.liveClass
        ? { id: item.liveClass.id, code: item.liveClass.code, name: item.liveClass.name }
        : item.vodPackage
        ? { id: item.vodPackage.id, code: item.vodPackage.code, name: item.vodPackage.title }
        : undefined,
    };
  }

  async verifyByCode(code: string) {
    const item = await this.prisma.certificate.findUnique({
      where: { certificateCode: code },
      include: {
        liveClass: true,
        vodPackage: true,
        user: { select: { id: true, displayName: true, avatarUrl: true } },
        enrollment: true,
      },
    });
    if (!item) return { valid: false };
    const certWithClass = {
      ...item,
      class: item.liveClass
        ? { id: item.liveClass.id, code: item.liveClass.code, name: item.liveClass.name }
        : item.vodPackage
        ? { id: item.vodPackage.id, code: item.vodPackage.code, name: item.vodPackage.title }
        : undefined,
    };
    return { valid: true, certificate: certWithClass };
  }
}
