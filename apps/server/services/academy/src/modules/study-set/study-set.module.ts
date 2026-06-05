import { Module } from '@nestjs/common';
import { StudySetService } from './study-set.service';
import { StudySetHandler } from './study-set.handler';
import { InfrastructureModule } from '../../infrastructure/infrastructure.module';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
  imports: [InfrastructureModule, GamificationModule],
  providers: [StudySetService],
  controllers: [StudySetHandler],
})
export class StudySetModule {}
