import type { Notification, Prisma } from '@prisma/generated';

/**
 * Notification Repository Interface
 * Defines the contract for all notification data access operations
 */
export interface INotificationRepository {
  /**
   * Find notification by ID
   */
  findById(id: string): Promise<Notification | null>;

  /**
   * Find notification by ID and user ID
   */
  findByIdAndUserId(id: string, userId: string): Promise<Notification | null>;

  /**
   * Find multiple notifications with pagination and filters
   */
  findMany(options: {
    skip: number;
    take: number;
    where?: Prisma.NotificationWhereInput;
    orderBy?: Prisma.NotificationOrderByWithRelationInput;
  }): Promise<Notification[]>;

  /**
   * Count notifications with optional filter
   */
  count(where?: Prisma.NotificationWhereInput): Promise<number>;

  /**
   * Create new notification
   */
  create(data: Prisma.NotificationCreateInput): Promise<Notification>;

  /**
   * Create multiple notifications (bulk insert)
   */
  createMany(
    data: Prisma.NotificationCreateManyInput[],
  ): Promise<{ count: number }>;

  /**
   * Update notification by ID
   */
  update(
    id: string,
    data: Prisma.NotificationUpdateInput,
  ): Promise<Notification>;

  /**
   * Update multiple notifications (bulk update)
   */
  updateMany(
    where: Prisma.NotificationWhereInput,
    data: Prisma.NotificationUpdateInput,
  ): Promise<{ count: number }>;

  /**
   * Delete notification by ID
   */
  delete(id: string): Promise<void>;
}
