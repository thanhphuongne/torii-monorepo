import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { JlptMockService } from './jlpt-mock.service';
import {
  JlptMockAttemptNextSectionDto,
  JlptMockAttemptSaveAnswersDto,
  JlptMockAttemptStartDto,
  JlptMockAttemptSubmitDto,
  JlptMockAttachQuestionsDto,
  JlptMockExamTemplateCreateDto,
  JlptMockExamTemplateQueryDto,
  JlptMockExamTemplateUpdateDto,
} from './dto/jlpt-mock.dto';
import {
  JlptBankMondaiListQueryDto,
  JlptBankQuestionCreateDto,
  JlptBankQuestionQueryDto,
  JlptBankQuestionUpdateDto,
} from './dto/jlpt-bank.dto';
import {
  JlptMondaiCreateDto,
  JlptMondaiUpdateDto,
} from './dto/jlpt-mondai.dto';
import {
  JlptActiveScoringProfileQueryDto,
  JlptAssembleTemplateFromBankDto,
  JlptLevelConfigEnsureDto,
  JlptScoringMappingUpsertDto,
  JlptScoringProfileCreateDto,
} from './dto/jlpt-config.dto';

@Controller()
export class JlptMockHandler {
  constructor(private readonly jlpt: JlptMockService) {}

  // --- Learner ---

  @MessagePattern({ cmd: 'academy.jlptMock.template.findAll' })
  findAllTemplates(@Payload() query: JlptMockExamTemplateQueryDto) {
    return this.jlpt.findAllTemplates(query);
  }

  @MessagePattern({ cmd: 'academy.jlptMock.template.findById' })
  findTemplateById(@Payload() data: { id: string }) {
    return this.jlpt.findTemplateById(data.id);
  }

  @MessagePattern({ cmd: 'academy.jlptMock.attempt.start' })
  startAttempt(
    @Payload() data: JlptMockAttemptStartDto & { requesterId?: string },
  ) {
    const userId = data.userId ?? data.requesterId;
    return this.jlpt.startAttempt(data.templateId, userId);
  }

  @MessagePattern({ cmd: 'academy.jlptMock.attempt.saveAnswers' })
  saveAnswers(
    @Payload() data: JlptMockAttemptSaveAnswersDto & { requesterId?: string },
  ) {
    return this.jlpt.saveAnswers(
      data.attemptId,
      data.answers,
      data.requesterId,
    );
  }

  @MessagePattern({ cmd: 'academy.jlptMock.attempt.nextSection' })
  nextSection(
    @Payload() data: JlptMockAttemptNextSectionDto & { requesterId?: string },
  ) {
    return this.jlpt.nextSection(
      data.attemptId,
      data.currentSectionOrder,
      data.requesterId,
    );
  }

  @MessagePattern({ cmd: 'academy.jlptMock.attempt.submit' })
  submitAttempt(
    @Payload() data: JlptMockAttemptSubmitDto & { requesterId?: string },
  ) {
    return this.jlpt.submitAttempt(data.attemptId, data.requesterId);
  }

  @MessagePattern({ cmd: 'academy.jlptMock.attempt.result' })
  getAttemptResult(
    @Payload() data: { attemptId: string; requesterId?: string },
  ) {
    return this.jlpt.getAttemptResult(data.attemptId, data.requesterId);
  }

  @MessagePattern({ cmd: 'academy.jlptMock.attempt.findHistory' })
  findAttemptHistory(
    @Payload() data: { requesterId?: string; limit?: number },
  ) {
    if (!data.requesterId) return [];
    return this.jlpt.findAttemptHistory(data.requesterId, data.limit ?? 20);
  }

  @MessagePattern({ cmd: 'academy.jlptMock.attempt.answers' })
  getAttemptAnswers(
    @Payload() data: { attemptId: string; requesterId?: string },
  ) {
    return this.jlpt.getAttemptAnswers(data.attemptId, data.requesterId);
  }

  // --- Admin (minimal) ---

  @MessagePattern({ cmd: 'academy.jlptMock.config.level.list' })
  listLevels() {
    return this.jlpt.listLevels();
  }

  @MessagePattern({ cmd: 'academy.jlptMock.config.level.ensure' })
  ensureLevelConfig(
    @Payload() data: JlptLevelConfigEnsureDto & { requesterId?: string },
  ) {
    void data.requesterId;
    return this.jlpt.ensureLevelConfig(data);
  }

  @MessagePattern({ cmd: 'academy.jlptMock.config.scoringProfile.active' })
  getActiveScoringProfile(@Payload() query: JlptActiveScoringProfileQueryDto) {
    return this.jlpt.getActiveScoringProfile(query);
  }

  @MessagePattern({ cmd: 'academy.jlptMock.config.scoringProfile.create' })
  createScoringProfile(
    @Payload() data: JlptScoringProfileCreateDto & { requesterId?: string },
  ) {
    void data.requesterId;
    return this.jlpt.createScoringProfile(data);
  }

