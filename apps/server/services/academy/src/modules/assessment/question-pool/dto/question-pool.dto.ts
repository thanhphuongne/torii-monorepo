import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export enum QuestionPoolStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export class QuestionPoolCreateDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  courseProfileId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  level?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @IsOptional()
  @IsEnum(QuestionPoolStatus)
  status?: QuestionPoolStatus;

  @IsOptional()
  metadata?: unknown;
}

export class QuestionPoolUpdateDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  courseProfileId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  level?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @IsOptional()
  @IsEnum(QuestionPoolStatus)
  status?: QuestionPoolStatus;

  @IsOptional()
  metadata?: unknown;
}

export class QuestionPoolQueryDto {
  @IsOptional()
  @IsUUID()
  courseProfileId?: string;

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(QuestionPoolStatus)
  status?: QuestionPoolStatus;

  @IsOptional()
  @IsString()
  q?: string;
}

export class AddPoolQuestionsDto {
  @IsUUID(undefined, { each: true })
  questionIds!: string[];
}

export class SampleQuestionsDto {
  @IsInt()
  @Min(1)
  count!: number;
}
