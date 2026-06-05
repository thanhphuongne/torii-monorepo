import type { AuditContextDTO } from '@workspace/schemas';

/**
 * Role Metadata
 */
export interface RoleMetadata {
  code: string;
  name: string;
  description?: string;
}

/**
 * Permission Metadata
 */
export interface PermissionMetadata {
  code: string;
  name: string;
  description?: string;
  category?: string;
}

/**
 * User Permissions Response
 */
export interface UserPermissions {
  permissions: string[];
}

/**
 * Authorization Service Interface
 * Defines the contract for authorization and access control operations
 */
export interface IAuthorizationService {
  /**
   * Get all permissions for a user based on their role
   * Reads from database (role_permissions)
   * @param userId - The user's unique identifier
   * @param userRole - The user's role
   * @returns User permissions
   */
  getUserPermissions(
    userId: string,
    userRole: string,
  ): Promise<UserPermissions>;

  /**
   * Check if user has a specific permission
   * @param userId - The user's unique identifier
   * @param userRole - The user's role
   * @param permissionCode - The permission code to check
   * @returns True if user has the permission, false otherwise
   */
  hasPermission(
    userId: string,
    userRole: string,
    permissionCode: string,
  ): Promise<boolean>;

  /**
   * Get permissions for a role (from database)
   * @param roleCode - The role code
   * @returns Array of permission codes
   */
  getRolePermissions(roleCode: string): Promise<string[]>;

  /**
   * Set permissions for a role (replaces all existing) - ADMIN only
   * @param roleCode - The role code
   * @param permissionCodes - Array of permission codes to set
   * @param context - Optional audit context
   */
  setRolePermissions(
    roleCode: string,
    permissionCodes: string[],
    context?: AuditContextDTO,
  ): Promise<void>;

  /**
   * Add permission to role.
   */
  addPermissionToRole(
    roleCode: string,
    permissionCode: string,
    context?: AuditContextDTO,
  ): Promise<void>;

  /**
   * Remove permission from a role - ADMIN only
   * @param roleCode - The role code
   * @param permissionCode - The permission code to remove
   * @param context - Optional audit context
   */
  removePermissionFromRole(
    roleCode: string,
    permissionCode: string,
    context?: AuditContextDTO,
  ): Promise<void>;

  /**
   * Get all available roles from config (for admin UI)
   * @returns Array of available roles with their metadata
   */
  getAvailableRoles(): RoleMetadata[];

  /**
   * Get all available permissions from config (for admin UI)
   * @returns Array of available permissions with their metadata
   */
  getAvailablePermissions(): PermissionMetadata[];
}
