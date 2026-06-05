import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
  Max,
  Min,
} from 'class-validator';

import { JlptLevelCodeDto } from './jlpt-mock.dto';

export class JlptLevelConfigEnsureDto {
  @IsString()
  level!: JlptLevelCodeDto;

  @IsOptional()
  @IsString()
  nameVi?: string;
}

export class JlptScoringProfileCreateDto {
  @IsString()
  level!: JlptLevelCodeDto;

  @IsString()
  name!: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  // Tối thiểu scaled score để pass theo domain (0..60). Nếu bỏ trống => mặc định 0.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(60)
  minLanguageScaled?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(60)
  minReadingScaled?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(60)
  minListeningScaled?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  // Tổng scaled score của JLPT là 0..180 (language + reading + listening).
  @Max(180)
  minTotalScaled?: number;
}

export class JlptActiveScoringProfileQueryDto {
  @IsString()
  level!: JlptLevelCodeDto;
}

export enum JlptScoringDomainDto {
  LANGUAGE = 'LANGUAGE',
  READING = 'READING',
  LISTENING = 'LISTENING',
}

export class JlptScoringMappingUpsertItemDto {
  @IsEnum(JlptScoringDomainDto)
  domain!: JlptScoringDomainDto;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  rawScore!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(60)
  scaledScore!: number;
}

export class JlptScoringMappingUpsertDto {
  @IsUUID()
  profileId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JlptScoringMappingUpsertItemDto)
  items!: JlptScoringMappingUpsertItemDto[];
}

export class JlptAssembleTemplateFromBankDto {
  @IsUUID()
  templateId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  perMondaiCount?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  clearExisting?: boolean;
}
