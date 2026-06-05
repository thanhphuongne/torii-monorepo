import { Module } from '@nestjs/common';
import { GamificationController } from './controllers/gamification.controller';
import { NatsClientModule } from '@server/shared';

@Module({
  imports: [NatsClientModule],
  controllers: [GamificationController],
  providers: [],
})
export class GamificationModule {}
