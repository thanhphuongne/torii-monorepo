import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class AuditLoggerService {
  private readonly logger = new Logger(AuditLoggerService.name);

  constructor(
    @Inject('NATS_SERVICE')
    private readonly natsClient: ClientProxy,
  ) {}

  async log(params: {
    userId: string;
    action: string;
    entity: string;
    entityId?: string;
    description: string;
    metadata?: any;
    oldValues?: any;
    newValues?: any;
  }) {
    if (params.userId === 'SYSTEM') {
      this.logger.debug(`Skipping audit log for ${params.action} by SYSTEM`);
      return;
    }
    try {
      this.natsClient.emit(
        { cmd: 'identity.audit.log' },
        {
          userId: params.userId,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
          description: params.description,
          metadata: params.metadata || {},
          oldValues: params.oldValues || {},
          newValues: params.newValues || {},
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to create audit log for ${params.action}:`,
        error.message,
      );
    }
  }
}
