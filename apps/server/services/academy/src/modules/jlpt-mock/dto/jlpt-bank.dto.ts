import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export enum JlptBankDifficultyDto {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export enum JlptBankQuestionTypeDto {
  VOCAB = 'VOCAB',
  GRAMMAR = 'GRAMMAR',
  READING = 'READING',
  LISTENING = 'LISTENING',
}

export enum JlptBankSectionCodeDto {
  LANGUAGE_VOCAB = 'LANGUAGE_VOCAB',
  LANGUAGE_GRAMMAR_READING = 'LANGUAGE_GRAMMAR_READING',
  LISTENING = 'LISTENING',
}

const emptyToUndef = ({ value }: { value: unknown }) =>
  value === '' || value === null || value === undefined ? undefined : value;

/** Chuỗi rỗng → null (gỡ media); undefined giữ nguyên (PATCH không đổi). */
const emptyStrToNull = ({ value }: { value: unknown }) => {
  if (value === '') return null;
  return value;
};

export class JlptBankQuestionQueryDto {
  @Transform(emptyToUndef)
  @IsOptional()
  @IsString()
  level?: string; // N5..N1

  @Transform(emptyToUndef)
  @IsOptional()
  @IsEnum(JlptBankSectionCodeDto)
  sectionCode?: JlptBankSectionCodeDto;

  @Transform(emptyToUndef)
  @IsOptional()
  @IsString()
  mondaiCode?: string;

  @Transform(emptyToUndef)
  @IsOptional()
  @IsEnum(JlptBankQuestionTypeDto)
  questionType?: JlptBankQuestionTypeDto;

  @Transform(emptyToUndef)
  @IsOptional()
  @IsEnum(JlptBankDifficultyDto)
  difficulty?: JlptBankDifficultyDto;

  @Transform(emptyToUndef)
  @IsOptional()
  @IsString()
  q?: string;

  /** Trang (bắt đầu từ 1). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  /** Kích thước trang (1–100). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  /** @deprecated Dùng `limit` — giữ tương thích cũ. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;
}

/** Query cho dropdown mondai (lọc theo đúng cấp + phần thi JLPT). */
export class JlptBankMondaiListQueryDto {
  @IsString()
  level!: string;

  @IsEnum(JlptBankSectionCodeDto)
  sectionCode!: JlptBankSectionCodeDto;
}

export class JlptBankOptionInputDto {
  @IsString()
  @MaxLength(4)
  key!: string; // A/B/C/D

  @IsString()
  contentText!: string;

  @IsOptional()
  isCorrect?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;
}

export class JlptBankQuestionCreateDto {
  @IsEnum(JlptBankQuestionTypeDto)
  questionType!: JlptBankQuestionTypeDto;

  @IsEnum(JlptBankSectionCodeDto)
  sectionCode!: JlptBankSectionCodeDto;

  @IsString()
  level!: string; // N5..N1

  @IsOptional()
  @IsString()
  mondaiCode?: string;

  @IsString()
  stemText!: string;

  @IsOptional()
  @IsString()
  contextText?: string;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsEnum(JlptBankDifficultyDto)
  difficulty?: JlptBankDifficultyDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JlptBankOptionInputDto)
  options!: JlptBankOptionInputDto[];

  @Transform(emptyStrToNull)
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsUUID()
  audioAssetId?: string | null;

  @Transform(emptyStrToNull)
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsUUID()
  imageAssetId?: string | null;
}

export class JlptBankQuestionUpdateDto {
  @IsOptional()
  @IsEnum(JlptBankQuestionTypeDto)
  questionType?: JlptBankQuestionTypeDto;

  @IsOptional()
  @IsEnum(JlptBankSectionCodeDto)
  sectionCode?: JlptBankSectionCodeDto;

  @IsOptional()
  @IsString()
  mondaiCode?: string;

  @IsOptional()
  @IsString()
  stemText?: string;

  @IsOptional()
  @IsString()
  contextText?: string;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsEnum(JlptBankDifficultyDto)
  difficulty?: JlptBankDifficultyDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JlptBankOptionInputDto)
  options?: JlptBankOptionInputDto[];

  @Transform(emptyStrToNull)
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsUUID()
  audioAssetId?: string | null;

  @Transform(emptyStrToNull)
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsUUID()
  imageAssetId?: string | null;
}
