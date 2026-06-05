import { Injectable, Logger, Inject } from '@nestjs/common';
import { Prisma } from '@prisma/generated';
import type { IAuditLogRepository } from '@server/identity/interfaces/repositories';
import type {
  AuditLogEntryDTO,
  AuditLogFiltersDTO,
  PaginatedResponseDTO,
  AuditLogResponseDTO,
  AuditLogActivityDTO,
} from '@workspace/schemas';
import type { IAuditLogService } from '@server/identity/interfaces/services';
import { AUDIT_LOG_REPOSITORY_TOKEN } from '@server/identity/interfaces/repositories';
import type { AuditLogWithUser } from '@server/identity/modules/audit/audit-log.repository';

@Injectable()
export class AuditLogService implements IAuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @Inject(AUDIT_LOG_REPOSITORY_TOKEN)
    private readonly auditLogRepository: IAuditLogRepository,
  ) {}

  /**
   * Helper to filter out noise from values and optionally compare changes
   */
  private formatAuditValues(
    oldValues: any,
    newValues: any,
  ): { old: any; new: any } {
    const noiseFields = [
      'id',
      'createdAt',
      'updatedAt',
      'deletedAt',
      'totalLessons',
      'totalQuizzes',
      'totalStudents',
      'totalReviews',
      'averageRating',
      'slug',
      'createdBy',
      'approvedBy',
      'approvedAt',
    ];

    const clean = (obj: any) => {
      if (!obj || typeof obj !== 'object') return obj;
      const result: any = {};
      for (const key in obj) {
        if (!noiseFields.includes(key)) {
          result[key] = obj[key];
        }
      }
      return result;
    };

    const cleanedOld = clean(oldValues);
    const cleanedNew = clean(newValues);

    if (
      cleanedOld &&
      cleanedNew &&
      typeof cleanedOld === 'object' &&
      typeof cleanedNew === 'object'
    ) {
      const finalOld: any = {};
      const finalNew: any = {};
      let hasChanges = false;

      const allKeys = new Set([
        ...Object.keys(cleanedOld),
        ...Object.keys(cleanedNew),
      ]);
      for (const key of allKeys) {
        const valOld = JSON.stringify(cleanedOld[key]);
        const valNew = JSON.stringify(cleanedNew[key]);

        if (valOld !== valNew) {
          finalOld[key] = cleanedOld[key];
          finalNew[key] = cleanedNew[key];
          hasChanges = true;
        }
      }
      return hasChanges
        ? { old: finalOld, new: finalNew }
        : { old: null, new: null };
    }

    return { old: cleanedOld, new: cleanedNew };
  }

  /**
   * Log an action to the audit log
   */
  async log(entry: AuditLogEntryDTO): Promise<void> {
    try {
      console.log('📝 AuditLog.log() called with entry:', {
        userId: entry.userId,
        action: entry.action,
        entity: entry.entity,
      });

      const { old, new: newValue } = this.formatAuditValues(
        entry.oldValues,
        entry.newValues,
      );

      await this.auditLogRepository.create({
        user: {
          connect: { id: entry.userId },
        },
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        description: entry.description,
        metadata: entry.metadata || {},
        oldValues: old || Prisma.DbNull,
        newValues: newValue || Prisma.DbNull,
      });

      this.logger.log(
        `Audit: ${entry.action} by user ${entry.userId} on ${entry.entity}`,
      );
      console.log('✅ Audit log created successfully');
    } catch (error) {
      this.logger.error('Failed to create audit log:', error);
      console.error('❌ Audit log creation failed:', error);
    }
  }

  /**
   * Query audit logs with filters and pagination
   */
  async query(
    filters: AuditLogFiltersDTO,
  ): Promise<PaginatedResponseDTO<AuditLogResponseDTO>> {
    const { page = 1, limit = 50, startDate, endDate, ...where } = filters;

    const pageNum =
      typeof page === 'string' ? parseInt(page, 10) : Number(page) || 1;
    const limitNum =
      typeof limit === 'string' ? parseInt(limit, 10) : Number(limit) || 50;

    const whereClause: any = {};

    if (where.userId && where.userId !== '') whereClause.userId = where.userId;
    if (where.action && where.action !== '') whereClause.action = where.action;
    if (where.entity && where.entity !== '') whereClause.entity = where.entity;
    if (where.entityId && where.entityId !== '')
      whereClause.entityId = where.entityId;

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        const sDate = new Date(startDate);
        if (!isNaN(sDate.getTime())) {
          whereClause.createdAt.gte = sDate;
        }
      }
      if (endDate) {
        const eDate = new Date(endDate);
        if (!isNaN(eDate.getTime())) {
          eDate.setHours(23, 59, 59, 999);
          whereClause.createdAt.lte = eDate;
        }
      }
    }

    const [rawData, total] = await Promise.all([
      this.auditLogRepository.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
              role: true,
            },
          },
        },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      this.auditLogRepository.count(whereClause),
    ]);

    // Map Prisma AuditLog to AuditLogResponseDTO
    const data: AuditLogResponseDTO[] = rawData.map(
      (log: AuditLogWithUser) => ({
        id: log.id,
        userId: log.userId,
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        description: log.description,
        metadata: log.metadata as Record<string, unknown> | null,
        oldValues: log.oldValues as Record<string, unknown> | null,
        newValues: log.newValues as Record<string, unknown> | null,
        createdAt: log.createdAt,
        user: log.user
          ? {
              id: log.user.id,
              email: log.user.email,
              displayName: log.user.displayName,
              role: log.user.role,
            }
          : undefined,
      }),
    );

    return {
      data,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  /**
   * Get recent activity for a user
   */
  async getUserActivity(
    userId: string,
    limit = 20,
  ): Promise<AuditLogActivityDTO[]> {
    return this.auditLogRepository.findByUserId(userId, limit);
  }

  /**
   * Get activity summary for entity
   */
  async getEntityActivity(
    entity: string,
    entityId: string,
    limit = 20,
  ): Promise<AuditLogActivityDTO[]> {
    return this.auditLogRepository.findByEntity(entity, entityId, limit);
  }

  /**
   * Delete old audit logs (for cleanup/retention policies)
   */
  async cleanupOldLogs(retentionMonths: number): Promise<number> {
    const date = new Date();
    date.setMonth(date.getMonth() - retentionMonths);

    this.logger.log(
      `Cleaning up audit logs older than ${retentionMonths} months (before ${date.toISOString()})`,
    );

    try {
      const deletedCount = await this.auditLogRepository.deleteOlderThan(date);
      this.logger.log(`Successfully deleted ${deletedCount} old audit logs`);
      return deletedCount;
    } catch (error) {
      this.logger.error('Failed to cleanup old audit logs:', error);
      throw error;
    }
  }
}
