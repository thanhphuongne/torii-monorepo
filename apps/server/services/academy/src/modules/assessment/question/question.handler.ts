import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { QuestionService } from './question.service';
import {
  AcademyQuestionCreateDTO,
  AcademyQuestionUpdateDTO,
  AcademyQuestionQueryDTO,
} from '@workspace/schemas';

@Controller()
export class QuestionHandler {
  constructor(private readonly questionService: QuestionService) {}

  @MessagePattern({ cmd: 'academy.question.create' })
  create(@Payload() dto: AcademyQuestionCreateDTO) {
    return this.questionService.createQuestion(dto);
  }

  @MessagePattern({ cmd: 'academy.question.update' })
  update(@Payload() data: { id: string; dto: AcademyQuestionUpdateDTO }) {
    return this.questionService.updateQuestion(data.id, data.dto);
  }

  @MessagePattern({ cmd: 'academy.question.findAll' })
  findAll(@Payload() query: AcademyQuestionQueryDTO) {
    return this.questionService.findQuestions(query);
  }

  @MessagePattern({ cmd: 'academy.question.findById' })
  findById(@Payload() data: { id: string }) {
    return this.questionService.getQuestion(data.id);
  }

  @MessagePattern({ cmd: 'academy.question.delete' })
  delete(@Payload() data: { id: string }) {
    return this.questionService.deleteQuestion(data.id);
  }
}
