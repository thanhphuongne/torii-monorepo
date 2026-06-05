import { Module } from '@nestjs/common';
import { AuditLogService } from '@server/identity/modules/audit/audit-log.service';
import { AuditLogRepository } from '@server/identity/modules/audit/audit-log.repository';
import { AUDIT_LOG_SERVICE_TOKEN } from '@server/identity/interfaces/services';
import { AUDIT_LOG_REPOSITORY_TOKEN } from '@server/identity/interfaces/repositories';

import { AuditLogHandler } from '@server/identity/modules/audit/audit-log.handler';
import { AuditLogScheduler } from '@server/identity/modules/audit/audit-log.scheduler';

/**
 * Audit Logging Feature Module
 * Handles activity tracking and audit trails
 */
@Module({
  controllers: [AuditLogHandler],
  providers: [
    {
      provide: AUDIT_LOG_SERVICE_TOKEN,
      useClass: AuditLogService,
    },
    {
      provide: AUDIT_LOG_REPOSITORY_TOKEN,
      useClass: AuditLogRepository,
    },
    AuditLogScheduler,
  ],
  exports: [AUDIT_LOG_SERVICE_TOKEN],
})
export class AuditModule {}
