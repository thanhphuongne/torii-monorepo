import type {
  AuditLogEntryDTO,
  AuditLogFiltersDTO,
  PaginatedResponseDTO,
  AuditLogResponseDTO,
  AuditLogActivityDTO,
} from '@workspace/schemas';

/**
 * Audit Log Service Interface
 * Defines the contract for audit logging operations
 */
export interface IAuditLogService {
  /**
   * Log an action to the audit log
   * @param entry - The audit log entry data
   */
  log(entry: AuditLogEntryDTO): Promise<void>;

  /**
   * Query audit logs with filters and pagination
   * @param filters - Filter and pagination options
   * @returns Paginated audit log entries
   */
  query(
    filters: AuditLogFiltersDTO,
  ): Promise<PaginatedResponseDTO<AuditLogResponseDTO>>;

  /**
   * Get recent activity for a user
   * @param userId - The user's unique identifier
   * @param limit - Maximum number of entries to return (default: 20)
   * @returns Recent audit log entries for the user
   */
  getUserActivity(
    userId: string,
    limit?: number,
  ): Promise<AuditLogActivityDTO[]>;

  /**
   * Get activity summary for an entity
   * @param entity - The entity type (e.g., 'user', 'course')
   * @param entityId - The entity's unique identifier
   * @param limit - Maximum number of entries to return (default: 20)
   * @returns Audit log entries for the entity
   */
  getEntityActivity(
    entity: string,
    entityId: string,
    limit?: number,
  ): Promise<AuditLogActivityDTO[]>;

  /**
   * Delete old audit logs (for cleanup/retention policies)
   * @param retentionMonths - Delete logs older than this many months
   * @returns Number of deleted records
   */
  cleanupOldLogs(retentionMonths: number): Promise<number>;
}
