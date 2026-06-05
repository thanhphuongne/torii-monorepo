import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import type { IAuditLogService } from '@server/identity/interfaces/services';
import { AUDIT_LOG_SERVICE_TOKEN } from '@server/identity/interfaces/services';
import type { AuditLogFiltersDTO } from '@workspace/schemas';

@Controller()
export class AuditLogHandler {
  constructor(
    @Inject(AUDIT_LOG_SERVICE_TOKEN)
    private readonly auditLogService: IAuditLogService,
  ) {}

  @MessagePattern({ cmd: 'identity.audit.query' })
  async query(@Payload() filters: AuditLogFiltersDTO) {
    // Fix dates deserialization
    if (filters.startDate) filters.startDate = new Date(filters.startDate);
    if (filters.endDate) filters.endDate = new Date(filters.endDate);

    return this.auditLogService.query(filters);
  }

  @MessagePattern({ cmd: 'identity.audit.getUserActivity' })
  async getUserActivity(@Payload() data: { userId: string; limit: number }) {
    return this.auditLogService.getUserActivity(data.userId, data.limit);
  }

  @MessagePattern({ cmd: 'identity.audit.getEntityActivity' })
  async getEntityActivity(
    @Payload() data: { entity: string; entityId: string; limit: number },
  ) {
    return this.auditLogService.getEntityActivity(
      data.entity,
      data.entityId,
      data.limit,
    );
  }

  @MessagePattern({ cmd: 'identity.audit.log' })
  async log(@Payload() entry: any) {
    return this.auditLogService.log(entry);
  }
}
