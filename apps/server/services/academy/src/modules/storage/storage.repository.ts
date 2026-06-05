import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@server/shared';
import type { FileAsset, Prisma } from '@prisma/generated';
import type { IStorageRepository } from '@server/academy/interfaces/repositories/i-storage.repository';

@Injectable()
export class StorageRepository implements IStorageRepository {
  private readonly logger = new Logger(StorageRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findById(fileId: string): Promise<FileAsset | null> {
    return this.prisma.fileAsset.findUnique({
      where: { id: fileId },
    });
  }

  async findByUrl(fileUrl: string): Promise<FileAsset | null> {
    return this.prisma.fileAsset.findUnique({
      where: { fileUrl },
    });
  }

  async create(data: Prisma.FileAssetCreateInput): Promise<FileAsset> {
    return this.prisma.fileAsset.create({
      data,
    });
  }

  async update(
    fileId: string,
    data: Prisma.FileAssetUpdateInput,
  ): Promise<FileAsset> {
    return this.prisma.fileAsset.update({
      where: { id: fileId },
      data,
    });
  }

  async delete(fileId: string): Promise<void> {
    await this.prisma.fileAsset.delete({
      where: { id: fileId },
    });
  }

  async findMany(options: {
    skip: number;
    take: number;
    where?: Prisma.FileAssetWhereInput;
    orderBy?: Prisma.FileAssetOrderByWithRelationInput;
  }): Promise<FileAsset[]> {
    return this.prisma.fileAsset.findMany({
      skip: options.skip,
      take: options.take,
      where: options.where,
      orderBy: options.orderBy,
    });
  }

  async count(where?: Prisma.FileAssetWhereInput): Promise<number> {
    return this.prisma.fileAsset.count({
      where,
    });
  }
}
