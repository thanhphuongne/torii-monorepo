import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { JlptBankSectionCodeDto } from './jlpt-bank.dto';

export class JlptMondaiListQueryDto {
  @IsString()
  level!: string;

  @IsEnum(JlptBankSectionCodeDto)
  sectionCode!: JlptBankSectionCodeDto;
}

export class JlptMondaiCreateDto {
  @IsString()
  level!: string;

  @IsEnum(JlptBankSectionCodeDto)
  sectionCode!: JlptBankSectionCodeDto;

  @IsString()
  @MaxLength(64)
  code!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  titleVi?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  titleJa?: string;

  @IsOptional()
  @IsString()
  descriptionVi?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  orderIndex!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  recommendedQuestionCount?: number;
}

export class JlptMondaiUpdateDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  titleVi?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  titleJa?: string;

  @IsOptional()
  @IsString()
  descriptionVi?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  recommendedQuestionCount?: number;
}
