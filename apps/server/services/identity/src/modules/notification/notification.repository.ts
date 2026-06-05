import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@server/shared';
import type { Notification, Prisma } from '@prisma/generated';
import type { INotificationRepository } from '@server/identity/interfaces/repositories';

/**
 * Notification Repository
 * Handles all database operations for Notification entity
 */
@Injectable()
export class NotificationRepository implements INotificationRepository {
  private readonly logger = new Logger(NotificationRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find notification by ID
   */
  async findById(id: string): Promise<Notification | null> {
    return this.prisma.notification.findUnique({
      where: { id },
    });
  }

  /**
   * Find notification by ID and user ID
   */
  async findByIdAndUserId(
    id: string,
    userId: string,
  ): Promise<Notification | null> {
    return this.prisma.notification.findFirst({
      where: {
        id,
        userId,
      },
    });
  }

  /**
   * Find multiple notifications with pagination and filters
   */
  async findMany(options: {
    skip: number;
    take: number;
    where?: Prisma.NotificationWhereInput;
    orderBy?: Prisma.NotificationOrderByWithRelationInput;
  }): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: options.where,
      skip: options.skip,
      take: options.take,
      orderBy: options.orderBy || { createdAt: 'desc' },
    });
  }

  /**
   * Count notifications with optional filter
   */
  async count(where?: Prisma.NotificationWhereInput): Promise<number> {
    return this.prisma.notification.count({ where });
  }

  /**
   * Create new notification
   */
  async create(data: Prisma.NotificationCreateInput): Promise<Notification> {
    return this.prisma.notification.create({
      data,
    });
  }

  /**
   * Create multiple notifications (bulk insert)
   */
  async createMany(
    data: Prisma.NotificationCreateManyInput[],
  ): Promise<{ count: number }> {
    return this.prisma.notification.createMany({
      data,
    });
  }

  /**
   * Update notification by ID
   */
  async update(
    id: string,
    data: Prisma.NotificationUpdateInput,
  ): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id },
      data,
    });
  }

  /**
   * Update multiple notifications (bulk update)
   */
  async updateMany(
    where: Prisma.NotificationWhereInput,
    data: Prisma.NotificationUpdateInput,
  ): Promise<{ count: number }> {
    return this.prisma.notification.updateMany({
      where,
      data,
    });
  }

  /**
   * Delete notification by ID
   */
  async delete(id: string): Promise<void> {
    await this.prisma.notification.delete({
      where: { id },
    });
  }
}
