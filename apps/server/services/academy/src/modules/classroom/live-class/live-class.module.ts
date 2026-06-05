import { Module } from '@nestjs/common';
import { LiveClassService } from './live-class.service';
import { LiveClassHandler } from './live-class.handler';
import { LiveScheduleModule } from '../live-schedule/live-schedule.module';

@Module({
  imports: [LiveScheduleModule],
  providers: [LiveClassService],
  controllers: [LiveClassHandler],
  exports: [LiveClassService],
})
export class LiveClassModule {}
