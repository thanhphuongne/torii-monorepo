import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SharedStorageService } from './shared-storage.service';

/**
 * Shared Storage Module
 * Provides S3/R2 storage functionality for all modules
 *
 * Environment Variables:
 * - STORAGE_PROVIDER: 's3' | 'r2' | 'mock' (default: 'mock')
 * - STORAGE_BUCKET_NAME: Default bucket name
 * - STORAGE_REGION: AWS region or 'auto' for R2
 * - STORAGE_ACCESS_KEY_ID: Access key
 * - STORAGE_SECRET_ACCESS_KEY: Secret key
 * - R2_ENDPOINT: Cloudflare R2 endpoint (only for R2)
 * - R2_PUBLIC_DOMAIN: Public domain for R2 (optional)
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [SharedStorageService],
  exports: [SharedStorageService],
})
export class SharedStorageModule {}
