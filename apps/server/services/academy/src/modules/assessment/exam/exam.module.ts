import { Module } from '@nestjs/common';
import { ExamService } from './exam.service';
import { ExamHandler } from './exam.handler';

@Module({
  providers: [ExamService],
  controllers: [ExamHandler],
  exports: [ExamService],
})
export class ExamModule {}
