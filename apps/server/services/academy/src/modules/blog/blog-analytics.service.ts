import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from '@server/shared';

/**
 * Blog Analytics Service
 * Handles analytics and statistics for blogs
 */
@Injectable()
export class BlogAnalyticsService {
  private readonly logger = new Logger(BlogAnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('NATS_SERVICE')
    private readonly natsClient: ClientProxy,
  ) {}

  /**
   * Generate daily interaction statistics for staff blogs
   * This should be called daily at 00:00 to send summary of interactions from the previous day
   */
  async generateDailyBlogInteractionStats(): Promise<void> {
    try {
      this.logger.log(
        'Starting daily blog interaction statistics generation (daily summary at 00:00)...',
      );

      // Get current time in Asia/Ho_Chi_Minh timezone
      const now = new Date();
      const asiaHCMOffsetHours = 7;

      // Get current date in Asia/Ho_Chi_Minh
      const nowAsiaHCM = new Date(
        now.getTime() +
          now.getTimezoneOffset() * 60 * 1000 +
          asiaHCMOffsetHours * 60 * 60 * 1000,
      );

      // Calculate yesterday (previous day) in Asia/Ho_Chi_Minh
      const yesterdayStart = new Date(nowAsiaHCM);
      yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1);
      yesterdayStart.setUTCHours(0, 0, 0, 0);

      const yesterdayEnd = new Date(yesterdayStart);
      yesterdayEnd.setUTCHours(23, 59, 59, 999);

      // Convert to UTC for database queries
      const startUTC = new Date(
        yesterdayStart.getTime() - asiaHCMOffsetHours * 60 * 60 * 1000,
      );
      const endUTC = new Date(
        yesterdayEnd.getTime() - asiaHCMOffsetHours * 60 * 60 * 1000,
      );

      // Format date string for metadata (YYYY-MM-DD)
      const dateString = yesterdayStart.toISOString().split('T')[0];

      // Find all published blogs
      const allPublishedBlogs = await this.prisma.blog.findMany({
        where: {
          status: 'published',
          publishedAt: {
            not: null,
          },
        },
        select: {
          id: true,
          title: true,
          authorId: true,
          publishedAt: true,
        },
      });

      const validBlogs = allPublishedBlogs.filter((blog) => {
        if (!blog.publishedAt) return false;
        const publishedAtAsiaHCM = new Date(
          blog.publishedAt.getTime() + asiaHCMOffsetHours * 60 * 60 * 1000,
        );
        const publishedDate = publishedAtAsiaHCM.toISOString().split('T')[0];
        return publishedDate <= dateString;
      });

      for (const blog of validBlogs) {
        try {
          // Check if notification already exists
          const existingNotifications = await this.prisma.$queryRaw<
            Array<{ id: string }>
          >`
            SELECT id
            FROM notifications
            WHERE user_id = ${blog.authorId}::uuid
              AND notification_type = 'blog_analytics'
              AND data->>'blogId' = ${blog.id}
              AND data->>'date' = ${dateString}
            LIMIT 1
          `;

          if (existingNotifications && existingNotifications.length > 0) {
            continue;
          }

          // Count comments
          const commentsInRange = await this.prisma.comment.count({
            where: {
              targets: {
                some: {
                  targetId: blog.id,
                  targetType: 'BLOG',
                },
              },
              status: {
                not: 'deleted',
              },
              createdAt: {
                gte: startUTC,
                lte: endUTC,
              },
            },
          });

          if (commentsInRange > 0) {
            const message = `Bài viết "${blog.title}" của bạn đã nhận được ${commentsInRange} bình luận trong ngày ${dateString}`;

            this.natsClient.emit(
              { cmd: 'send_notification' },
              {
                recipientId: blog.authorId,
                type: 'DAILY_SUMMARY',
                payload: {
                  title: 'Thống kê tương tác bài viết',
                  body: message,
                  metadata: {
                    blogId: blog.id,
                    blogTitle: blog.title,
                    commentCount: commentsInRange,
                    date: dateString,
                    totalInteractions: commentsInRange,
                  },
                },
              },
            );
          }
        } catch (error: any) {
          this.logger.error(
            `Failed to process blog ${blog.id}: ${error?.message}`,
          );
        }
      }
    } catch (error: any) {
      this.logger.error(
        'Error generating daily blog interaction statistics:',
        error,
      );
      throw error;
    }
  }
}
