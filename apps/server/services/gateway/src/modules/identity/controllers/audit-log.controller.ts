import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Inject,
  Param,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  successResponse,
  errorResponse,
  successPaginatedResponse,
  GatewayAuthGuard,
  ZodValidationPipe,
  PermissionsGuard,
  Permissions,
} from '@server/shared';
import {
  AuditLogFiltersDTO,
  auditLogFiltersDTOSchema,
} from '@workspace/schemas';

@Controller('api/admin/audit-logs')
@UseGuards(GatewayAuthGuard, PermissionsGuard)
@Permissions('ops.audit.view')
export class AuditLogController {
  constructor(
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  @Post('search')
  async getAuditLogs(@Body() rawBody: any) {
    let dto: AuditLogFiltersDTO;
    try {
      dto = auditLogFiltersDTOSchema.parse(rawBody);
    } catch (e: any) {
      console.error('ZOD VALIDATION ERROR:', e.errors);
      return errorResponse('Validation Failed: ' + JSON.stringify(e.errors));
    }

    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.audit.query' },
          {
            ...dto,
            page: dto.page ?? 1,
            limit: dto.limit ?? 50,
          },
        ),
      );
      return successPaginatedResponse(result);
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error ? error.message : 'Failed to fetch audit logs',
      );
    }
  }

  @Get('user/:userId')
  async getUserActivity(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.audit.getUserActivity' },
          { userId, limit: limit ? parseInt(limit, 10) : 20 },
        ),
      );
      return successResponse(result);
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error
          ? error.message
          : 'Failed to fetch user activity',
      );
    }
  }

  @Get('entity/:entity/:entityId')
  async getEntityActivity(
    @Param('entity') entity: string,
    @Param('entityId') entityId: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.audit.getEntityActivity' },
          {
            entity,
            entityId,
            limit: limit ? parseInt(limit, 10) : 20,
          },
        ),
      );
      return successResponse(result);
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error
          ? error.message
          : 'Failed to fetch entity activity',
      );
    }
  }
}
