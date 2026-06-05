import { IsUUID, IsString } from 'class-validator';

export class LiveSessionJoinDto {
  @IsUUID()
  id!: string;

  @IsString()
  userId!: string;
}
