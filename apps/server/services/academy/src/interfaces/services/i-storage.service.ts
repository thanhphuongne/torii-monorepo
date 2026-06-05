import type {
  StoragePresignedUrlRequestDTO,
  StoragePresignedUrlResponseDTO,
  StorageConfirmUploadRequestDTO,
  StorageConfirmUploadResponseDTO,
  StorageDeleteFileRequestDTO,
  StorageDeleteFileResponseDTO,
  StorageGetSignedUrlRequestDTO,
  StorageGetSignedUrlResponseDTO,
} from '@workspace/schemas';

/**
 * Storage Service Interface
 * Defines the contract for storage business logic operations
 *
 * Note: All file uploads must use presigned URLs (client-side upload).
 * Direct upload to server is not supported for performance optimization.
 */
export interface IStorageService {
  /**
   * Generate a presigned URL for direct client-side upload
   */
  generatePresignedUploadUrl(
    data: StoragePresignedUrlRequestDTO,
  ): Promise<StoragePresignedUrlResponseDTO>;

  /**
   * Confirm that a file has been uploaded
   */
  confirmUpload(
    data: StorageConfirmUploadRequestDTO,
  ): Promise<StorageConfirmUploadResponseDTO>;

  /**
   * Delete a file
   */
  deleteFile(
    data: StorageDeleteFileRequestDTO,
  ): Promise<StorageDeleteFileResponseDTO>;

  /**
   * Get a temporary signed URL for viewing a private file
   */
  getSignedUrl(
    data: StorageGetSignedUrlRequestDTO,
  ): Promise<StorageGetSignedUrlResponseDTO>;
}

export const STORAGE_SERVICE_TOKEN = Symbol('STORAGE_SERVICE');
