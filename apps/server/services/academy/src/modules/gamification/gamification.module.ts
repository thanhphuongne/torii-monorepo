import { Module } from '@nestjs/common';
import { GamificationService } from './gamification.service';
import { AchievementService } from './achievement.service';
import { GamificationController } from './gamification.controller';
import { GamificationActivityListener } from './gamification-activity.listener';
import { PrismaModule, NatsClientModule } from '@server/shared';

@Module({
  imports: [PrismaModule, NatsClientModule],
  providers: [GamificationService, AchievementService],
  controllers: [GamificationController, GamificationActivityListener],
  exports: [GamificationService, AchievementService],
})
export class GamificationModule {}
