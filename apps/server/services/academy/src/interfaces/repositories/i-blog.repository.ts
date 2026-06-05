import type { Blog, Prisma } from '@prisma/generated';

/**
 * Blog Repository Interface
 * Defines the contract for all blog data access operations
 */
export interface IBlogRepository {
  /**
   * Find blog by ID
   */
  findById(id: string): Promise<Blog | null>;

  /**
   * Find blog by slug
   */
  findBySlug(slug: string): Promise<Blog | null>;

  /**
   * Find multiple blogs with pagination and filters
   */
  findMany(options: {
    skip: number;
    take: number;
    where?: Prisma.BlogWhereInput;
    orderBy?: Prisma.BlogOrderByWithRelationInput;
  }): Promise<Blog[]>;

  /**
   * Count blogs with optional filter
   */
  count(where?: Prisma.BlogWhereInput): Promise<number>;

  /**
   * Create new blog
   */
  create(data: Prisma.BlogCreateInput): Promise<Blog>;

  /**
   * Update blog by ID
   */
  update(id: string, data: Prisma.BlogUpdateInput): Promise<Blog>;

  /**
   * Delete blog (hard delete)
   */
  delete(id: string): Promise<void>;

  /**
   * Check if slug exists
   */
  slugExists(slug: string): Promise<boolean>;

  /**
   * Increment view count
   */
  incrementViewCount(id: string): Promise<Blog>;
}
