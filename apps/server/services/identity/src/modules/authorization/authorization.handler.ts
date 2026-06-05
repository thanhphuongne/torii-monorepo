import { Controller, Inject, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import type { IAuthorizationService } from '@server/identity/interfaces/services';
import { AUTHORIZATION_SERVICE_TOKEN } from '@server/identity/interfaces/services';
import { AuthorizationConfigService } from '@server/identity/services/authorization-config.service';
import { AuthorizationSeederService } from '@server/identity/services/authorization-seeder.service';
import { PrismaService } from '@server/shared';

@Controller()
export class AuthorizationHandler {
  private readonly logger = new Logger(AuthorizationHandler.name);

  constructor(
    @Inject(AUTHORIZATION_SERVICE_TOKEN)
    private readonly authorizationService: IAuthorizationService,
    private readonly authorizationConfig: AuthorizationConfigService,
    private readonly seeder: AuthorizationSeederService,
    private readonly prisma: PrismaService,
  ) {}

  @MessagePattern({ cmd: 'identity.authz.getRoles' })
  async getRoles() {
    return this.prisma.role.findMany({
      orderBy: { code: 'asc' },
      select: { code: true, name: true, description: true },
    });
  }

  @MessagePattern({ cmd: 'identity.authz.getPermissions' })
  async getPermissions() {
    const permissions = this.authorizationConfig.getPermissions();
    // Group by category
    const grouped = permissions.reduce(
      (acc, perm) => {
        if (!acc[perm.category]) {
          acc[perm.category] = [];
        }
        acc[perm.category].push(perm);
        return acc;
      },
      {} as Record<string, typeof permissions>,
    );

    return {
      all: permissions,
      byCategory: grouped,
    };
  }

  @MessagePattern({ cmd: 'identity.authz.getRolePermissions' })
  async getRolePermissions(@Payload() data: { roleCode: string }) {
    const permissions = await this.authorizationService.getRolePermissions(
      data.roleCode,
    );
    return {
      roleCode: data.roleCode,
      permissions,
    };
  }

  @MessagePattern({ cmd: 'identity.authz.setRolePermissions' })
  async setRolePermissions(
    @Payload() data: { roleCode: string; permissions: string[] },
  ) {
    this.logger.log(`Set permissions for role ${data.roleCode}`);
    await this.authorizationService.setRolePermissions(
      data.roleCode,
      data.permissions,
    );
    return {
      roleCode: data.roleCode,
      permissions: data.permissions,
    };
  }

  @MessagePattern({ cmd: 'identity.authz.reseedPermissions' })
  async reseedPermissions() {
    return this.seeder.reseedNewPermissions();
  }

  @MessagePattern({ cmd: 'identity.authz.createRole' })
  async createRole(
    @Payload()
    data: { code: string; name: string; description?: string | null },
  ) {
    const code = data.code?.trim();
    if (!code) throw new Error('Role code is required');

    return this.prisma.role.create({
      data: {
        code,
        name: data.name?.trim() || code,
        description: data.description ?? null,
      },
      select: { code: true, name: true, description: true },
    });
  }

  @MessagePattern({ cmd: 'identity.authz.updateRole' })
  async updateRole(
    @Payload() data: { code: string; name?: string; description?: string | null },
  ) {
    const code = data.code?.trim();
    if (!code) throw new Error('Role code is required');

    return this.prisma.role.update({
      where: { code },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.description !== undefined
          ? { description: data.description }
          : {}),
      },
      select: { code: true, name: true, description: true },
    });
  }

  @MessagePattern({ cmd: 'identity.authz.deleteRole' })
  async deleteRole(@Payload() data: { code: string }) {
    const code = data.code?.trim();
    if (!code) throw new Error('Role code is required');

    const usage = await this.prisma.user.count({ where: { role: code } });
    if (usage > 0) {
      throw new Error(`Role ${code} is in use and cannot be removed`);
    }

    await this.prisma.rolePermission.deleteMany({ where: { roleCode: code } });
    await this.prisma.role.delete({ where: { code } });
    return { code, deleted: true };
  }

  @MessagePattern({ cmd: 'identity.authz.getUserPermissionsByUserId' })
  async getUserPermissionsByUserId(@Payload() data: { userId: string }) {
    const userId = data.userId?.trim();
    if (!userId) throw new Error('userId is required');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!user) throw new Error('User not found');

    const rolePerms = await this.prisma.rolePermission.findMany({
      where: { roleCode: user.role },
      select: { permissionCode: true },
    });

    return {
      userId,
      roleCode: user.role,
      permissions: rolePerms.map((rp) => rp.permissionCode),
    };
  }
}
