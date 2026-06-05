import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ExamAttemptService } from './exam-attempt.service';
import {
  AcademyExamAttemptStartDTO,
  AcademyExamAttemptSaveAnswersDTO,
  AcademyExamAttemptSubmitDTO,
  AcademyExamAttemptQueryDTO,
} from '@workspace/schemas';

@Controller()
export class ExamAttemptHandler {
  constructor(private readonly examAttemptService: ExamAttemptService) {}

  @MessagePattern({ cmd: 'academy.examAttempt.start' })
  start(@Payload() dto: AcademyExamAttemptStartDTO) {
    return this.examAttemptService.startAttempt(dto);
  }

  @MessagePattern({ cmd: 'academy.examAttempt.saveDraft' })
  saveDraft(@Payload() dto: AcademyExamAttemptSaveAnswersDTO) {
    return this.examAttemptService.saveDraft(dto);
  }

  @MessagePattern({ cmd: 'academy.examAttempt.submit' })
  submit(@Payload() dto: AcademyExamAttemptSubmitDTO) {
    return this.examAttemptService.submitAttempt(dto.attemptId);
  }

  @MessagePattern({ cmd: 'academy.examAttempt.findAll' })
  findAll(@Payload() query: AcademyExamAttemptQueryDTO) {
    return this.examAttemptService.findAll(query);
  }

  @MessagePattern({ cmd: 'academy.examAttempt.findById' })
  findById(@Payload() data: { id: string }) {
    return this.examAttemptService.getAttemptDetail(data.id);
  }
}
