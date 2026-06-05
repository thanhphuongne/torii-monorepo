import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export enum JlptLevelCodeDto {
  N5 = 'N5',
  N4 = 'N4',
  N3 = 'N3',
  N2 = 'N2',
  N1 = 'N1',
}

export enum JlptMockExamStatusDto {
  DRAFT = 'DRAFT',
  READY = 'READY',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export class JlptMockExamTemplateQueryDto {
  @IsOptional()
  @IsEnum(JlptLevelCodeDto)
  level?: JlptLevelCodeDto;

  @IsOptional()
  @IsEnum(JlptMockExamStatusDto)
  status?: JlptMockExamStatusDto;

  @IsOptional()
  @IsString()
  q?: string;
}

export class JlptMockExamTemplateCreateDto {
  @IsEnum(JlptLevelCodeDto)
  level!: JlptLevelCodeDto;

  @IsString()
  @MaxLength(64)
  code!: string;

  @IsString()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  /** Nếu bỏ trống, server dùng profile chấm điểm đang active đầu tiên của cấp độ. */
  @IsOptional()
  @IsUUID()
  scoringProfileId?: string;

  @IsOptional()
  @IsEnum(JlptMockExamStatusDto)
  status?: JlptMockExamStatusDto;

  @IsOptional()
  availableFrom?: string;

  @IsOptional()
  availableTo?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttemptsPerUser?: number;

  @IsOptional()
  @IsBoolean()
  showDetailedReview?: boolean;

  @IsOptional()
  @IsBoolean()
  showCorrectAnswerImmediately?: boolean;
}

export class JlptMockExamTemplateUpdateDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  scoringProfileId?: string;

  @IsOptional()
  @IsEnum(JlptMockExamStatusDto)
  status?: JlptMockExamStatusDto;

  @IsOptional()
  availableFrom?: string;

  @IsOptional()
  availableTo?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttemptsPerUser?: number;

  @IsOptional()
  @IsBoolean()
  showDetailedReview?: boolean;

  @IsOptional()
  @IsBoolean()
  showCorrectAnswerImmediately?: boolean;
}

export class JlptMockAttachQuestionsItemDto {
  @IsUUID()
  questionId!: string;

  @IsUUID()
  sectionId!: string;

  @IsOptional()
  @IsUUID()
  mondaiId?: string;

  @IsInt()
  @Min(0)
  orderIndex!: number;

  @IsOptional()
  weight?: number;
}

export class JlptMockAttachQuestionsDto {
  @IsUUID()
  templateId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JlptMockAttachQuestionsItemDto)
  items!: JlptMockAttachQuestionsItemDto[];
}

export class JlptMockAttemptStartDto {
  @IsUUID()
  templateId!: string;

  @IsOptional()
  @IsUUID()
  userId?: string;
}

export class JlptMockSaveAnswerItemDto {
  @IsUUID()
  templateQuestionId!: string;

  @IsOptional()
  @IsUUID()
  selectedOptionId?: string;
}

export class JlptMockAttemptSaveAnswersDto {
  @IsUUID()
  attemptId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JlptMockSaveAnswerItemDto)
  answers!: JlptMockSaveAnswerItemDto[];
}

export class JlptMockAttemptNextSectionDto {
  @IsUUID()
  attemptId!: string;

  @IsInt()
  @Min(1)
  currentSectionOrder!: number;
}

export class JlptMockAttemptSubmitDto {
  @IsUUID()
  attemptId!: string;
}
