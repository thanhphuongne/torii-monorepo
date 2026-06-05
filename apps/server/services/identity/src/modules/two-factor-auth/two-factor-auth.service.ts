import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import Redis from 'ioredis';
import {
  PrismaService,
  REDIS_CLIENT,
  EncryptionService,
  AppConfigService,
} from '@server/shared';
import type { ITwoFactorAuthRepository } from '@server/identity/interfaces/repositories';
import { TWO_FACTOR_AUTH_REPOSITORY_TOKEN } from '@server/identity/interfaces/repositories';
import type {
  TwoFactorAuthStatus,
  TotpSetupResponse,
  EnableTotpResponse,
  TwoFactorMethod,
} from '@workspace/schemas';
import type { ITwoFactorAuthService } from '@server/identity/interfaces/services';

/**
 * Two-Factor Authentication Service
 * Handles TOTP (Google Authenticator) authentication only
 */
@Injectable()
export class TwoFactorAuthService implements ITwoFactorAuthService {
  private readonly logger = new Logger(TwoFactorAuthService.name);
  private readonly issuer: string;

  constructor(
    private readonly appConfig: AppConfigService,
    private readonly prisma: PrismaService, // Keep for user queries
    @Inject(TWO_FACTOR_AUTH_REPOSITORY_TOKEN)
    private readonly twoFactorAuthRepository: ITwoFactorAuthRepository,
    private readonly encryptionService: EncryptionService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    this.issuer = this.appConfig.identity.twoFactorIssuer;

    // Configure TOTP settings
    authenticator.options = {
      window: 1, // Allow 1 step before/after current time (30 seconds)
    };
  }

  // ========================================
  // TOTP Methods
  // ========================================

