import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AssessmentPlanService } from './assessment-plan.service';
import {
  AcademyUpdateAssessmentPlanDTO,
} from '@workspace/schemas';

@Controller()
export class AssessmentPlanHandler {
  constructor(private readonly assessmentPlanService: AssessmentPlanService) {}

  @MessagePattern({ cmd: 'academy.assessmentPlan.findByCourseProfileId' })
  findByCourseProfileId(@Payload() data: { id: string }) {
    return this.assessmentPlanService.getPlanByCourseProfileId(data.id);
  }

  @MessagePattern({ cmd: 'academy.assessmentPlan.update' })
  update(@Payload() dto: AcademyUpdateAssessmentPlanDTO) {
    return this.assessmentPlanService.updatePlan(dto);
  }

  @MessagePattern({ cmd: 'academy.assessmentPlan.getLearnerStatus' })
  getLearnerStatus(@Payload() data: { userId: string; deliveryTargetId?: string; enrollmentId?: string }) {
    return this.assessmentPlanService.getLearnerAssessmentStatus(data);
  }
}
