import { Module } from '@nestjs/common';
import { NatsClientModule } from '@server/shared';
import { LiveScheduleHandler } from './live-schedule.handler';
import { LiveScheduleService } from './live-schedule.service';

@Module({
  imports: [NatsClientModule],
  providers: [LiveScheduleService],
  controllers: [LiveScheduleHandler],
  exports: [LiveScheduleService],
})
export class LiveScheduleModule {}
