import { Module } from '@nestjs/common';
import { QuestionService } from './question.service';
import { QuestionHandler } from './question.handler';

@Module({
  providers: [QuestionService],
  controllers: [QuestionHandler],
  exports: [QuestionService],
})
export class QuestionModule {}
