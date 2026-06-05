import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class QuestionCreateDto {
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsString()
  @MaxLength(30)
  questionType!: string;

  @IsOptional()
  options?: unknown;

  @IsOptional()
  correctAnswer?: unknown;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  level?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  categoryType?: string;
}

export class QuestionUpdateDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  questionType?: string;

  @IsOptional()
  options?: unknown;

  @IsOptional()
  correctAnswer?: unknown;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  level?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  categoryType?: string;
}

export class QuestionQueryDto {
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsString()
  questionType?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsString()
  categoryType?: string;

  @IsOptional()
  topLevelOnly?: string; // 'true' or 'false'
}
