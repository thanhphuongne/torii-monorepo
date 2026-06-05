import { Module } from '@nestjs/common';
import { AssessmentPlanService } from './assessment-plan.service';
import { AssessmentPlanHandler } from './assessment-plan.handler';

@Module({
  providers: [AssessmentPlanService],
  controllers: [AssessmentPlanHandler],
  exports: [AssessmentPlanService],
})
export class AssessmentPlanModule {}
