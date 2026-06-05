import { Module } from '@nestjs/common';
import { ExamAttemptService } from './exam-attempt.service';
import { ExamAttemptHandler } from './exam-attempt.handler';
import { ExamModule } from '../exam/exam.module';

@Module({
  imports: [ExamModule],
  providers: [ExamAttemptService],
  controllers: [ExamAttemptHandler],
  exports: [ExamAttemptService],
})
export class ExamAttemptModule {}
