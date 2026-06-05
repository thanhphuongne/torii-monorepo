import { Module } from '@nestjs/common';
import { NatsClientModule } from '@server/shared';
import { LessonHandler } from './lesson.handler';
import { LessonService } from './lesson.service';

@Module({
  imports: [NatsClientModule],
  controllers: [LessonHandler],
  providers: [LessonService],
  exports: [LessonService],
})
export class LessonModule { }
