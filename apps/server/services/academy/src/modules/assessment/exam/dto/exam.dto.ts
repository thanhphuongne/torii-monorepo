import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ExamSectionInputDto {
  @IsString()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  instruction?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  timeLimitSeconds?: number;

  @IsInt()
  @Min(0)
  orderIndex!: number;

  @IsString()
  @MaxLength(50)
  sectionType!: string;

  @IsOptional()
  metadata?: unknown;
}

export class ExamQuestionInputDto {
  @IsInt()
  @Min(0)
  orderIndex!: number;

  @IsUUID()
  sectionId!: string;

  @IsUUID()
  questionId!: string;

  @IsOptional()
  points?: number;

  @IsOptional()
  metadata?: unknown;
}

export class ExamCreateDto {
  @IsOptional()
  @IsUUID()
  courseProfileId?: string;

  @IsString()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  examType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  level?: string;

  @IsOptional()
  totalTimeLimitMinutes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;

  @IsOptional()
  settings?: unknown;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExamSectionInputDto)
  sections!: ExamSectionInputDto[];
}

export class ExamUpdateDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  examType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  level?: string;

  @IsOptional()
  totalTimeLimitMinutes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;

  @IsOptional()
  settings?: unknown;
}

export class ExamQueryDto {
  @IsOptional()
  @IsUUID()
  courseProfileId?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
