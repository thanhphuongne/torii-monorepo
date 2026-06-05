import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@server/shared';
import {
  AcademyUpdateAssessmentPlanDTO,
  AcademyAssessmentStatusDTO,
  AcademyAssessmentKind,
} from '@workspace/schemas';

@Injectable()
export class AssessmentPlanService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlanByCourseProfileId(id: string) {
    return this.prisma.academyCourseProfileAssessment.findMany({
      where: { courseProfileId: id, isActive: true },
      include: {
        exam: {
          select: {
            title: true,
            examType: true,
          },
        },
      },
      orderBy: { orderIndex: 'asc' },
    });
  }

  async updatePlan(dto: AcademyUpdateAssessmentPlanDTO) {
    const { courseProfileId, items } = dto;
    
    return this.prisma.$transaction(async (tx) => {
      // For simplicity, we disable old ones and create new ones or update existing
      // Standard strategy: delete all then re-insert for the course profile
      await tx.academyCourseProfileAssessment.deleteMany({
        where: { courseProfileId },
      });

      return tx.academyCourseProfileAssessment.createMany({
        data: items.map((item) => {
          const kind = item.assessmentKind as AcademyAssessmentKind;
          return {
            courseProfileId,
            examId: item.examId,
            assessmentKind: kind as any,
            moduleId:
              kind === AcademyAssessmentKind.FINAL_EXAM ||
              kind === AcademyAssessmentKind.LESSON_CHECKPOINT
                ? null
                : item.moduleId,
            triggerLessonId: kind !== AcademyAssessmentKind.LESSON_CHECKPOINT ? null : item.triggerLessonId,
            orderIndex: item.orderIndex,
            isRequired: item.isRequired,
            isActive: item.isActive,
          };
        }),
      });
    });
  }

  async getLearnerAssessmentStatus(params: {
    userId: string;
    deliveryTargetId?: string;
    enrollmentId?: string;
  }): Promise<AcademyAssessmentStatusDTO[]> {
    const { userId, deliveryTargetId, enrollmentId } = params;

    // 1. Identify CourseProfile + enrollment scope (attempts must be per enrollment, not global per user+exam)
    let courseProfileId: string | undefined;
    let resolvedEnrollmentId: string | undefined;

    if (deliveryTargetId) {
      const cls = await this.prisma.liveClass.findUnique({
        where: { id: deliveryTargetId },
        include: { cohort: true },
      });
      if (cls) {
        courseProfileId = cls.cohort.courseProfileId;
      } else {
        const pkg = await this.prisma.vodPackage.findUnique({
          where: { id: deliveryTargetId },
        });
        if (!pkg) throw new NotFoundException('Live class or VOD package not found');
        courseProfileId = pkg.courseProfileId;
      }
    }

    if (enrollmentId) {
      const enr = await this.prisma.enrollment.findFirst({
        where: {
          id: enrollmentId,
          userId,
          ...(deliveryTargetId
            ? {
                OR: [
                  { vodPackageId: deliveryTargetId },
                  { liveClassId: deliveryTargetId },
                ],
              }
            : {}),
        },
        orderBy: { enrolledAt: 'desc' },
        include: {
          vodPackage: true,
          liveClass: { include: { cohort: true } },
        },
      });
      if (!enr) {
        throw deliveryTargetId
          ? new BadRequestException('Enrollment does not match this delivery target')
          : new NotFoundException('Enrollment not found');
      }
      resolvedEnrollmentId = enr.id;
      if (!courseProfileId) {
        courseProfileId =
          enr.vodPackage?.courseProfileId || enr.liveClass?.cohort.courseProfileId;
      }
    } else if (deliveryTargetId) {
      const enr = await this.prisma.enrollment.findFirst({
        where: {
          userId,
          OR: [
            { vodPackageId: deliveryTargetId },
            { liveClassId: deliveryTargetId },
          ],
        },
        orderBy: { enrolledAt: 'desc' },
      });
      resolvedEnrollmentId = enr?.id;
    }

    if (!deliveryTargetId && !enrollmentId) {
      throw new Error('Either deliveryTargetId or enrollmentId must be provided');
    }

    if (!courseProfileId) throw new NotFoundException('CourseProfile not found');

    // 2. Get Assessment Plan
    const plan = await this.getPlanByCourseProfileId(courseProfileId);

    // 3. Latest attempts for this enrollment only (avoids marking quiz done across different courses)
    const attempts =
      resolvedEnrollmentId && plan.length > 0
        ? await this.prisma.academyExamAttempt.findMany({
            where: {
              userId,
              enrollmentId: resolvedEnrollmentId,
              examId: { in: plan.map((p) => p.examId) },
            },
            orderBy: { startedAt: 'desc' },
          })
        : [];

    // 4. Resolve status for each milestone
    return plan.map((p) => {
      const latestAttempt = attempts.find((a) => a.examId === p.examId);
      let status: AcademyAssessmentStatusDTO['status'] = 'AVAILABLE';
      
      if (latestAttempt) {
        if (latestAttempt.status === ('SUBMITTED' as any)) {
          status = latestAttempt.isPassed ? 'PASSED' : 'FAILED';
        } else if (latestAttempt.status === ('IN_PROGRESS' as any)) {
          status = 'IN_PROGRESS';
        }
      }

      return {
        assessmentId: p.id,
        examId: p.examId,
        kind: p.assessmentKind as AcademyAssessmentKind,
        status,
        moduleId: p.moduleId ?? undefined,
        triggerLessonId: p.triggerLessonId ?? undefined,
        examTitle: p.exam?.title ?? undefined,
        latestAttemptId: latestAttempt?.id,
        score: latestAttempt?.score ? Number(latestAttempt.score) : undefined,
        percentage: latestAttempt?.percentage ? Number(latestAttempt.percentage) : undefined,
        isPassed: latestAttempt?.isPassed ?? undefined,
        isRequired: p.isRequired,
      };
    });
  }

  async canAccessLesson(params: {
    userId: string;
    lessonId: string;
    enrollmentId: string;
  }): Promise<{ allowed: boolean; reason?: string }> {
    const { userId, lessonId, enrollmentId } = params;

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: true },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');

    const courseProfileId = lesson.module.courseProfileId;

    const milestones = await this.prisma.academyCourseProfileAssessment.findMany({
      where: {
        courseProfileId,
        isActive: true,
        isRequired: true,
      },
      include: {
        triggerLesson: true,
        module: true,
      },
      orderBy: { orderIndex: 'asc' },
    });

    const pendingMilestones: any[] = [];
    for (const m of milestones) {
      if (m.assessmentKind === ('LESSON_CHECKPOINT' as any) && m.triggerLesson) {
        if (m.triggerLesson.orderIndex < lesson.orderIndex && m.moduleId === lesson.moduleId) {
          pendingMilestones.push(m);
        } else if (m.module!.orderIndex < lesson.module.orderIndex) {
          pendingMilestones.push(m);
        }
      } else if (m.assessmentKind === ('MODULE_CHECKPOINT' as any) && m.module) {
        if (m.module.orderIndex < lesson.module.orderIndex) {
          pendingMilestones.push(m);
        }
      }
    }

    if (pendingMilestones.length === 0) return { allowed: true };

    const attempts = await this.prisma.academyExamAttempt.findMany({
      where: {
        userId,
        enrollmentId,
        examId: { in: pendingMilestones.map((m) => m.examId) },
        status: 'SUBMITTED',
        isPassed: true,
      },
    });

    const passedExamIds = new Set(attempts.map((a) => a.examId));
    const blockingMilestone = pendingMilestones.find((m) => !passedExamIds.has(m.examId));

    if (blockingMilestone) {
      return {
        allowed: false,
        reason: 'Bạn cần hoàn thành bài kiểm tra trước khi tiếp tục bài học này.',
      };
    }

    return { allowed: true };
  }
}
