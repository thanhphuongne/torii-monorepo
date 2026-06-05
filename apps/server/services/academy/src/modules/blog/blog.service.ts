import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { InjectMapper } from '@automapper/nestjs';
import type { Mapper } from '@automapper/core';
import { PrismaService, generateSlug, REDIS_CLIENT } from '@server/shared';
import Redis from 'ioredis';
import { BlogStatus, PaginatedResponseDTO } from '@workspace/schemas';
import type {
  BlogCreateDTO,
  BlogUpdateDTO,
  BlogQueryDTO,
  BlogResponseDTO,
} from '@workspace/schemas';
import type { Blog, Prisma } from '@prisma/generated';
import type { IBlogService } from '@server/academy/interfaces/services/i-blog.service';
import { BlogRepository } from '@server/academy/modules/blog/blog.repository';
import { AuditLoggerService } from '../audit-logger.service';

/**
 * Blog Service
 * Handles business logic for blogs
 */
@Injectable()
export class BlogService implements IBlogService {
  private readonly logger = new Logger(BlogService.name);

  constructor(
    private readonly blogRepository: BlogRepository,
    private readonly prisma: PrismaService,
    @InjectMapper() private readonly mapper: Mapper,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly audit: AuditLoggerService,
  ) {}

  /**
   * Map Blog entity to BlogResponseDTO using AutoMapper
   */
  private toBlogResponseDTO(blog: Blog): BlogResponseDTO {
    return this.mapper.map<Blog, BlogResponseDTO>(
      blog,
      'Blog',
      'BlogResponseDTO',
    );
  }

  /**
   * Ensure unique slug by appending date and timestamp if needed
   */
  private async ensureUniqueSlug(
    baseSlug: string,
    checkExists: (slug: string) => Promise<boolean>,
  ): Promise<string> {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const slug = `${baseSlug}-${dateStr}`;

    const existing = await checkExists(slug);

    if (!existing) {
      return slug;
    }

    // If slug exists, append timestamp to ensure uniqueness
    const timestamp = Date.now();
    return `${baseSlug}-${dateStr}-${timestamp}`;
  }

  /**
   * Create new blog blog
   */
  async createBlog(
    dto: BlogCreateDTO,
    requesterId?: string,
  ): Promise<BlogResponseDTO> {
    // Auto-generate slug from title if not provided
    const baseSlug = dto.slug || generateSlug(dto.title);

    // Auto-generate unique slug if slug already exists
    const slug = await this.ensureUniqueSlug(baseSlug, async (slugToCheck) =>
      this.blogRepository.slugExists(slugToCheck),
    );

    const finalDto = { ...dto, slug };

    // authorId is required
    if (!dto.authorId) {
      throw new BadRequestException('Author ID is required');
    }

    // Check if author exists in User table
    const user = await this.prisma.user.findUnique({
      where: { id: dto.authorId },
    });

    if (!user) {
      throw new NotFoundException(`Author with id "${dto.authorId}" not found`);
    }

    // Create blog
    // Determine status and publication date
    if (finalDto.status === BlogStatus.PUBLISHED && !finalDto.publishedAt) {
      // If setting to published without a date, use now
      finalDto.publishedAt = new Date();
    } else if (finalDto.publishedAt) {
      const pubDate = new Date(finalDto.publishedAt);
      if (pubDate > new Date()) {
        // Future date means scheduled
        finalDto.status = BlogStatus.SCHEDULED;
      } else if (finalDto.status === BlogStatus.SCHEDULED || !finalDto.status) {
        // Past date for a scheduled post means it's effectively published
        finalDto.status = BlogStatus.PUBLISHED;
      }
    }

    // Create blog
    const blog = await this.blogRepository.create({
      title: finalDto.title,
      slug: finalDto.slug,
      excerpt: finalDto.excerpt || null,
      content: finalDto.content,
      coverImageUrl: finalDto.coverImageUrl,
      status: finalDto.status || BlogStatus.DRAFT,
      publishedAt: finalDto.publishedAt || null,
      author: {
        connect: {
          id: finalDto.authorId,
        },
      },
    });

    await this.audit.log({
      userId: requesterId || finalDto.authorId,
      action: 'blog.create',
      entity: 'Blog',
      entityId: blog.id,
      description: `Created blog: "${blog.title}" with status ${blog.status}`,
      newValues: { title: blog.title, status: blog.status, slug: blog.slug },
    });

    return this.toBlogResponseDTO(blog);
  }

