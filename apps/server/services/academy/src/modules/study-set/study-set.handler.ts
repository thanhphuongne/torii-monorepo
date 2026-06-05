import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { StudySetService } from './study-set.service';
import {
  CreateStudySetDto,
  UpdateStudySetDto,
  CreateSetCardDto,
  UpdateSetCardDto,
  ReviewSetCardDto,
  ClonePublicStudySetDto,
  ShareStudySetDto,
} from './study-set.dto';

@Controller()
export class StudySetHandler {
  constructor(private readonly studySetService: StudySetService) { }

  @MessagePattern('academy.study-set.createSet')
  createSet(@Payload() payload: { userId: string; data: CreateStudySetDto }) {
    return this.studySetService.createSet(payload.userId, payload.data);
  }

  @MessagePattern('academy.study-set.findAllSets')
  findAllSets(@Payload() payload: { userId: string }) {
    return this.studySetService.findAllSets(payload.userId);
  }

  @MessagePattern('academy.study-set.findPublicCatalogSets')
  findPublicCatalogSets(@Payload() data: { q?: string }) {
    return this.studySetService.findPublicCatalogSets(data.q);
  }

  @MessagePattern('academy.study-set.findPublicCatalogSetById')
  findPublicCatalogSetById(@Payload() payload: { id: string }) {
    return this.studySetService.findPublicCatalogSetById(payload.id);
  }

  @MessagePattern('academy.study-set.adminFindSystemSets')
  adminFindSystemSets() {
    return this.studySetService.adminFindSystemSets();
  }

  @MessagePattern('academy.study-set.adminCreateSystemSet')
  adminCreateSystemSet(
    @Payload() payload: { requesterId: string; data: CreateStudySetDto },
  ) {
    return this.studySetService.adminCreateSystemSet(
      payload.requesterId,
      payload.data,
    );
  }

  @MessagePattern('academy.study-set.adminUpdateSystemSet')
  adminUpdateSystemSet(
    @Payload() payload: { id: string; data: UpdateStudySetDto },
  ) {
    return this.studySetService.adminUpdateSystemSet(payload.id, payload.data);
  }

  @MessagePattern('academy.study-set.adminDeleteSystemSet')
  adminDeleteSystemSet(@Payload() payload: { id: string }) {
    return this.studySetService.adminDeleteSystemSet(payload.id);
  }

  @MessagePattern('academy.study-set.adminFindSystemSetById')
  adminFindSystemSetById(@Payload() payload: { id: string }) {
    return this.studySetService.adminFindSystemSetById(payload.id);
  }

  @MessagePattern('academy.study-set.adminCreateCard')
  adminCreateCard(@Payload() payload: { setId: string; data: CreateSetCardDto }) {
    return this.studySetService.adminCreateCard(payload.setId, payload.data);
  }

  @MessagePattern('academy.study-set.adminUpdateCard')
  adminUpdateCard(@Payload() payload: { cardId: string; data: UpdateSetCardDto }) {
    return this.studySetService.adminUpdateCard(payload.cardId, payload.data);
  }

  @MessagePattern('academy.study-set.adminDeleteCard')
  adminDeleteCard(@Payload() payload: { cardId: string }) {
    return this.studySetService.adminDeleteCard(payload.cardId);
  }

  @MessagePattern('academy.study-set.clonePublicSetToUser')
  clonePublicSetToUser(
    @Payload() payload: { userId: string; data: ClonePublicStudySetDto },
  ) {
    return this.studySetService.clonePublicSetToUser(
      payload.userId,
      payload.data,
    );
  }

  @MessagePattern('academy.study-set.findSetById')
  findSetById(@Payload() payload: { id: string; userId: string }) {
    return this.studySetService.findSetById(payload.id, payload.userId);
  }

  @MessagePattern('academy.study-set.updateSharing')
  updateSharing(
    @Payload() payload: { id: string; userId: string; data: ShareStudySetDto },
  ) {
    return this.studySetService.updateSharing(
      payload.id,
      payload.userId,
      payload.data,
    );
  }

  @MessagePattern('academy.study-set.findPublicSharedSetByToken')
  findPublicSharedSetByToken(@Payload() payload: { token: string }) {
    return this.studySetService.findPublicSharedSetByToken(payload.token);
  }

  @MessagePattern('academy.study-set.updateSet')
  updateSet(
    @Payload() payload: { id: string; userId: string; data: UpdateStudySetDto },
  ) {
    return this.studySetService.updateSet(
      payload.id,
      payload.userId,
      payload.data,
    );
  }

  @MessagePattern('academy.study-set.deleteSet')
  deleteSet(@Payload() payload: { id: string; userId: string }) {
    return this.studySetService.deleteSet(payload.id, payload.userId);
  }

  @MessagePattern('academy.study-set.createCard')
  createCard(
    @Payload()
    payload: {
      setId: string;
      userId: string;
      data: CreateSetCardDto;
    },
  ) {
    return this.studySetService.createCard(
      payload.setId,
      payload.userId,
      payload.data,
    );
  }

  @MessagePattern('academy.study-set.updateCard')
  updateCard(
    @Payload()
    payload: {
      cardId: string;
      userId: string;
      data: UpdateSetCardDto;
    },
  ) {
    return this.studySetService.updateCard(
      payload.cardId,
      payload.userId,
      payload.data,
    );
  }

  @MessagePattern('academy.study-set.deleteCard')
  deleteCard(@Payload() payload: { cardId: string; userId: string }) {
    return this.studySetService.deleteCard(payload.cardId, payload.userId);
  }

  @MessagePattern('academy.study-set.getStudyCards')
  getStudyCards(@Payload() payload: { setId: string; userId: string }) {
    return this.studySetService.getStudyCards(payload.setId, payload.userId);
  }

  @MessagePattern('academy.study-set.reviewCard')
  reviewCard(
    @Payload()
    payload: {
      cardId: string;
      userId: string;
      data: ReviewSetCardDto;
    },
  ) {
    return this.studySetService.reviewCard(
      payload.cardId,
      payload.userId,
      payload.data,
    );
  }

  @MessagePattern('academy.study-set.getTestQuiz')
  getTestQuiz(
    @Payload()
    payload: {
      setId: string;
      userId: string;
      count?: number;
      types?: string;
    },
  ) {
    return this.studySetService.getTestQuiz(
      payload.setId,
      payload.userId,
      payload.count,
      payload.types,
    );
  }

  @MessagePattern('academy.study-set.getMatchGame')
  getMatchGame(
    @Payload() payload: { setId: string; userId: string; count?: number },
  ) {
    return this.studySetService.getMatchGame(
      payload.setId,
      payload.userId,
      payload.count,
    );
  }
}
