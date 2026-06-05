import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class LiveScheduleCreateDto {
  @IsUUID()
  liveClassId!: string;

  @IsInt()
  @Min(0)
  weekday!: number; // 0-6

  @IsString()
  @MaxLength(20)
  startTime!: string; // HH:mm

  @IsString()
  @MaxLength(20)
  endTime!: string; // HH:mm
}

export class LiveScheduleUpdateDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  weekday?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  startTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  endTime?: string;
}

export class LiveScheduleQueryDto {
  @IsOptional()
  @IsUUID()
  liveClassId?: string;
}
