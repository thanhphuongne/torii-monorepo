import { Global, Module } from '@nestjs/common';
import { NatsClientModule } from '@server/shared';
import { AuditLoggerService } from './audit-logger.service';

@Global()
@Module({
  imports: [NatsClientModule],
  providers: [AuditLoggerService],
  exports: [AuditLoggerService],
})
export class AuditModule {}
