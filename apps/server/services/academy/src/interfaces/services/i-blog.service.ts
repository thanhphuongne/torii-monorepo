import type {
  BlogCreateDTO,
  BlogUpdateDTO,
  BlogQueryDTO,
  BlogResponseDTO,
  PaginatedResponseDTO,
} from '@workspace/schemas';

/**
 * Blog Service Interface
 * Defines the contract for blog business logic operations
 */
export interface IBlogService {
  /**
   * Create new blog
   */
  createBlog(dto: BlogCreateDTO): Promise<BlogResponseDTO>;

  /**
   * Find all blogs with pagination and filters
   */
  findAllBlogs(
    query: BlogQueryDTO,
  ): Promise<PaginatedResponseDTO<BlogResponseDTO>>;

  /**
   * Find blog by ID
   */
  findBlogById(id: string, showScheduled?: boolean): Promise<BlogResponseDTO>;

  /**
   * Update blog
   */
  updateBlog(id: string, dto: BlogUpdateDTO): Promise<BlogResponseDTO>;

  /**
   * Delete blog
   */
  deleteBlog(id: string): Promise<{ success: boolean }>;

  /**
   * Increment view count for a blog
   */
  incrementViewCount(id: string, ip?: string): Promise<void>;

  /**
   * Find blog by slug
   */
  findBlogBySlug(
    slug: string,
    showScheduled?: boolean,
  ): Promise<BlogResponseDTO>;

  /**
   * Publish blog
   */
  publishBlog(id: string): Promise<BlogResponseDTO>;
}
