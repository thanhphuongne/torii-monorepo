import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BlogAnalyticsService } from './blog-analytics.service';

/**
 * Blog Analytics Scheduler
 * Handles scheduled tasks for blog analytics
 */
@Injectable()
export class BlogAnalyticsScheduler {
  private readonly logger = new Logger(BlogAnalyticsScheduler.name);

  constructor(private readonly blogAnalyticsService: BlogAnalyticsService) {}

  /**
   * Generate daily blog interaction statistics
   * Runs every day at 00:00 (midnight) to send daily summary to staff
   * Cron expression: '0 0 * * *' (at 00:00 every day)
   */
  @Cron('0 0 * * *', {
    name: 'daily-blog-analytics',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async handleDailyBlogAnalytics() {
    this.logger.log(
      '🕐 Daily blog analytics cronjob triggered (00:00 daily summary)',
    );
    try {
      await this.blogAnalyticsService.generateDailyBlogInteractionStats();
      this.logger.log('✅ Daily blog analytics completed successfully');
    } catch (error: any) {
      this.logger.error(
        `❌ Error in daily blog analytics cronjob: ${error?.message}`,
        error?.stack,
      );
    }
  }
}
