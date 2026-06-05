import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@server/shared';
import type { UserIdentity, Prisma } from '@prisma/generated';
import type { IUserIdentityRepository } from '@server/identity/interfaces/repositories';

/**
 * User Identity Repository
 * Handles database operations for OAuth provider identities
 */
@Injectable()
export class UserIdentityRepository implements IUserIdentityRepository {
  private readonly logger = new Logger(UserIdentityRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all identities for a user
   */
  async findByUserId(userId: string): Promise<UserIdentity[]> {
    return this.prisma.userIdentity.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Find identity by provider and provider ID
   */
  async findByProvider(
    provider: string,
    providerId: string,
  ): Promise<UserIdentity | null> {
    return this.prisma.userIdentity.findUnique({
      where: {
        provider_providerId: {
          provider,
          providerId,
        },
      },
    });
  }

  /**
   * Find identity by ID
   */
  async findById(id: string): Promise<UserIdentity | null> {
    return this.prisma.userIdentity.findUnique({
      where: { id },
    });
  }

  /**
   * Create new identity
   */
  async create(data: Prisma.UserIdentityCreateInput): Promise<UserIdentity> {
    return this.prisma.userIdentity.create({
      data,
    });
  }

  /**
   * Update last sign in timestamp
   */
  async updateLastSignIn(id: string): Promise<void> {
    await this.prisma.userIdentity.update({
      where: { id },
      data: { lastSignInAt: new Date() },
    });
  }

  /**
   * Delete identity
   */
  async delete(id: string): Promise<void> {
    await this.prisma.userIdentity.delete({
      where: { id },
    });
  }

  /**
   * Get list of providers for a user
   */
  async getProviders(userId: string): Promise<string[]> {
    const identities = await this.findByUserId(userId);
    return identities.map((identity) => identity.provider);
  }

  /**
   * Check if user has a specific provider
   */
  async hasProvider(userId: string, provider: string): Promise<boolean> {
    const identity = await this.prisma.userIdentity.findFirst({
      where: { userId, provider },
    });
    return !!identity;
  }

  /**
   * Count identities for a user
   */
  async countByUserId(userId: string): Promise<number> {
    return this.prisma.userIdentity.count({
      where: { userId },
    });
  }
}
