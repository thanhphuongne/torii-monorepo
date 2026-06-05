import { Module } from '@nestjs/common';
import { PrismaModule } from '@server/shared/prisma/prisma.module';
import { ClassReviewService } from './class-review.service';
import { CourseReviewHandler } from './class-review.handler';
import { GamificationModule } from '../../gamification/gamification.module';
import { ClassReviewListener } from './class-review.listener';

@Module({
  imports: [PrismaModule, GamificationModule],
  providers: [ClassReviewService],
  controllers: [CourseReviewHandler, ClassReviewListener],
  exports: [ClassReviewService],
})
export class ClassReviewModule {}
