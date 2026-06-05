import { IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class AssignmentSubmissionCreateDto {
  @IsUUID()
  classAssessmentId!: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString({ each: true })
  fileUrls?: string[];
}

export class AssignmentSubmissionUpdateDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;

  @IsOptional()
  @Min(0)
  score?: number;

  @IsOptional()
  @IsString()
  feedback?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString({ each: true })
  fileUrls?: string[];
}

export class AssignmentSubmissionQueryDto {
  @IsOptional()
  @IsUUID()
  classAssessmentId?: string;

  @IsOptional()
  @IsUUID()
  liveClassId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;
}
