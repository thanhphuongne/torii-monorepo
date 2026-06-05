import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@server/shared';
import type { User, Prisma } from '@prisma/generated';
import type { IUsersRepository } from '@server/identity/interfaces/repositories';

/**
 * User Repository
 * Handles all database operations for User entity
 */
@Injectable()
export class UsersRepository implements IUsersRepository {
  private readonly logger = new Logger(UsersRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find user by ID
   */
  async findById(userId: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        identities: true,
        gamification: true,
      },
    });

    if (!user) return null;

    return user as any;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email: normalizedEmail },
      include: { gamification: true },
    });

    if (!user) return null;

    return user as any;
  }

  /**
   * Find all users with pagination and search
   */
  async findMany(options: {
    skip: number;
    take: number;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      where: options.where,
      skip: options.skip,
      take: options.take,
      orderBy: options.orderBy || { createdAt: 'desc' },
      include: {
        identities: true,
        gamification: true,
      },
    });

    return users as any;
  }

  /**
   * Count users with optional filter
   */
  async count(where?: Prisma.UserWhereInput): Promise<number> {
    return this.prisma.user.count({ where });
  }

  /**
   * Create new user
   */
  async create(data: Prisma.UserCreateInput): Promise<User> {
    const user = await this.prisma.user.create({
      data: {
        ...data,
        gamification: {
          create: {
            level: 1,
            currentXp: 0,
            totalXp: 0,
            currentStreak: 0,
            longestStreak: 0,
          },
        },
      },
      include: { gamification: true },
    });

    return user as any;
  }

  /**
   * Update user by ID
   */
  async update(userId: string, data: Prisma.UserUpdateInput): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: { gamification: true },
    });

    return user as any;
  }

  /**
   * Update user by email
   */
  async updateByEmail(
    email: string,
    data: Prisma.UserUpdateInput,
  ): Promise<User> {
    const normalizedEmail = email.toLowerCase();
    const user = await this.prisma.user.update({
      where: { email: normalizedEmail },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: { gamification: true },
    });

    return user as any;
  }

  /**
   * Delete user (hard delete)
   */
  async delete(userId: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id: userId },
    });
  }

  /**
   * Soft delete user
   */
  async softDelete(userId: string): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
      include: { gamification: true },
    });

    return user as any;
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string, excludeUserId?: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        id: excludeUserId ? { not: excludeUserId } : undefined,
      },
    });
    return !!user;
  }

  /**
   * Get user basic info with specific fields
   */
  async getUserBasicInfo(userId: string): Promise<{
    id: string;
    email: string;
    displayName: string;
    role: string;
    xp: number;
    level: number;
    balance: number;
    walletBalance: number;
    isOnboarded: boolean;
    avatarUrl: string | null;
    jlptTarget: string | null;
    currentLevel: string | null;
    userMetadata: Record<string, unknown> | null;
    verifiedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  } | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        isOnboarded: true,
        avatarUrl: true,
        jlptTarget: true,
        currentLevel: true,
        userMetadata: true,
        verifiedAt: true,
        createdAt: true,
        updatedAt: true,
        walletBalance: true,
        gamification: {
          select: {
            totalXp: true,
            level: true,
            points: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    // Ensure userMetadata is properly typed (Prisma Json type can be Prisma.JsonValue)
    const userMetadata = user.userMetadata
      ? typeof user.userMetadata === 'object' &&
        user.userMetadata !== null &&
        !Array.isArray(user.userMetadata)
        ? (user.userMetadata as Record<string, unknown>)
        : null
      : null;

    return {
      ...user,
      userMetadata,
      points: user.gamification?.points || 0,
    } as any;
  }

  /**
   * Update email verification timestamp
   */
  async markEmailAsVerified(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        verifiedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Find users by role
   */
  async findByRole(role: string): Promise<User[]> {
    return this.prisma.user.findMany({
      where: { role },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Count users by role
   */
  async countByRole(role: string): Promise<number> {
    return this.prisma.user.count({
      where: { role },
    });
  }

  /**
   * Save user's target for course recommendation (no separate survey table).
   * Also mirrors jlptTarget to userMetadata for backward-compat consumers.
   */
  async saveOnboardingSurvey(userId: string, data: any): Promise<User> {
    const jlptTarget =
      typeof data?.jlptTarget === 'string'
        ? String(data.jlptTarget).toUpperCase()
        : null;
    const currentLevel =
      typeof data?.currentLevel === 'string' ? String(data.currentLevel) : null;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { userMetadata: true },
    });

    const rawMeta = user?.userMetadata;
    const metaObj =
      rawMeta &&
      typeof rawMeta === 'object' &&
      rawMeta !== null &&
      !Array.isArray(rawMeta)
        ? (rawMeta as Record<string, unknown>)
        : {};

    const mergedMeta =
      jlptTarget != null ? { ...metaObj, jlptTarget } : metaObj;

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        isOnboarded: true,
        jlptTarget,
        currentLevel,
        userMetadata: mergedMeta as any,
      },
      include: { gamification: true },
    });
  }
}
