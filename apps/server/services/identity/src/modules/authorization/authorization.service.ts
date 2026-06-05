import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from '@server/shared';
import { AuthorizationConfigService } from '@server/identity/services/authorization-config.service';
import type {
  IAuditLogService,
  IAuthorizationService,
  RoleMetadata,
  PermissionMetadata,
} from '@server/identity/interfaces/services';
import { AUDIT_LOG_SERVICE_TOKEN } from '@server/identity/interfaces/services';
import type { AuditContextDTO } from '@workspace/schemas';

export interface UserPermissions {
  permissions: string[];
}

// Type alias for backward compatibility
export type AuditContext = AuditContextDTO;

@Injectable()
export class AuthorizationService implements IAuthorizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationConfig: AuthorizationConfigService,
    @Inject(AUDIT_LOG_SERVICE_TOKEN)
    private readonly auditLog: IAuditLogService,
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  private readonly logger = new Logger(AuthorizationService.name);

  /**
   * Helper to emit audit log event
   */
  private async createAuditLog(entry: {
    userId: string;
    action: string;
    entity: string;
    entityId?: string;
    description: string;
    metadata?: any;
    oldValues?: any;
    newValues?: any;
  }) {
    try {
      this.natsClient.emit({ cmd: 'identity.audit.log' }, entry);
    } catch (error) {
      this.logger.error(`Failed to emit audit log: ${error.message}`);
    }
  }

  /**
   * Get all permissions for a user based on their role and custom permissions
   * Reads from DATABASE (role_permissions + user_permissions)
   */
  async getUserPermissions(
    userId: string,
    userRole: string,
  ): Promise<UserPermissions> {
    // Get permissions for current role from DATABASE
    const rolePerms = await this.prisma.rolePermission.findMany({
      where: { roleCode: userRole },
    });

    return {
      permissions: rolePerms.map((rp) => rp.permissionCode),
    };
  }

  /**
   * Check if user has a specific permission
   */
  async hasPermission(
    userId: string,
    userRole: string,
    permissionCode: string,
  ): Promise<boolean> {
    const { permissions } = await this.getUserPermissions(userId, userRole);

    return permissions.includes(permissionCode);
  }

  /**
   * Get permissions for a role (from DB)
   */
  async getRolePermissions(roleCode: string): Promise<string[]> {
    const rolePerms = await this.prisma.rolePermission.findMany({
      where: { roleCode },
    });

    return rolePerms.map((rp) => rp.permissionCode);
  }

  /**
   * ADMIN: Set permissions for a role (replaces all existing)
   */
  async setRolePermissions(
    roleCode: string,
    permissionCodes: string[],
    context?: AuditContextDTO,
  ): Promise<void> {
    // Validate role exists in DB
    const role = await this.prisma.role.findUnique({
      where: { code: roleCode },
      select: { code: true, name: true, description: true },
    });
    if (!role) {
      throw new Error(`Role ${roleCode} not found`);
    }

    // Validate all permissions exist in config
    for (const permCode of permissionCodes) {
      if (!this.authorizationConfig.isValidPermission(permCode)) {
        throw new Error(
          `Permission ${permCode} not found in authorization config`,
        );
      }
    }

    // Get old permissions for audit log
    const oldPermissions = await this.getRolePermissions(roleCode);

    // Delete all existing permissions for this role
    await this.prisma.rolePermission.deleteMany({
      where: { roleCode },
    });

    // Insert new permissions
    if (permissionCodes.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: permissionCodes.map((permCode) => ({
          roleCode,
          permissionCode: permCode,
        })),
      });
    }

    // Audit log
    if (context) {
      await this.createAuditLog({
        userId: context.actorId,
        action: 'permission.update_role',
        entity: 'role_permission',
        entityId: roleCode,
        description: `Updated permissions for role "${role.name}" (${roleCode})`,
        metadata: {
          roleCode,
          roleName: role.name,
          permissionCount: permissionCodes.length,
        },
        oldValues: { permissions: oldPermissions },
        newValues: { permissions: permissionCodes },
      });
    }
  }

  /**
   * ADMIN: Add single permission to a role
   */
  async addPermissionToRole(
    roleCode: string,
    permissionCode: string,
    context?: AuditContextDTO,
  ): Promise<void> {
    // Validate
    const role = await this.prisma.role.findUnique({
      where: { code: roleCode },
      select: { code: true, name: true },
    });
    if (!role) throw new Error(`Role ${roleCode} not found`);
    if (!this.authorizationConfig.isValidPermission(permissionCode)) {
      throw new Error(`Permission ${permissionCode} not found`);
    }

    await this.prisma.rolePermission.upsert({
      where: {
        roleCode_permissionCode: { roleCode, permissionCode },
      },
      create: { roleCode, permissionCode },
      update: {},
    });

    if (context) {
      await this.createAuditLog({
        userId: context.actorId,
        action: 'permission.add_to_role',
        entity: 'role_permission',
        entityId: roleCode,
        description: `Added permission "${permissionCode}" to role "${roleCode}"`,
        newValues: { roleCode, permissionCode },
      });
    }
  }

  /**
   * ADMIN: Remove permission from a role
   */
  async removePermissionFromRole(
    roleCode: string,
    permissionCode: string,
    context?: AuditContextDTO,
  ): Promise<void> {
    await this.prisma.rolePermission.deleteMany({
      where: { roleCode, permissionCode },
    });

    if (context) {
      await this.createAuditLog({
        userId: context.actorId,
        action: 'permission.remove_from_role',
        entity: 'role_permission',
        entityId: roleCode,
        description: `Removed permission "${permissionCode}" from role "${roleCode}"`,
        oldValues: { roleCode, permissionCode },
      });
    }
  }

  /**
   * Get all available roles from config (for admin UI)
   */
  getAvailableRoles(): RoleMetadata[] {
    return [];
  }

  /**
   * Get all available permissions from config (for admin UI)
   */
  getAvailablePermissions(): PermissionMetadata[] {
    return this.authorizationConfig.getPermissions().map((perm) => ({
      code: perm.code,
      name: perm.code, // Use code as name if name not available
      description: perm.description,
      category: perm.category,
    }));
  }
}
