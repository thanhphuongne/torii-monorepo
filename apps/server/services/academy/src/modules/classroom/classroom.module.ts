import { Module } from '@nestjs/common';
import { NatsClientModule } from '@server/shared';
import { LiveClassModule } from './live-class/live-class.module';
import { CohortModule } from './cohort/cohort.module';
import { VodPackageModule } from './vod-package/vod-package.module';
import { EnrollmentModule } from './enrollment/enrollment.module';

import { ClassroomCronService } from './classroom-cron.service';
import { LiveSessionReminderCronService } from './live-session-reminder-cron.service';
import { CertificateModule } from './certificate/certificate.module';
import { ClassReviewModule } from './class-review/class-review.module';
import { LiveScheduleModule } from './live-schedule/live-schedule.module';
import { ClassAttendanceModule } from './class-attendance/class-attendance.module';

@Module({
  imports: [
    NatsClientModule,
    LiveClassModule,
    CohortModule,
    VodPackageModule,
    LiveScheduleModule,
    EnrollmentModule,

    CertificateModule,
    ClassReviewModule,
    ClassAttendanceModule,
  ],
  providers: [ClassroomCronService, LiveSessionReminderCronService],
})
export class ClassroomModule {}
