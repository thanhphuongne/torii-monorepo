import { Module } from '@nestjs/common';
import { NatsClientModule } from '@server/shared';
import { CourseProfileController } from './controllers/course-profile.controller';
import { CohortController } from './controllers/cohort.controller';
import { VodPackageController } from './controllers/vod-package.controller';
import { TicketController } from './controllers/ticket.controller';
import { LiveClassController } from './controllers/live-class.controller';
import { LiveScheduleController } from './controllers/live-schedule.controller';
import { AssignmentSubmissionController } from './controllers/assignment-submission.controller';
import { LessonController } from './controllers/lesson.controller';
import { BlogController } from './controllers/blog.controller';
import { EnrollmentController } from './controllers/enrollment.controller';
import { OrderController } from './controllers/order.controller';
import { CouponController } from './controllers/coupon.controller';
import { WebhookController } from './controllers/webhook.controller';
import { CourseReviewController } from './controllers/course-review.controller';
import { StudySetController } from './controllers/study-set.controller';
import {
  AcademyLiveSessionController,
  LiveSessionJoinController,
} from './controllers/live-session.controller';
import { LiveSessionRequestController } from './controllers/live-session-request.controller';
import { ClassAttendanceController } from './controllers/class-attendance.controller';
import { ModuleController } from './controllers/module.controller';
import { LiveClassAssignmentController } from './controllers/live-class-assignment.controller';
import { WalletController } from './controllers/wallet.controller';
import { CertificateController } from './controllers/certificate.controller';
import { RefundController } from './controllers/refund.controller';
import { JlptMockController } from './controllers/jlpt-mock.controller';
import { AcademyResourceController } from './controllers/academy-resource.controller';
import { AcademyExamController } from './controllers/academy-exam.controller';
import { AcademyQuestionController } from './controllers/academy-question.controller';
import { AcademyExamAttemptController } from './controllers/academy-exam-attempt.controller';
import { AcademyAssessmentPlanController } from './controllers/academy-assessment-plan.controller';

@Module({
  imports: [NatsClientModule],
  controllers: [
    CourseProfileController,
    CohortController,
    VodPackageController,
    TicketController,
    LiveClassController,
    LiveScheduleController,
    AssignmentSubmissionController,
    LessonController,
    BlogController,
    EnrollmentController,
    OrderController,
    CouponController,
    WebhookController,
    CourseReviewController,
    StudySetController,
    AcademyLiveSessionController,
    LiveSessionJoinController,
    LiveSessionRequestController,
    ClassAttendanceController,
    ModuleController,
    LiveClassAssignmentController,
    WalletController,
    CertificateController,
    RefundController,
    JlptMockController,
    AcademyResourceController,
    AcademyExamController,
    AcademyQuestionController,
    AcademyExamAttemptController,
    AcademyAssessmentPlanController,
  ],
})
export class AcademyModule {}
