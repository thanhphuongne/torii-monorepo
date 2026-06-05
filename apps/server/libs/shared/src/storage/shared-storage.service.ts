import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AppConfigService } from '../config/app-config.service';

export interface UploadOptions {
  /**
   * File key/path in R2/S3
   */
  key: string;

  /**
   * File buffer
   */
  file: Buffer;

  /**
   * MIME type
   */
  contentType: string;

  /**
   * Custom metadata
   */
  metadata?: Record<string, string>;
}

export interface GetUrlOptions {
  /**
   * File key/path in R2/S3
   */
  key: string;

  /**
   * Presigned URL expiration in seconds (default: 1 hour)
   */
  expiresIn?: number;
}

/**
 * Shared Storage Service
 * Provides reusable Cloudflare R2 storage functionality for all modules
 *
 * Environment Variables:
 * - R2_ACCESS_KEY_ID: R2 access key
 * - R2_SECRET_ACCESS_KEY: R2 secret key
 * - R2_ENDPOINT: R2 endpoint URL
 * - R2_BUCKET_NAME: R2 bucket name
 * - R2_ACCOUNT_ID: R2 account ID
 * - R2_PUBLIC_URL: Public URL for R2 bucket
 */
@Injectable()
export class SharedStorageService {
  private readonly logger = new Logger(SharedStorageService.name);
  private readonly r2Client: S3Client;
  private readonly bucketName: string;
  private readonly accountId: string;
  private readonly publicUrl: string;

  constructor(private readonly appConfig: AppConfigService) {
    const r2Config = this.appConfig.thirdParty.r2;

    this.bucketName = r2Config.bucketName || 'torii-uploads';
    this.accountId = r2Config.accountId || '';
    this.publicUrl =
      r2Config.publicUrl ||
      `https://${this.bucketName}.${this.accountId}.r2.cloudflarestorage.com`;

    const endpoint = r2Config.endpoint;
    const accessKeyId = r2Config.accessKeyId;
    const secretAccessKey = r2Config.secretAccessKey;

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      this.logger.warn(
        'R2 configuration is incomplete. Storage service may not function correctly.',
      );
      // We still initialize to avoid crash, but methods will likely fail
    }

    this.r2Client = new S3Client({
      region: 'auto',
      endpoint: endpoint || '',
      credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
      },
    });

    this.logger.log(
      `Storage service initialized with R2 (bucket: ${this.bucketName})`,
    );
  }

  /**
   * Upload file to R2 storage
   */
  async upload(options: UploadOptions): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: options.key,
        Body: options.file,
        ContentType: options.contentType,
        Metadata: options.metadata,
      });

      await this.r2Client.send(command);

      // Return public URL
      const fileUrl = `${this.publicUrl}/${options.key}`;
      this.logger.log(`File uploaded: ${options.key}`);

      return fileUrl;
    } catch (error) {
      this.logger.error(`Failed to upload file ${options.key}:`, error);
      throw new Error('Failed to upload file');
    }
  }

  /**
   * Delete file from R2 storage
   */
  async delete(key: string): Promise<void> {
    try {
      await this.r2Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );

      this.logger.log(`File deleted: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file ${key}:`, error);
      throw new Error('Failed to delete file');
    }
  }

  /**
   * Check if file exists in R2
   */
  async exists(key: string): Promise<boolean> {
    try {
      await this.r2Client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get presigned URL for temporary file access
   */
  async getPresignedUrl(options: GetUrlOptions): Promise<string> {
    try {
      const expiresIn = options.expiresIn || 3600; // 1 hour default

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: options.key,
      });

      return await getSignedUrl(this.r2Client, command, { expiresIn });
    } catch (error) {
      this.logger.error(
        `Failed to generate presigned URL for ${options.key}:`,
        error,
      );
      throw new Error('Failed to generate presigned URL');
    }
  }

  /**
   * Generate presigned upload URL for client-side uploads
   */
  async generatePresignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType,
      });

      return await getSignedUrl(this.r2Client, command, { expiresIn });
    } catch (error) {
      this.logger.error(
        `Failed to generate presigned upload URL for ${key}:`,
        error,
      );
      throw new Error('Failed to generate presigned upload URL');
    }
  }

  /**
   * Get public URL for file
   */
  getPublicUrl(key: string): string {
    const baseUrl = this.publicUrl.endsWith('/')
      ? this.publicUrl.slice(0, -1)
      : this.publicUrl;
    const normalizedKey = key.startsWith('/') ? key.substring(1) : key;
    return `${baseUrl}/${normalizedKey}`;
  }

  /**
   * Extract file key from R2 public URL
   */
  extractKeyFromUrl(fileUrl: string): string {
    try {
      const url = new URL(fileUrl);
      let key = url.pathname;

      // Remove all leading slashes to handle cases like //uploads/... or /uploads/...
      while (key.startsWith('/')) {
        key = key.substring(1);
      }

      if (!key) {
        throw new Error(`Invalid file URL format: ${fileUrl}`);
      }
      return decodeURIComponent(key);
    } catch (error) {
      this.logger.error(`Failed to extract key from URL: ${fileUrl}`, error);
      throw new Error(`Invalid file URL format: ${fileUrl}`);
    }
  }
}