  /**
   * Find all blogs with pagination and filters
   */
  async findAllBlogs(
    query: BlogQueryDTO,
  ): Promise<PaginatedResponseDTO<BlogResponseDTO>> {
    const pageNum = parseInt(String(query.page || 1), 10);
    const limitNum = parseInt(String(query.limit || 10), 10);
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.BlogWhereInput = {
      AND: [],
    };
    const and = where.AND as Prisma.BlogWhereInput[];

    if (query.authorId) {
      and.push({ authorId: query.authorId });
    }

    // Handle status filtering with "Virtual Publication" logic
    if (query.status === BlogStatus.PUBLISHED) {
      // "Published" view includes explicitly published + passed scheduled posts
      and.push({
        OR: [
          { status: BlogStatus.PUBLISHED },
          {
            status: BlogStatus.SCHEDULED,
            publishedAt: { lte: new Date() },
          },
        ],
      });
    } else if (query.status === BlogStatus.SCHEDULED) {
      if (query.showScheduled) {
        // Admin view for "Scheduled" tab usually wants future posts
        // But if they want ALL scheduled, we could just filter by status.
        // For now, let's keep it to Future only in the "Scheduled" tab if it's the specific filter.
        and.push({
          status: BlogStatus.SCHEDULED,
          publishedAt: { gt: new Date() },
        });
      } else {
        // Public view for "Scheduled" (rare) only shows passed ones
        and.push({
          status: BlogStatus.SCHEDULED,
          publishedAt: { lte: new Date() },
        });
      }
    } else if (query.status) {
      and.push({ status: query.status });
    }

    // Search filter
    if (query.search) {
      and.push({
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { content: { contains: query.search, mode: 'insensitive' } },
          { slug: { contains: query.search, mode: 'insensitive' } },
        ],
      });
    }

    // If no filters added, remove the empty AND
    if (and.length === 0) {
      delete where.AND;
    }

