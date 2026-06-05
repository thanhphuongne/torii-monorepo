import { IsEnum, IsOptional, IsUUID, IsInt } from 'class-validator';

export class ClassAttendanceCreateDto {
  @IsUUID()
  sessionId!: string;

  @IsUUID()
  userId!: string;

  @IsEnum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'])
  status!: string;
}

export class ClassAttendanceUpdateDto {
  @IsOptional()
  @IsEnum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'])
  status?: string;
}

export class ClassAttendanceQueryDto {
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  liveClassId?: string;

  @IsOptional()
  @IsInt()
  page?: number;

  @IsOptional()
  @IsInt()
  limit?: number;
}
