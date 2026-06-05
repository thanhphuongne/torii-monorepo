import { Injectable, Logger } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { AppConfigService } from '../config/app-config.service';

/**
 * Encryption Service
 * Provides AES-256-GCM encryption/decryption for sensitive data
 * Used for encrypting TOTP secrets in database
 */
@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private readonly appConfig: AppConfigService) {
    const encryptionKey = this.appConfig.security.encryptionKey;

    if (!encryptionKey) {
      throw new Error(
        'ENCRYPTION_KEY configuration is required. ' +
          "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
      );
    }

    if (encryptionKey.length !== 64) {
      throw new Error(
        'ENCRYPTION_KEY must be 64 characters (32 bytes in hex). ' +
          'Current length: ' +
          encryptionKey.length,
      );
    }

    this.key = Buffer.from(encryptionKey, 'hex');
    this.logger.log('EncryptionService initialized with AES-256-GCM');
  }

  /**
   * Encrypt text using AES-256-GCM
   * @param text Plain text to encrypt
   * @returns Encrypted string in format: iv:authTag:encrypted
   */
  encrypt(text: string): string {
    try {
      // Generate random IV (Initialization Vector)
      const iv = randomBytes(16);

      // Create cipher
      const cipher = createCipheriv(this.algorithm, this.key, iv);

      // Encrypt
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get auth tag for GCM mode
      const authTag = cipher.getAuthTag();

      // Return format: iv:authTag:encrypted
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      this.logger.error('Encryption failed', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt text using AES-256-GCM
   * @param encryptedData Encrypted string in format: iv:authTag:encrypted
   * @returns Decrypted plain text
   */
  decrypt(encryptedData: string): string {
    try {
      // Parse encrypted data
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const [ivHex, authTagHex, encrypted] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      // Create decipher
      const decipher = createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);

      // Decrypt
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error('Decryption failed', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Check if encryption key is properly configured
   */
  isConfigured(): boolean {
    return !!this.key && this.key.length === 32;
  }
}
