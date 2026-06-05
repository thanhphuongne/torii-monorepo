import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

export interface PermissionDefinition {
  code: string;
  description: string;
  category: string;
}

interface AuthorizationConfig {
  system: {
    version: string;
    description: string;
  };
  permissions: PermissionDefinition[];
  default_role_permissions: Record<string, string[]>;
  role_matrix?: Record<string, string[]>;
  staff_template_suggestions?: Record<string, string[]>;
}

@Injectable()
export class AuthorizationConfigService {
  private readonly logger = new Logger(AuthorizationConfigService.name);
  private config: AuthorizationConfig;

  constructor() {
    this.loadConfig();
  }

  private loadConfig() {
    try {
      const configPath = path.join(process.cwd(), 'config', 'rbac-v2.yaml');
      const fileContents = fs.readFileSync(configPath, 'utf8');
      this.config = yaml.load(fileContents) as AuthorizationConfig;
      this.logger.log(
        `Authorization config loaded: v${this.config.system.version}`,
      );
    } catch (error) {
      this.logger.error('Failed to load authorization config:', error);
      throw new Error('Failed to load authorization configuration');
    }
  }

  /**
   * Get all defined permissions
   */
  getPermissions(): PermissionDefinition[] {
    return this.config.permissions;
  }

  /**
   * Get default permissions for a role
   */
  getRolePermissions(roleCode: string): string[] {
    return (
      this.config.role_matrix?.[roleCode] ||
      this.config.default_role_permissions?.[roleCode] ||
      []
    );
  }

  /**
   * Get staff template permissions (suggestions only)
   */
  getStaffTemplatePermissions(templateName: string): string[] {
    return this.config.staff_template_suggestions?.[templateName] || [];
  }

  /**
   * Get all staff templates (suggestions only)
   */
  getStaffTemplates(): Record<string, string[]> {
    return this.config.staff_template_suggestions || {};
  }

  /**
   * Check if a permission code exists
   */
  isValidPermission(permissionCode: string): boolean {
    return this.config.permissions.some((p) => p.code === permissionCode);
  }

  /**
   * Reload configuration (useful for hot-reload without restart)
   */
  reloadConfig() {
    this.loadConfig();
  }
}
