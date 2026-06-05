import type { TwoFactorAuth, Prisma } from '@prisma/generated';

/**
 * Two-Factor Authentication Repository Interface
 * Defines the contract for 2FA data access operations
 */
export interface ITwoFactorAuthRepository {
  /**
   * Find 2FA configuration by user ID
   * @param userId - The user's unique identifier
   * @returns The 2FA configuration if found, null otherwise
   */
  findByUserId(userId: string): Promise<TwoFactorAuth | null>;

  /**
   * Create or update 2FA configuration
   * @param userId - The user's unique identifier
   * @param createData - Data to use if creating new record
   * @param updateData - Data to use if updating existing record
   * @returns The upserted 2FA configuration
   */
  upsert(
    userId: string,
    createData: Prisma.TwoFactorAuthCreateInput,
    updateData: Prisma.TwoFactorAuthUpdateInput,
  ): Promise<TwoFactorAuth>;

  /**
   * Create 2FA configuration
   * @param data - 2FA creation data
   * @returns The created 2FA configuration
   */
  create(data: Prisma.TwoFactorAuthCreateInput): Promise<TwoFactorAuth>;

  /**
   * Update 2FA configuration
   * @param userId - The user's unique identifier
   * @param data - 2FA update data
   * @returns The updated 2FA configuration
   */
  update(
    userId: string,
    data: Prisma.TwoFactorAuthUpdateInput,
  ): Promise<TwoFactorAuth>;

  /**
   * Delete 2FA configuration
   * @param userId - The user's unique identifier
   * @returns The deleted 2FA configuration
   */
  delete(userId: string): Promise<TwoFactorAuth>;

  /**
   * Check if 2FA is enabled for user
   * @param userId - The user's unique identifier
   * @returns True if 2FA is enabled, false otherwise
   */
  isEnabled(userId: string): Promise<boolean>;

  /**
   * Update last used timestamp
   * @param userId - The user's unique identifier
   */
  updateLastUsed(userId: string): Promise<void>;

  /**
   * Increment failed authentication attempts
   * @param userId - The user's unique identifier
   * @returns The new count of failed attempts
   */
  incrementFailedAttempts(userId: string): Promise<number>;

  /**
   * Reset failed attempts and unlock account
   * @param userId - The user's unique identifier
   */
  resetFailedAttempts(userId: string): Promise<void>;

  /**
   * Lock account until specified time
   * @param userId - The user's unique identifier
   * @param until - The date/time until which the account is locked
   */
  lockAccount(userId: string, until: Date): Promise<void>;

  /**
   * Update backup codes
   * @param userId - The user's unique identifier
   * @param codes - Array of backup codes (should be hashed)
   */
  updateBackupCodes(userId: string, codes: string[]): Promise<void>;

  /**
   * Remove a specific backup code after use
   * @param userId - The user's unique identifier
   * @param index - Index of the backup code to remove
   */
  removeBackupCode(userId: string, index: number): Promise<void>;
}
