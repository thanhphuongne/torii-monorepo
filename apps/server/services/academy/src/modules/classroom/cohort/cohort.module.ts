import { Module } from '@nestjs/common';
import { NatsClientModule } from '@server/shared';
import { CohortService } from './cohort.service';
import { CohortHandler } from './cohort.handler';

@Module({
  imports: [NatsClientModule],
  providers: [CohortService],
  controllers: [CohortHandler],
  exports: [CohortService],
})
export class CohortModule {}
