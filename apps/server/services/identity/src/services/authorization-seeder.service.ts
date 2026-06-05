import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@server/shared';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

interface AuthorizationConfig {
  system: { version: string; description: string };
  permissions: Array<{ code: string; description: string; category: string }>;
  default_role_permissions: Record<string, string[]>;
  role_matrix?: Record<string, string[]>;
  staff_template_suggestions?: Record<string, string[]>;
}

@Injectable()
export class AuthorizationSeederService implements OnModuleInit {
  private readonly logger = new Logger(AuthorizationSeederService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedRolesIfNeeded();
    await this.seedIfNeeded();
    // Force update permissions from YAML when app starts to sync changes
    await this.syncPermissionsFromConfig();
  }

  private loadYAML(): AuthorizationConfig {
    try {
      const configPath = path.join(process.cwd(), 'config', 'rbac-v2.yaml');
      const fileContents = fs.readFileSync(configPath, 'utf8');
      return yaml.load(fileContents) as AuthorizationConfig;
    } catch (error) {
      this.logger.error('Failed to load authorization config:', error);
      throw new Error('Failed to load authorization configuration');
    }
  }

  /**
   * Resolve permissions for roles
   * Since the config is now flat, this just returns the default_role_permissions
   */
  private resolvePermissions(
    config: AuthorizationConfig,
  ): Record<string, string[]> {
    return config.role_matrix || config.default_role_permissions || {};
  }

  /**
   * Seed base roles into DB (once, idempotent)
   */
  private async seedRolesIfNeeded() {
    const baseRoles: Array<{ code: string; name: string; description: string }> =
      [
        {
          code: 'admin',
          name: 'System Administrator',
          description: 'Full access to all system resources',
        },
        {
          code: 'staff-academic',
          name: 'Academic Staff',
          description:
            'Nội dung, lớp/lịch live, duyệt yêu cầu lịch; soạn & duyệt xuất bản sản phẩm catalog',
        },
        {
          code: 'staff-operations',
          name: 'Operations Staff',
          description:
            'Đơn hàng/coupon/subscription/blog/gamification/support; đọc academy; duyệt xuất bản sản phẩm catalog',
        },
        {
          code: 'lecturer',
          name: 'Instructor',
          description: 'Teaching staff managing assigned classes and students',
        },
        {
          code: 'learner',
          name: 'Student',
          description: 'Standard student access (no admin permissions)',
        },
      ];

    const existing = await this.prisma.role.count();
    if (existing > 0) return;

    this.logger.log(`🌱 Seeding roles (${baseRoles.length})...`);
    await this.prisma.role.createMany({
      data: baseRoles,
      skipDuplicates: true,
    });
  }

  /**
   * Seed authorization data if database is empty
   * Runs ONCE on first startup only
   */
  async seedIfNeeded() {
    try {
      // Check if already seeded
      const existingPerms = await this.prisma.rolePermission.count();
      if (existingPerms > 0) {
        this.logger.log(
          `Authorization already seeded (${existingPerms} permissions found), skipping...`,
        );
        return;
      }

      this.logger.log('🌱 Seeding authorization from YAML config...');
      const config = this.loadYAML();

      // Use direct permissions since config is flat
      const resolvedPerms = this.resolvePermissions(config);

      // Seed default role_permissions
      let seededCount = 0;
      for (const [roleCode, permissions] of Object.entries(resolvedPerms)) {
        // Remove duplicates
        const uniquePerms = Array.from(new Set(permissions));

        for (const permCode of uniquePerms) {
          await this.prisma.rolePermission.create({
            data: {
              roleCode,
              permissionCode: permCode,
            },
          });
          seededCount++;
        }
        this.logger.log(
          `  ✅ Seeded ${uniquePerms.length} permissions for ${roleCode}`,
        );
      }

      this.logger.log(
        `🎉 Authorization seeding complete! Total: ${seededCount} role-permission mappings`,
      );
    } catch (error) {
      this.logger.error('❌ Authorization seeding failed:', error);
      throw error;
    }
  }

  /**
   * Sync permissions from YAML to Database
   * Ensures DB has all permissions defined in YAML
   */
  async syncPermissionsFromConfig() {
    try {
      this.logger.log('🔄 Syncing permissions from YAML to Database...');
      const config = this.loadYAML();
      const resolvedPerms = this.resolvePermissions(config);
      const validPermissionSet = new Set(
        (config.permissions || []).map((p) => p.code),
      );

      let addedCount = 0;
      for (const [roleCode, permissions] of Object.entries(resolvedPerms)) {
        // Add new permissions
        const uniquePerms = Array.from(new Set(permissions));
        for (const permCode of uniquePerms) {
          // Upsert to ensure it exists
          // We use createMany with skipDuplicates usually, but here we
          // want specific role checks. Using upsert for safety.
          const existing = await this.prisma.rolePermission.findUnique({
            where: {
              roleCode_permissionCode: {
                roleCode,
                permissionCode: permCode,
              },
            },
          });

          if (!existing) {
            await this.prisma.rolePermission.create({
              data: { roleCode, permissionCode: permCode },
            });
            addedCount++;
          }
        }
      }

      // Remove permissions that are no longer in registry (no backward compatibility)
      const deleted = await this.prisma.rolePermission.deleteMany({
        where: {
          permissionCode: { notIn: Array.from(validPermissionSet) },
        },
      });

      if (addedCount > 0) {
        this.logger.log(
          `✅ Sync complete! Added ${addedCount} missing permissions.`,
        );
      } else {
        this.logger.log('✅ Permissions are up to date.');
      }

      if (deleted.count > 0) {
        this.logger.log(
          `🧹 Removed ${deleted.count} role-permission mappings for deprecated permissions.`,
        );
      }
    } catch (error) {
      this.logger.error('❌ Permission sync failed:', error);
    }
  }

  /**
   * Manual re-seed for when new permissions are added to YAML
   * Only adds NEW permissions that don't exist yet
   * Call this via admin API when permissions are added
   */
  async reseedNewPermissions() {
    return this.syncPermissionsFromConfig();
  }
}
