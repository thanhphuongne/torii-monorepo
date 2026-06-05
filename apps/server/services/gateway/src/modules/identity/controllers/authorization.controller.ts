import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  successResponse,
  errorResponse,
  GatewayAuthGuard,
  PermissionsGuard,
  Permissions,
} from '@server/shared';

@Controller('api/authorization')
@UseGuards(GatewayAuthGuard, PermissionsGuard)
export class AuthorizationController {
  constructor(
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  @Get('roles')
  @Permissions('ops.user.manage', 'ops.user.view')
  async getRoles() {
    try {
      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'identity.authz.getRoles' }, {}),
      );
      return successResponse(result);
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error ? error.message : 'Failed to fetch roles',
      );
    }
  }

  @Post('roles')
  @Permissions('ops.user.manage')
  async createRole(@Body() data: { code: string; name: string; description?: string | null }) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'identity.authz.createRole' }, data),
      );
      return successResponse(result, 'Role created successfully');
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error ? error.message : 'Failed to create role',
      );
    }
  }

  @Patch('roles/:roleCode')
  @Permissions('ops.user.manage')
  async updateRole(
    @Param('roleCode') roleCode: string,
    @Body() data: { name?: string; description?: string | null },
  ) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.authz.updateRole' },
          { code: roleCode, ...data },
        ),
      );
      return successResponse(result, 'Role updated successfully');
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error ? error.message : 'Failed to update role',
      );
    }
  }

  @Delete('roles/:roleCode')
  @Permissions('ops.user.manage')
  async deleteRole(@Param('roleCode') roleCode: string) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.authz.deleteRole' },
          { code: roleCode },
        ),
      );
      return successResponse(result, 'Role deleted successfully');
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error ? error.message : 'Failed to delete role',
      );
    }
  }

  @Get('permissions')
  @Permissions('ops.user.manage')
  async getPermissions() {
    try {
      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'identity.authz.getPermissions' }, {}),
      );
      return successResponse(result);
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error ? error.message : 'Failed to fetch permissions',
      );
    }
  }

  @Get('roles/:roleCode/permissions')
  @Permissions('ops.user.manage')
  async getRolePermissions(@Param('roleCode') roleCode: string) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.authz.getRolePermissions' },
          { roleCode },
        ),
      );
      return successResponse(result);
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error
          ? error.message
          : 'Failed to fetch role permissions',
      );
    }
  }

  @Put('roles/:roleCode/permissions')
  @Permissions('ops.user.manage')
  async setRolePermissions(
    @Param('roleCode') roleCode: string,
    @Body() data: { permissions: string[] },
  ) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.authz.setRolePermissions' },
          { roleCode, permissions: data.permissions },
        ),
      );
      return successResponse(result, 'Role permissions updated successfully');
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error
          ? error.message
          : 'Failed to update role permissions',
      );
    }
  }

  @Post('reseed')
  @Permissions('ops.user.manage')
  async reseedPermissions() {
    try {
      await firstValueFrom(
        this.natsClient.send({ cmd: 'identity.authz.reseedPermissions' }, {}),
      );
      return successResponse(null, 'Permissions reseeded successfully');
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error ? error.message : 'Failed to reseed permissions',
      );
    }
  }
}