    const orderBy: Prisma.BlogOrderByWithRelationInput = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = query.sortOrder || 'desc';
    } else {
      orderBy.publishedAt = 'desc';
    }

    const [blogs, total] = await Promise.all([
      this.blogRepository.findMany({
        where,
        skip,
        take: limitNum,
        orderBy,
      }),
      this.blogRepository.count(where),
    ]);

    return {
      data: blogs.map((blog) => this.toBlogResponseDTO(blog)),
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  /**
   * Find blog by ID
   */
  async findBlogById(
    id: string,
    showScheduled = false,
  ): Promise<BlogResponseDTO> {
    const blog = await this.blogRepository.findById(id);

    if (!blog) {
      throw new NotFoundException(`Blog with id "${id}" not found`);
    }

    // Check if scheduled
    const isScheduled = blog.status === BlogStatus.SCHEDULED;
    const isFutureScheduled = isScheduled && (!blog.publishedAt || new Date(blog.publishedAt) > new Date());
    
    // Block if it is a future scheduled post and not requesting to show it
    if (isFutureScheduled && !showScheduled) {
      throw new NotFoundException(`Blog with id "${id}" not found`);
    }

    return this.toBlogResponseDTO(blog);
  }

  /**
   * Increment view count for a blog
   */
  async incrementViewCount(id: string, ip?: string): Promise<void> {
    const blog = await this.blogRepository.findById(id);

    if (!blog) {
      throw new NotFoundException(`Blog with id "${id}" not found`);
    }

    // Check if scheduled (don't count views for scheduled posts if public)
    const isScheduled = blog.status === BlogStatus.SCHEDULED;
    const isFutureScheduled = isScheduled && (!blog.publishedAt || new Date(blog.publishedAt) > new Date());
    if (isFutureScheduled) return;

    // IP Throttling: 1 view per IP per blog every 5 seconds
    if (ip && ip !== 'unknown') {
      const key = `blog_view_throttle:${ip}:${id}`;
      const exists = await this.redis.get(key);
      if (exists) return; // Throttle

      await this.redis.set(key, '1', 'EX', 3600);
    }

    await this.blogRepository.incrementViewCount(id);
  }

  /**
   * Find blog by slug
   */
  async findBlogBySlug(
    slug: string,
    showScheduled = false,
  ): Promise<BlogResponseDTO> {
    const blog = await this.blogRepository.findBySlug(slug);

    if (!blog) {
      throw new NotFoundException(`Blog with slug "${slug}" not found`);
    }

    // Check if scheduled
    const isScheduled = blog.status === BlogStatus.SCHEDULED;
    const isFutureScheduled = isScheduled && (!blog.publishedAt || new Date(blog.publishedAt) > new Date());
    
    // Block if it is a future scheduled post and not requesting to show it
    if (isFutureScheduled && !showScheduled) {
      throw new NotFoundException(`Blog with slug "${slug}" not found`);
    }

    return this.toBlogResponseDTO(blog);
  }

  /**
   * Update blog
   */
  async updateBlog(
    id: string,
    dto: BlogUpdateDTO,
    requesterId?: string,
  ): Promise<BlogResponseDTO> {
    const existing = await this.blogRepository.findById(id);

    if (!existing) {
      throw new NotFoundException(`Blog with id "${id}" not found`);
    }

    // If title is being updated, regenerate slug
    let slug = existing.slug;
    if (dto.title && dto.title !== existing.title) {
      const baseSlug = dto.slug || generateSlug(dto.title);
      slug = await this.ensureUniqueSlug(baseSlug, async (slugToCheck) => {
        const slugExists = await this.blogRepository.findBySlug(slugToCheck);
        return !!slugExists && slugExists.id !== id;
      });
    } else if (dto.slug && dto.slug !== existing.slug) {
      const slugExists = await this.blogRepository.findBySlug(dto.slug);

      if (slugExists) {
        throw new BadRequestException(
          `Blog with slug "${dto.slug}" already exists`,
        );
      }
      slug = dto.slug;
    }

    const updateData: Prisma.BlogUpdateInput = { ...dto };

    // Update slug if it was regenerated
    if (slug !== existing.slug) {
      updateData.slug = slug;
    }

    // Intelligent status/date handling
    if (dto.status || dto.publishedAt !== undefined) {
      const status = dto.status || existing.status;
      const publishedAt =
        dto.publishedAt !== undefined ? dto.publishedAt : existing.publishedAt;

      if (status === BlogStatus.PUBLISHED && !publishedAt) {
        // If becoming published but has no date, set to now
        updateData.publishedAt = new Date();
        updateData.status = BlogStatus.PUBLISHED;
      } else if (publishedAt) {
        const pubDate = new Date(publishedAt);
        if (pubDate > new Date()) {
          // Future date -> Always SCHEDULED
          updateData.status = BlogStatus.SCHEDULED;
        } else if (
          status === BlogStatus.SCHEDULED ||
          status === BlogStatus.DRAFT
        ) {
          // Past date and currently scheduled/draft -> effectively PUBLISHED
          // Only auto-publish if it was intended to be scheduled/published
          if (
            status !== BlogStatus.DRAFT ||
            dto.status === BlogStatus.PUBLISHED
          ) {
            updateData.status = BlogStatus.PUBLISHED;
          }
        }
      }
    }

    const blog = await this.blogRepository.update(id, updateData);

    await this.audit.log({
      userId: requesterId || existing.authorId,
      action: 'blog.update',
      entity: 'Blog',
      entityId: id,
      description: `Updated blog: "${existing.title}"`,
      oldValues: { title: existing.title, status: existing.status },
      newValues: { title: blog.title, status: blog.status },
    });

    return this.toBlogResponseDTO(blog);
  }

  /**
   * Publish blog (change status to published)
   */
  async publishBlog(
    id: string,
    requesterId?: string,
  ): Promise<BlogResponseDTO> {
    const blog = await this.blogRepository.findById(id);

    if (!blog) {
      throw new NotFoundException(`Blog with id "${id}" not found`);
    }

    if (blog.status === BlogStatus.PUBLISHED) {
      throw new BadRequestException('Blog is already published');
    }

    const updated = await this.blogRepository.update(id, {
      status: BlogStatus.PUBLISHED,
      publishedAt: new Date(),
    });

    await this.audit.log({
      userId: requesterId || blog.authorId,
      action: 'blog.publish',
      entity: 'Blog',
      entityId: id,
      description: `Published blog: "${blog.title}"`,
      oldValues: { status: blog.status },
      newValues: { status: BlogStatus.PUBLISHED },
    });

    return this.toBlogResponseDTO(updated);
  }

  /**
   * Delete blog
   */
  async deleteBlog(id: string, requesterId?: string) {
    const blog = await this.blogRepository.findById(id);

    if (!blog) {
      throw new NotFoundException(`Blog with id "${id}" not found`);
    }

    await this.blogRepository.delete(id);

    await this.audit.log({
      userId: requesterId || blog.authorId,
      action: 'blog.delete',
      entity: 'Blog',
      entityId: id,
      description: `Deleted blog: "${blog.title}" (status: ${blog.status})`,
      metadata: { slug: blog.slug, title: blog.title },
    });

    return { success: true };
  }
}
