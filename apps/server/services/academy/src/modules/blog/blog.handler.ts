import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BlogService } from '@server/academy/modules/blog/blog.service';
import { BlogCreateDTO, BlogUpdateDTO, BlogQueryDTO } from '@workspace/schemas';

@Controller()
export class BlogHandler {
  constructor(private readonly blogService: BlogService) {}

  @MessagePattern({ cmd: 'academy.blog.findAll' })
  async findAll(@Payload() query: BlogQueryDTO) {
    return this.blogService.findAllBlogs(query);
  }

  @MessagePattern({ cmd: 'academy.blog.findBySlug' })
  async findBySlug(@Payload() data: { slug: string; showScheduled?: boolean }) {
    return this.blogService.findBlogBySlug(data.slug, data.showScheduled);
  }

  @MessagePattern({ cmd: 'academy.blog.findById' })
  async findById(@Payload() data: { id: string; showScheduled?: boolean }) {
    return this.blogService.findBlogById(data.id, data.showScheduled);
  }

  @MessagePattern({ cmd: 'academy.blog.incrementView' })
  async incrementView(@Payload() data: { id: string; ip?: string }) {
    return this.blogService.incrementViewCount(data.id, data.ip);
  }

  @MessagePattern({ cmd: 'academy.blog.create' })
  async create(@Payload() data: BlogCreateDTO & { requesterId?: string }) {
    const { requesterId, ...input } = data;
    return this.blogService.createBlog(input, requesterId);
  }

  @MessagePattern({ cmd: 'academy.blog.update' })
  async update(
    @Payload() data: { id: string; dto: BlogUpdateDTO; requesterId?: string },
  ) {
    return this.blogService.updateBlog(data.id, data.dto, data.requesterId);
  }

  @MessagePattern({ cmd: 'academy.blog.delete' })
  async delete(@Payload() data: { id: string; requesterId?: string }) {
    return this.blogService.deleteBlog(data.id, data.requesterId);
  }

  @MessagePattern({ cmd: 'academy.blog.publish' })
  async publish(@Payload() data: { id: string; requesterId?: string }) {
    return this.blogService.publishBlog(data.id, data.requesterId);
  }
}
