import type {
  TwoFactorAuthStatus,
  TotpSetupResponse,
  EnableTotpResponse,
} from '@workspace/schemas';

/**
 * Two-Factor Authentication Service Interface
 * Defines the contract for 2FA operations (TOTP/Google Authenticator)
 */
export interface ITwoFactorAuthService {
  /**
   * Generate TOTP secret and QR code for user
   * @param userId - The user's unique identifier
   * @returns TOTP setup data including secret and QR code
   * @throws NotFoundException if user not found
   */
  generateTotpSecret(userId: string): Promise<TotpSetupResponse>;

  /**
   * Enable TOTP 2FA for user
   * Verifies the code before enabling
   * @param userId - The user's unique identifier
   * @param secret - The TOTP secret
   * @param code - The TOTP verification code
   * @returns Enabled response with backup codes
   * @throws UnauthorizedException if code is invalid
   * @throws NotFoundException if user not found
   */
  enableTotp(
    userId: string,
    secret: string,
    code: string,
  ): Promise<EnableTotpResponse>;

  /**
   * Verify TOTP code
   * @param userId - The user's unique identifier
   * @param code - The TOTP code to verify
   * @returns True if valid, false otherwise
   * @throws UnauthorizedException if account is locked
   */
  verifyTotp(userId: string, code: string): Promise<boolean>;

  /**
   * Verify backup code
   * @param userId - The user's unique identifier
   * @param code - The backup code to verify
   * @returns True if valid, false otherwise
   * @throws NotFoundException if user or 2FA config not found
   */
  verifyBackupCode(userId: string, code: string): Promise<boolean>;

  /**
   * Regenerate backup codes
   * @param userId - The user's unique identifier
   * @returns New array of backup codes
   * @throws NotFoundException if user or 2FA config not found
   */
  regenerateBackupCodes(userId: string): Promise<string[]>;

  /**
   * Disable 2FA for user
   * @param userId - The user's unique identifier
   * @throws NotFoundException if user or 2FA config not found
   */
  disable2FA(userId: string): Promise<void>;

  /**
   * Get 2FA status for user
   * @param userId - The user's unique identifier
   * @returns 2FA status information
   * @throws NotFoundException if user not found
   */
  get2FAStatus(userId: string): Promise<TwoFactorAuthStatus>;

  /**
   * Check rate limiting for 2FA attempts
   * @param userId - The user's unique identifier
   * @throws BadRequestException if rate limit exceeded
   */
  checkRateLimit(userId: string): Promise<void>;

  /**
   * Increment failed 2FA attempts
   * @param userId - The user's unique identifier
   */
  incrementFailedAttempts(userId: string): Promise<void>;

  /**
   * Reset failed 2FA attempts
   * @param userId - The user's unique identifier
   */
  resetFailedAttempts(userId: string): Promise<void>;
}
