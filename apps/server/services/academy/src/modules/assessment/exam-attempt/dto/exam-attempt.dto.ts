import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class ExamAttemptStartDto {
  @IsUUID()
  examId!: string;

  @IsUUID()
  enrollmentId!: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  contentItemId?: string;
}

export class ExamAttemptSaveAnswersDto {
  @IsUUID()
  attemptId!: string;

  draftAnswers!: Record<string, unknown>;
}

export class ExamAttemptSubmitDto {
  @IsUUID()
  attemptId!: string;
}

export class ExamAttemptNextSectionDto {
  @IsUUID()
  attemptId!: string;

  @IsUUID()
  currentSectionId!: string;
}

export class ExamAttemptQueryDto {
  @IsOptional()
  @IsUUID()
  examId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsUUID()
  enrollmentId?: string;

  @IsOptional()
  @IsUUID()
  contentItemId?: string;

  @IsOptional()
  @IsBoolean()
  latestOnly?: boolean;
}
