import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AutomapperModule } from '@automapper/nestjs';
import { pojos } from '@automapper/pojos';
import { ScheduleModule } from '@nestjs/schedule';
import { GlobalRpcExceptionFilter, SharedModule } from '@server/shared';
import { ClassroomModule } from '@server/academy/modules/classroom/classroom.module';
import { AssessmentModule } from '@server/academy/modules/assessment/assessment.module';
import { CommerceModule } from '@server/academy/modules/commerce/commerce.module';
import { TicketModule } from '@server/academy/modules/ticket/ticket.module';
import { StorageModule } from '@server/academy/modules/storage/storage.module';
import { BlogModule } from '@server/academy/modules/blog/blog.module';
import { GamificationModule } from '@server/academy/modules/gamification/gamification.module';
import { CourseProfileModule } from '@server/academy/modules/course-profile/course-profile.module';
import { JlptMockModule } from '@server/academy/modules/jlpt-mock/jlpt-mock.module';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { AuditModule } from './modules/audit.module';
import { StudySetModule } from './modules/study-set/study-set.module';
import { LessonModule } from './modules/lesson/lesson.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { ResourceModule } from './modules/resource/resource.module';
import { AnalyticsOverviewModule } from './modules/analytics/analytics-overview/analytics-overview.module';

@Module({
  imports: [
    AutomapperModule.forRoot({
      strategyInitializer: pojos(),
    }),
    ScheduleModule.forRoot(),
    SharedModule,
    AuditModule,
    ClassroomModule,
    AssessmentModule,
    CommerceModule,
    TicketModule,
    StorageModule,
    BlogModule,
    GamificationModule,
    CourseProfileModule,
    JlptMockModule,
    InfrastructureModule,
    StudySetModule,
    LessonModule,
    WalletModule,
    ResourceModule,
    AnalyticsOverviewModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalRpcExceptionFilter,
    },
  ],
})
export class AcademyModule {}
