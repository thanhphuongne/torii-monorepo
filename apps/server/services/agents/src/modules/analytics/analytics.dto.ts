import { IsEnum, IsNumber, IsString, IsOptional } from 'class-validator';

export class TrackProgressDto {
  @IsString()
  userId: string;

  @IsString()
  activity: string;

  @IsOptional()
  @IsNumber()
  score?: number;
}

export class SuggestPathDto {
  @IsString()
  userId: string;
}

export class IdentifyWeaknessesDto {
  @IsString()
  userId: string;
}

export class PredictReadinessDto {
  @IsString()
  userId: string;

  @IsString()
  @IsOptional()
  level?: string;

  @IsString()
  @IsOptional()
  targetTest?: string;
}

export class GenerateReportDto {
  @IsString()
  userId: string;

  @IsEnum(['daily', 'weekly', 'monthly', 'overall'])
  reportType: string;
}
