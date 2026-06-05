import { Module } from '@nestjs/common';
import { NatsClientModule } from '@server/shared/nats/nats-client.module';
import { EnrollmentHandler } from './enrollment.handler';
import { EnrollmentService } from './enrollment.service';
import { GamificationModule } from '../../gamification/gamification.module';

@Module({
  imports: [NatsClientModule, GamificationModule],
  providers: [EnrollmentService],
  controllers: [EnrollmentHandler],
  exports: [EnrollmentService],
})
export class EnrollmentModule { }