  /**
   * Generate TOTP secret and QR code for user
   */
  async generateTotpSecret(userId: string): Promise<TotpSetupResponse> {
    // Check if 2FA is already enabled
    const existing2FA = await this.twoFactorAuthRepository.findByUserId(userId);

    if (existing2FA && existing2FA.isEnabled) {
      throw new BadRequestException(
        '2FA is already enabled. Please disable it first if you want to reconfigure.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, displayName: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate secret
    const secret = authenticator.generateSecret();

    // Create otpauth URL for QR code
    const otpauthUrl = authenticator.keyuri(user.email, this.issuer, secret);

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

    this.logger.log(`Generated TOTP secret for user ${userId}`);

    return {
      secret,
      qrCodeUrl,
      manualEntryKey: secret,
    };
  }

  /**
   * Enable TOTP 2FA for user
   * Verifies the code before enabling
   */
  async enableTotp(
    userId: string,
    secret: string,
    code: string,
  ): Promise<EnableTotpResponse> {
    // Check if 2FA is already enabled
    const existing2FA = await this.twoFactorAuthRepository.findByUserId(userId);

    if (existing2FA && existing2FA.isEnabled) {
      throw new BadRequestException(
        '2FA is already enabled. Please disable it first if you want to reconfigure.',
      );
    }

    // Verify the code with the secret
    const isValid = authenticator.verify({ token: code, secret });

    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    // Encrypt secret before storing
    const encryptedSecret = this.encryptionService.encrypt(secret);

    // Generate backup codes
    const backupCodes = await this.generateBackupCodes(userId);

    // Save to database
    await this.twoFactorAuthRepository.upsert(
      userId,
      {
        user: { connect: { id: userId } },
        isEnabled: true,
        method: 'totp',
        totpSecret: encryptedSecret,
        totpBackupCodes: await this.hashBackupCodes(backupCodes),
        enabledAt: new Date(),
      },
      {
        isEnabled: true,
        method: 'totp',
        totpSecret: encryptedSecret,
        totpBackupCodes: await this.hashBackupCodes(backupCodes),
        enabledAt: new Date(),
        failedAttempts: 0,
        lockedUntil: null,
      },
    );

    this.logger.log(`TOTP 2FA enabled for user ${userId}`);

    return {
      success: true,
      backupCodes,
      message:
        'TOTP 2FA enabled successfully. Please save your backup codes in a safe place.',
    };
  }

  /**
   * Verify TOTP code
   */
  async verifyTotp(userId: string, code: string): Promise<boolean> {
    // Check rate limiting
    await this.checkRateLimit(userId);

    const twoFactorAuth =
      await this.twoFactorAuthRepository.findByUserId(userId);

    if (
      !twoFactorAuth ||
      !twoFactorAuth.isEnabled ||
      !twoFactorAuth.totpSecret
    ) {
      throw new BadRequestException('TOTP 2FA is not enabled');
    }

    // Check if account is locked
    if (twoFactorAuth.lockedUntil && twoFactorAuth.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil(
        (twoFactorAuth.lockedUntil.getTime() - Date.now()) / 60000,
      );
      throw new UnauthorizedException(
        `Account locked due to too many failed attempts. Try again in ${minutesLeft} minutes.`,
      );
    }

    // Decrypt secret
    const secret = this.encryptionService.decrypt(twoFactorAuth.totpSecret);

    // Verify code
    const isValid = authenticator.verify({ token: code, secret });

    if (isValid) {
      // Reset failed attempts
      await this.resetFailedAttempts(userId);

      // Update last used
      await this.twoFactorAuthRepository.updateLastUsed(userId);

      this.logger.log(`TOTP verification successful for user ${userId}`);
      return true;
    } else {
      // Increment failed attempts
      await this.incrementFailedAttempts(userId);
      return false;
    }
  }

  // ========================================
  // Backup Codes Methods
  // ========================================

  /**
   * Generate backup codes
   */
  private async generateBackupCodes(userId: string): Promise<string[]> {
    // Generate 10 random 8-character codes
    const codes = Array.from({ length: 10 }, () =>
      randomBytes(4).toString('hex').toUpperCase(),
    );

    this.logger.log(
      `Generated ${codes.length} backup codes for user ${userId}`,
    );
    return codes;
  }

  /**
   * Hash backup codes before storing
   */
  private async hashBackupCodes(codes: string[]): Promise<string[]> {
    return Promise.all(codes.map((code) => argon2.hash(code)));
  }

  /**
   * Verify backup code
   */
  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    // Check rate limiting
    await this.checkRateLimit(userId);

    const twoFactorAuth =
      await this.twoFactorAuthRepository.findByUserId(userId);

    if (!twoFactorAuth || !twoFactorAuth.isEnabled) {
      throw new BadRequestException('2FA is not enabled');
    }

    // Try to match against all backup codes
    for (let i = 0; i < twoFactorAuth.totpBackupCodes.length; i++) {
      const isValid = await argon2.verify(
        twoFactorAuth.totpBackupCodes[i],
        code,
      );

      if (isValid) {
        // Remove used code
        await this.twoFactorAuthRepository.removeBackupCode(userId, i);
        await this.twoFactorAuthRepository.updateLastUsed(userId);

        // Reset failed attempts
        await this.resetFailedAttempts(userId);

        const remaining = twoFactorAuth.totpBackupCodes.length - 1;
        this.logger.log(
          `Backup code used for user ${userId}. ${remaining} codes remaining.`,
        );
        return true;
      }
    }

    // Increment failed attempts
    await this.incrementFailedAttempts(userId);
    return false;
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    const twoFactorAuth =
      await this.twoFactorAuthRepository.findByUserId(userId);

    if (!twoFactorAuth || !twoFactorAuth.isEnabled) {
      throw new BadRequestException('2FA is not enabled');
    }

    // Generate new codes
    const newCodes = await this.generateBackupCodes(userId);

    // Update database
    await this.twoFactorAuthRepository.updateBackupCodes(
      userId,
      await this.hashBackupCodes(newCodes),
    );

    this.logger.log(`Regenerated backup codes for user ${userId}`);
    return newCodes;
  }

  // ========================================
  // Management Methods
  // ========================================

  /**
   * Disable 2FA
   */
  async disable2FA(userId: string): Promise<void> {
    await this.twoFactorAuthRepository.update(userId, {
      isEnabled: false,
      totpSecret: null,
      totpBackupCodes: [],
      failedAttempts: 0,
      lockedUntil: null,
    });

    this.logger.log(`2FA disabled for user ${userId}`);
  }

  /**
   * Get 2FA status
   */
  async get2FAStatus(userId: string): Promise<TwoFactorAuthStatus> {
    const twoFactorAuth =
      await this.twoFactorAuthRepository.findByUserId(userId);

    if (!twoFactorAuth || !twoFactorAuth.isEnabled) {
      return { isEnabled: false };
    }

    return {
      isEnabled: true,
      method: twoFactorAuth.method as TwoFactorMethod,
      backupCodesRemaining: twoFactorAuth.totpBackupCodes.length,
      enabledAt: twoFactorAuth.enabledAt || undefined,
      lastUsedAt: twoFactorAuth.lastUsedAt || undefined,
    };
  }

  // ========================================
  // Security Methods
  // ========================================

  /**
   * Check rate limiting
   */
  async checkRateLimit(userId: string): Promise<void> {
    const key = `2fa:attempts:${userId}`;
    const attempts = await this.redis.get(key);

    if (attempts && parseInt(attempts) >= 5) {
      // Check if account is locked
      const lockKey = `2fa:locked:${userId}`;
      const locked = await this.redis.get(lockKey);

      if (locked) {
        const ttl = await this.redis.ttl(lockKey);
        throw new UnauthorizedException(
          `Account locked. Try again in ${Math.ceil(ttl / 60)} minutes.`,
        );
      }
    }
  }

  /**
   * Increment failed attempts
   */
  async incrementFailedAttempts(userId: string): Promise<void> {
    const key = `2fa:attempts:${userId}`;
    const attempts = await this.redis.incr(key);

    if (attempts === 1) {
      await this.redis.expire(key, 900); // 15 minutes
    }

    if (attempts >= 5) {
      // Lock account for 30 minutes
      await this.redis.set(`2fa:locked:${userId}`, '1', 'EX', 1800);

      // Update database
      const lockUntil = new Date(Date.now() + 30 * 60 * 1000);
      await this.twoFactorAuthRepository.update(userId, {
        lockedUntil: lockUntil,
        failedAttempts: attempts,
      });

      this.logger.warn(
        `User ${userId} locked due to ${attempts} failed 2FA attempts`,
      );
    }
  }

  /**
   * Reset failed attempts
   */
  async resetFailedAttempts(userId: string): Promise<void> {
    await this.redis.del(`2fa:attempts:${userId}`);
    await this.redis.del(`2fa:locked:${userId}`);

    await this.twoFactorAuthRepository.resetFailedAttempts(userId);
  }
}
