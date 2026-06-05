import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@server/shared/prisma/prisma.service';

/**
 * Classroom Cron Service
 * Handles automatic status transitions based on dates:
 * 1. Expire active enrollments that have passed expiresAt
 * 2. When enrollmentCloseAt passes → Cohort: OPENING → COMPLETED (live classes keep OPENING)
 * 3. When endDate passes → LiveClasses: OPENING → COMPLETED
 */
@Injectable()
export class ClassroomCronService {
  private readonly logger = new Logger(ClassroomCronService.name);

  constructor(private readonly prisma: PrismaService) { }

  /**
   * Expire enrollments where expiresAt <= now (VOD time-limited access).
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleEnrollmentExpirations() {
    this.logger.log('Checking for enrollment expirations...');
    const now = new Date();

    const expired = await this.prisma.enrollment.updateMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { lte: now },
      },
      data: { status: 'EXPIRED' },
    });

    if (expired.count > 0) {
      this.logger.log(`Expired ${expired.count} enrollments`);
    }
  }

  /**
   * When enrollmentCloseAt passes → Cohort transitions from OPENING → COMPLETED.
   * Live classes linked to the cohort remain OPENING (class is ongoing, enrollment is closed).
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleCohortEnrollmentClose() {
    const now = new Date();

    const cohortsToClose = await this.prisma.cohort.findMany({
      where: {
        status: 'OPENING',
        enrollmentCloseAt: { lte: now },
      },
      select: { id: true, code: true },
    });

    if (cohortsToClose.length === 0) return;

    const cohortIds = cohortsToClose.map((c) => c.id);
    const cohortCodes = cohortsToClose.map((c) => c.code).join(', ');

    await this.prisma.cohort.updateMany({
      where: { id: { in: cohortIds } },
      data: { status: 'COMPLETED' },
    });

    // Transition live classes from OPENING → IN_PROGRESS (class is running, enrollment closed)
    const inProgressClasses = await this.prisma.liveClass.updateMany({
      where: {
        cohortId: { in: cohortIds },
        status: 'OPENING',
      },
      data: { status: 'IN_PROGRESS' },
    });

    this.logger.log(
      `Auto-completed ${cohortIds.length} cohorts (enrollment closed): [${cohortCodes}]. ${inProgressClasses.count} live classes → IN_PROGRESS.`,
    );
  }

  /**
   * When cohort endDate passes → Live classes transition from OPENING → COMPLETED.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleCohortCourseEnd() {
    const now = new Date();

    // Find cohorts (OPENING or COMPLETED) whose endDate has passed
    const endedCohorts = await this.prisma.cohort.findMany({
      where: {
        status: { in: ['OPENING', 'COMPLETED'] },
        endDate: { lte: now },
      },
      select: { id: true, code: true },
    });

    if (endedCohorts.length === 0) return;

    const cohortIds = endedCohorts.map((c) => c.id);
    const cohortCodes = endedCohorts.map((c) => c.code).join(', ');

    // Close any cohorts that are still OPENING but have passed endDate
    await this.prisma.cohort.updateMany({
      where: { id: { in: cohortIds }, status: 'OPENING' },
      data: { status: 'COMPLETED' },
    });

    // Complete all live classes that are OPENING or IN_PROGRESS
    const completedClasses = await this.prisma.liveClass.updateMany({
      where: {
        cohortId: { in: cohortIds },
        status: { in: ['OPENING', 'IN_PROGRESS'] },
      },
      data: { status: 'COMPLETED' },
    });

    this.logger.log(
      `Auto-completed ${completedClasses.count} live classes (cohort endDate reached): [${cohortCodes}]`,
    );
  }
}

