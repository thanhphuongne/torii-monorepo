import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AUDIT_LOG_SERVICE_TOKEN } from '@server/identity/interfaces/services';
import type { IAuditLogService } from '@server/identity/interfaces/services';
import { AppConfigService } from '@server/shared';

@Injectable()
export class AuditLogScheduler {
  private readonly logger = new Logger(AuditLogScheduler.name);

  constructor(
    @Inject(AUDIT_LOG_SERVICE_TOKEN)
    private readonly auditLogService: IAuditLogService,
    private readonly config: AppConfigService,
  ) {}

  /**
   * Cron job to clean up old audit logs.
   * Runs every day at 02:00 AM.
   * Retention policy: Delete logs older than 6 months.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleAuditLogCleanup() {
    this.logger.log('Starting scheduled audit log cleanup...');
    try {
      const retentionMonths = this.config.identity.auditLogRetentionMonths;
      const deletedCount =
        await this.auditLogService.cleanupOldLogs(retentionMonths);

      if (deletedCount > 0) {
        this.logger.log(
          `Cleanup completed. Deleted ${deletedCount} logs older than ${retentionMonths} months.`,
        );
      } else {
        this.logger.log(
          'Cleanup completed. No logs were old enough to be deleted.',
        );
      }
    } catch (error) {
      this.logger.error('Error during scheduled audit log cleanup:', error);
    }
  }
}