  @MessagePattern({ cmd: 'academy.jlptMock.config.level.sections.list' })
  listSectionsForLevel(
    @Payload()
    query: JlptActiveScoringProfileQueryDto & { requesterId?: string },
  ) {
    void (query as any).requesterId;
    return this.jlpt.listSectionsForLevel(query);
  }

  @MessagePattern({ cmd: 'academy.jlptMock.config.scoringMapping.upsert' })
  upsertScoringMappings(@Payload() data: JlptScoringMappingUpsertDto) {
    return this.jlpt.upsertScoringMappings(data);
  }

  @MessagePattern({ cmd: 'academy.jlptMock.config.scoringMapping.list' })
  listScoringMappings(
    @Payload() data: { profileId: string; requesterId?: string },
  ) {
    void data.requesterId;
    return this.jlpt.listScoringMappings(data.profileId);
  }

  @MessagePattern({ cmd: 'academy.jlptMock.template.create' })
  createTemplate(
    @Payload() data: JlptMockExamTemplateCreateDto & { requesterId?: string },
  ) {
    const { requesterId, ...input } = data;
    return this.jlpt.createTemplate(input, requesterId);
  }

  @MessagePattern({ cmd: 'academy.jlptMock.template.update' })
  updateTemplate(
    @Payload()
    data: {
      id: string;
      input: JlptMockExamTemplateUpdateDto;
      requesterId?: string;
    },
  ) {
    return this.jlpt.updateTemplate(data.id, data.input, data.requesterId);
  }

  @MessagePattern({ cmd: 'academy.jlptMock.template.delete' })
  deleteTemplate(@Payload() data: { id: string; requesterId?: string }) {
    void data.requesterId;
    return this.jlpt.deleteTemplate(data.id);
  }

  @MessagePattern({ cmd: 'academy.jlptMock.template.attachQuestions' })
  attachQuestions(
    @Payload() data: JlptMockAttachQuestionsDto & { requesterId?: string },
  ) {
    return this.jlpt.attachQuestions(
      data.templateId,
      data.items,
      data.requesterId,
    );
  }

  @MessagePattern({ cmd: 'academy.jlptMock.template.deleteQuestion' })
  deleteTemplateQuestion(@Payload() data: { id: string }) {
    return this.jlpt.deleteTemplateQuestion(data.id);
  }

  @MessagePattern({ cmd: 'academy.jlptMock.template.assembleFromBank' })
  assembleTemplateFromBank(
    @Payload() data: JlptAssembleTemplateFromBankDto & { requesterId?: string },
  ) {
    void data.requesterId;
    return this.jlpt.assembleTemplateFromBank(data);
  }

  // --- Admin: JLPT Question Bank (minimal CRUD) ---

  @MessagePattern({ cmd: 'academy.jlptMock.bankQuestion.findAll' })
  findAllBankQuestions(@Payload() query: JlptBankQuestionQueryDto) {
    return this.jlpt.findAllBankQuestions(query);
  }

  @MessagePattern({ cmd: 'academy.jlptMock.bankQuestion.findById' })
  findBankQuestionById(@Payload() data: { id: string }) {
    return this.jlpt.findBankQuestionById(data.id);
  }

  @MessagePattern({ cmd: 'academy.jlptMock.bankQuestion.mondaiList' })
  listMondaiForBankFilters(@Payload() query: JlptBankMondaiListQueryDto) {
    return this.jlpt.listMondaiForBankFilters(query);
  }

  @MessagePattern({ cmd: 'academy.jlptMock.bankQuestion.create' })
  createBankQuestion(
    @Payload() data: JlptBankQuestionCreateDto & { requesterId?: string },
  ) {
    const { requesterId, ...input } = data;
    return this.jlpt.createBankQuestion(input, requesterId);
  }

  @MessagePattern({ cmd: 'academy.jlptMock.bankQuestion.update' })
  updateBankQuestion(
    @Payload()
    data: {
      id: string;
      input: JlptBankQuestionUpdateDto;
      requesterId?: string;
    },
  ) {
    return this.jlpt.updateBankQuestion(data.id, data.input, data.requesterId);
  }

  @MessagePattern({ cmd: 'academy.jlptMock.bankQuestion.delete' })
  deleteBankQuestion(@Payload() data: { id: string }) {
    return this.jlpt.deleteBankQuestion(data.id);
  }

  @MessagePattern({ cmd: 'academy.jlptMock.mondai.create' })
  createMondai(
    @Payload() data: JlptMondaiCreateDto & { requesterId?: string },
  ) {
    const { requesterId, ...input } = data;
    void requesterId;
    return this.jlpt.createMondai(input);
  }

  @MessagePattern({ cmd: 'academy.jlptMock.mondai.update' })
  updateMondai(
    @Payload()
    data: {
      id: string;
      input: JlptMondaiUpdateDto;
      requesterId?: string;
    },
  ) {
    return this.jlpt.updateMondai(data.id, data.input);
  }

  @MessagePattern({ cmd: 'academy.jlptMock.mondai.delete' })
  deleteMondai(@Payload() data: { id: string; requesterId?: string }) {
    return this.jlpt.deleteMondai(data.id);
  }
}
