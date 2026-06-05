import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@server/shared';
import type { TwoFactorAuth, Prisma } from '@prisma/generated';
import type { ITwoFactorAuthRepository } from '@server/identity/interfaces/repositories';

/**
 * Two-Factor Authentication Repository
 * Handles all database operations for 2FA
 */
@Injectable()
export class TwoFactorAuthRepository implements ITwoFactorAuthRepository {
  private readonly logger = new Logger(TwoFactorAuthRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find 2FA configuration by user ID
   */
  async findByUserId(userId: string): Promise<TwoFactorAuth | null> {
    return this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    });
  }

  /**
   * Create or update 2FA configuration
   */
  async upsert(
    userId: string,
    createData: Prisma.TwoFactorAuthCreateInput,
    updateData: Prisma.TwoFactorAuthUpdateInput,
  ): Promise<TwoFactorAuth> {
    return this.prisma.twoFactorAuth.upsert({
      where: { userId },
      create: createData,
      update: updateData,
    });
  }

  /**
   * Create 2FA configuration
   */
  async create(data: Prisma.TwoFactorAuthCreateInput): Promise<TwoFactorAuth> {
    return this.prisma.twoFactorAuth.create({
      data,
    });
  }

  /**
   * Update 2FA configuration
   */
  async update(
    userId: string,
    data: Prisma.TwoFactorAuthUpdateInput,
  ): Promise<TwoFactorAuth> {
    return this.prisma.twoFactorAuth.update({
      where: { userId },
      data,
    });
  }

  /**
   * Delete 2FA configuration
   */
  async delete(userId: string): Promise<TwoFactorAuth> {
    return this.prisma.twoFactorAuth.delete({
      where: { userId },
    });
  }

  /**
   * Check if 2FA is enabled for user
   */
  async isEnabled(userId: string): Promise<boolean> {
    const twoFactorAuth = await this.findByUserId(userId);
    return twoFactorAuth?.isEnabled ?? false;
  }

  /**
   * Update last used timestamp
   */
  async updateLastUsed(userId: string): Promise<void> {
    await this.update(userId, {
      lastUsedAt: new Date(),
    });
  }

  /**
   * Increment failed attempts
   */
  async incrementFailedAttempts(userId: string): Promise<number> {
    const twoFactorAuth = await this.findByUserId(userId);
    const newAttempts = (twoFactorAuth?.failedAttempts ?? 0) + 1;

    await this.update(userId, {
      failedAttempts: newAttempts,
    });

    return newAttempts;
  }

  /**
   * Reset failed attempts and unlock account
   */
  async resetFailedAttempts(userId: string): Promise<void> {
    await this.update(userId, {
      failedAttempts: 0,
      lockedUntil: null,
    });
  }

  /**
   * Lock account until specified time
   */
  async lockAccount(userId: string, until: Date): Promise<void> {
    await this.update(userId, {
      lockedUntil: until,
    });
  }

  /**
   * Update backup codes
   */
  async updateBackupCodes(userId: string, codes: string[]): Promise<void> {
    await this.update(userId, {
      totpBackupCodes: codes,
    });
  }

  /**
   * Remove a backup code (after use)
   */
  async removeBackupCode(userId: string, index: number): Promise<void> {
    const twoFactorAuth = await this.findByUserId(userId);
    if (!twoFactorAuth) return;

    const updatedCodes = twoFactorAuth.totpBackupCodes.filter(
      (_, idx) => idx !== index,
    );

    await this.updateBackupCodes(userId, updatedCodes);
  }
}
