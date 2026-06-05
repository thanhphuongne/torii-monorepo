import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class EnrollmentCreateDto {
  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsUUID()
  liveClassId?: string;

  @IsOptional()
  @IsUUID()
  vodPackageId?: string;

  @IsOptional()
  expiresAt?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;

  @IsOptional()
  @IsUUID()
  sourceOrderId?: string;
}

export class EnrollmentQueryDto {
  @IsOptional()
  @IsUUID()
  liveClassId?: string;

  @IsOptional()
  @IsUUID()
  vodPackageId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

