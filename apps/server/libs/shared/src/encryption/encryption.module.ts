import { Module, Global } from '@nestjs/common';
import { EncryptionService } from './encryption.service';

/**
 * Encryption Module
 * Provides encryption/decryption services globally
 */
@Global()
@Module({
  providers: [EncryptionService],
  exports: [EncryptionService],
})
export class EncryptionModule {}
