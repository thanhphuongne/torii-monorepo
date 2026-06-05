import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ExamService } from './exam.service';
import {
  AcademyExamCreateDTO,
  AcademyExamUpdateDTO,
  AcademyExamQueryDTO,
  AcademyExamAddQuestionsDTO,
} from '@workspace/schemas';

@Controller()
export class ExamHandler {
  constructor(private readonly examService: ExamService) {}

  @MessagePattern({ cmd: 'academy.exam.create' })
  create(@Payload() dto: AcademyExamCreateDTO) {
    return this.examService.createExam(dto);
  }

  @MessagePattern({ cmd: 'academy.exam.update' })
  update(@Payload() data: { id: string; dto: AcademyExamUpdateDTO }) {
    return this.examService.updateExam(data.id, data.dto);
  }

  @MessagePattern({ cmd: 'academy.exam.findAll' })
  findAll(@Payload() query: AcademyExamQueryDTO) {
    return this.examService.findExams(query);
  }

  @MessagePattern({ cmd: 'academy.exam.findById' })
  findById(@Payload() data: { id: string }) {
    return this.examService.getExamDetail(data.id);
  }

  @MessagePattern({ cmd: 'academy.exam.delete' })
  delete(@Payload() data: { id: string }) {
    return this.examService.deleteExam(data.id);
  }

  @MessagePattern({ cmd: 'academy.exam.addQuestions' })
  addQuestions(@Payload() dto: AcademyExamAddQuestionsDTO) {
    return this.examService.addQuestionsToSection(dto);
  }

  @MessagePattern({ cmd: 'academy.exam.removeQuestion' })
  removeQuestion(@Payload() data: { id: string }) {
    return this.examService.removeQuestionFromExam(data.id);
  }
}
