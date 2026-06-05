import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@server/shared';
import type { Blog, Prisma } from '@prisma/generated';
import type { IBlogRepository } from '@server/academy/interfaces/repositories/i-blog.repository';

/**
 * Blog Repository
 * Handles all database operations for Blog entity
 */
@Injectable()
export class BlogRepository implements IBlogRepository {
  private readonly logger = new Logger(BlogRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find blog by ID
   */
  async findById(id: string): Promise<Blog | null> {
    return this.prisma.blog.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    } as any) as any;
  }

  /**
   * Find blog by slug
   */
  async findBySlug(slug: string): Promise<Blog | null> {
    return this.prisma.blog.findUnique({
      where: { slug },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    } as any) as any;
  }

  /**
   * Find all blogs with pagination and filters
   */
  async findMany(options: {
    skip: number;
    take: number;
    where?: Prisma.BlogWhereInput;
    orderBy?: Prisma.BlogOrderByWithRelationInput;
  }): Promise<Blog[]> {
    return this.prisma.blog.findMany({
      where: options.where,
      skip: options.skip,
      take: options.take,
      orderBy: options.orderBy || { publishedAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    } as any) as any;
  }

  /**
   * Count blogs with optional filter
   */
  async count(where?: Prisma.BlogWhereInput): Promise<number> {
    return this.prisma.blog.count({ where });
  }

  /**
   * Create new blog
   */
  async create(data: Prisma.BlogCreateInput): Promise<Blog> {
    return this.prisma.blog.create({
      data,
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    } as any) as any;
  }

  /**
   * Update blog by ID
   */
  async update(id: string, data: Prisma.BlogUpdateInput): Promise<Blog> {
    return this.prisma.blog.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    } as any) as any;
  }

  /**
   * Delete blog (hard delete)
   */
  async delete(id: string): Promise<void> {
    await this.prisma.blog.delete({
      where: { id },
    });
  }

  /**
   * Check if slug exists
   */
  async slugExists(slug: string): Promise<boolean> {
    const blog = await this.findBySlug(slug);
    return !!blog;
  }

  /**
   * Increment view count
   */
  async incrementViewCount(id: string): Promise<Blog> {
    return this.prisma.blog.update({
      where: { id },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    });
  }
}
