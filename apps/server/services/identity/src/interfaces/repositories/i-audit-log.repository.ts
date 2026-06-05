import type { AuditLog, Prisma } from '@prisma/generated';
import type { AuditLogActivityDTO } from '@workspace/schemas';

/**
 * Audit Log Repository Interface
 * Defines the contract for audit log data access operations
 */
export interface IAuditLogRepository {
  /**
   * Create a new audit log entry
   * @param data - Audit log creation data
   * @returns The created audit log entry
   */
  create(data: Prisma.AuditLogCreateInput): Promise<AuditLog>;

  /**
   * Find many audit logs with filters and pagination
   * @param options - Query options including where, include, orderBy, skip, and take
   * @returns Array of audit logs matching the criteria
   */
  findMany(options: {
    where?: Prisma.AuditLogWhereInput;
    include?: Prisma.AuditLogInclude;
    orderBy?: Prisma.AuditLogOrderByWithRelationInput;
    skip?: number;
    take?: number;
  }): Promise<AuditLog[]>;

  /**
   * Count audit logs with optional filter
   * @param where - Optional filter criteria
   * @returns Total count of audit logs matching the criteria
   */
  count(where?: Prisma.AuditLogWhereInput): Promise<number>;

  /**
   * Get recent activity for a user
   * @param userId - The user's unique identifier
   * @param limit - Maximum number of records to return (default: 20)
   * @returns Array of recent audit log entries for the user
   */
  findByUserId(userId: string, limit?: number): Promise<AuditLogActivityDTO[]>;

  /**
   * Get activity for a specific entity
   * @param entity - The entity type (e.g., 'user', 'course')
   * @param entityId - The entity's unique identifier
   * @param limit - Maximum number of records to return (default: 20)
   * @returns Array of audit log entries for the entity
   */
  findByEntity(
    entity: string,
    entityId: string,
    limit?: number,
  ): Promise<AuditLogActivityDTO[]>;

  /**
   * Delete old audit logs (for cleanup/retention policies)
   * @param date - Delete logs older than this date
   * @returns Number of deleted records
   */
  deleteOlderThan(date: Date): Promise<number>;
}
