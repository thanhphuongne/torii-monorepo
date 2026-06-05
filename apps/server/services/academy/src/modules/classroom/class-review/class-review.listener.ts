import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { PrismaService } from '@server/shared/prisma/prisma.service';

@Controller()
export class ClassReviewListener {
  private readonly logger = new Logger(ClassReviewListener.name);

  constructor(private readonly prisma: PrismaService) {}

  @EventPattern('enrollment.completed')
  async handleEnrollmentCompleted(@Payload() data: { enrollmentId: string }) {
    try {
      this.logger.log(
        `Enrollment ${data.enrollmentId} completed. Checking review eligibility...`,
      );

      const enrollment = await this.prisma.enrollment.findUnique({
        where: { id: data.enrollmentId },
        include: {
          liveClass: true,
          vodPackage: true,
          user: true,
        },
      });

      if (!enrollment) return;
      if (!enrollment.liveClass && !enrollment.vodPackage) return;

      // Check if a review already exists
      const existingReview = await this.prisma.courseReview.findUnique({
        where: { enrollmentId: data.enrollmentId },
      });

      if (existingReview) {
        this.logger.log(
          `Enrollment ${data.enrollmentId} already has a review. Ignoring.`,
        );
        return;
      }

      const targetName =
        enrollment.liveClass?.name || enrollment.vodPackage?.title || 'Unknown';
      this.logger.log(
        `[CTA] User ${enrollment.user.email} has completed ${targetName}. Should send review CTA.`,
      );
    } catch (error) {
      this.logger.error(
        `Error handling enrollment.completed for ${data.enrollmentId}`,
        error.stack,
      );
    }
  }
}
