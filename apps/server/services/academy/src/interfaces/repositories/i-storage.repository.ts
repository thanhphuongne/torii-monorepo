import type { FileAsset, Prisma } from '@prisma/generated';

/**
 * Storage Repository Interface
 * Defines the contract for FileAsset data access operations
 */
export interface IStorageRepository {
  /**
   * Find file asset by ID
   */
  findById(fileId: string): Promise<FileAsset | null>;

  /**
   * Find file asset by URL
   */
  findByUrl(fileUrl: string): Promise<FileAsset | null>;

  /**
   * Create new file asset
   */
  create(data: Prisma.FileAssetCreateInput): Promise<FileAsset>;

  /**
   * Update file asset
   */
  update(fileId: string, data: Prisma.FileAssetUpdateInput): Promise<FileAsset>;

  /**
   * Delete file asset
   */
  delete(fileId: string): Promise<void>;

  /**
   * Find many file assets with pagination and filtering
   */
  findMany(options: {
    skip: number;
    take: number;
    where?: Prisma.FileAssetWhereInput;
    orderBy?: Prisma.FileAssetOrderByWithRelationInput;
  }): Promise<FileAsset[]>;

  /**
   * Count file assets with optional filter
   */
  count(where?: Prisma.FileAssetWhereInput): Promise<number>;
}

export const STORAGE_REPOSITORY_TOKEN = Symbol('STORAGE_REPOSITORY');
