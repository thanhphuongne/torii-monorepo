import { Module } from '@nestjs/common';
import { PrismaModule, NatsClientModule } from '@server/shared';
import { BlogService } from '@server/academy/modules/blog/blog.service';
import { BlogRepository } from '@server/academy/modules/blog/blog.repository';
import { BlogProfile } from '@server/academy/infrastructure/mappings/blog.profile';
import { BlogAnalyticsService } from '@server/academy/modules/blog/blog-analytics.service';
import { BlogAnalyticsScheduler } from '@server/academy/modules/blog/blog-analytics.scheduler';
import { BlogHandler } from '@server/academy/modules/blog/blog.handler';

/**
 * Blog Feature Module
 * Handles blog operations
 */
@Module({
  imports: [PrismaModule, NatsClientModule],
  controllers: [BlogHandler],
  providers: [
    BlogRepository,
    BlogService,
    BlogProfile,
    BlogAnalyticsService,
    BlogAnalyticsScheduler,
  ],
  exports: [BlogService, BlogAnalyticsService],
})
export class BlogModule {}
