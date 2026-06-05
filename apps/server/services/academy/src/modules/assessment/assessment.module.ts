import { Module } from '@nestjs/common';
import { AssignmentSubmissionModule } from './assignment-submission/assignment-submission.module';
import { QuestionModule } from './question/question.module';
import { ExamModule } from './exam/exam.module';
import { ExamAttemptModule } from './exam-attempt/exam-attempt.module';
import { AssessmentPlanModule } from './assessment-plan/assessment-plan.module';

@Module({
  imports: [
    AssignmentSubmissionModule,
    QuestionModule,
    ExamModule,
    ExamAttemptModule,
    AssessmentPlanModule,
  ],
  exports: [
    QuestionModule,
    ExamModule,
    ExamAttemptModule,
    AssessmentPlanModule,
  ],
})
export class AssessmentModule {}
