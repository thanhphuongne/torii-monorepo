import { IsString, IsEnum, IsOptional, IsUUID } from 'class-validator';

export class GrammarCheckDto {
  @IsString()
  text: string;

  @IsUUID()
  userId: string;
}

export class TranslateDto {
  @IsString()
  text: string;

  @IsEnum(['ja', 'en'])
  from: string;

  @IsEnum(['ja', 'en'])
  to: string;

  @IsUUID()
  userId: string;
}

export class CreateFlashcardDto {
  @IsString()
  word: string;

  @IsString()
  meaning: string;

  @IsOptional()
  @IsString()
  example?: string;

  @IsUUID()
  userId: string;
}

export class GenerateDrillDto {
  @IsEnum(['grammar', 'vocabulary', 'kanji', 'particles'])
  drillType: string;

  @IsEnum(['N5', 'N4', 'N3', 'N2', 'N1'])
  level: string;

  @IsOptional()
  @IsString()
  topic?: string;

  @IsUUID()
  userId: string;
}

export class SimulateConversationDto {
  @IsString()
  @IsOptional()
  topic?: string;

  @IsString()
  @IsOptional()
  scenario?: string; // Allow either topic or scenario

  @IsEnum(['N5', 'N4', 'N3', 'N2', 'N1'])
  @IsOptional()
  level?: string;

  @IsString()
  @IsOptional()
  difficulty?: string; // Allow either level or difficulty

  @IsUUID()
  userId: string;
}

export class RecommendResourcesDto {
  @IsString()
  @IsOptional()
  concept?: string;

  @IsString()
  @IsOptional()
  topic?: string; // Allow either concept or topic

  @IsEnum(['N5', 'N4', 'N3', 'N2', 'N1'])
  level: string;

  @IsUUID()
  userId: string;
}
