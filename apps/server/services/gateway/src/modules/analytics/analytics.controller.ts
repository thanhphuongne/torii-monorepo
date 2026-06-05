import { Controller, Get, Inject, UseGuards, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  successResponse,
  errorResponse,
  GatewayAuthGuard,
} from '@server/shared';

@Controller('api/analytics')
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  @Get('overview')
  @UseGuards(GatewayAuthGuard)
  async getPlatformOverview() {
    try {
      // Fetch stats from multiple services in parallel
      const [identityStats, learningStats, billingStats, ticketStats] =
        await Promise.all([
          firstValueFrom(
            this.natsClient.send({ cmd: 'identity.analytics.overview' }, {}),
          ).catch(() => ({ totalUsers: 0, activeToday: 0 })),
          firstValueFrom(
            this.natsClient.send({ cmd: 'learning.analytics.overview' }, {}),
          ).catch(() => ({
            totalCourses: 0,
            totalEnrollments: 0,
            popularCourses: [],
            pendingApprovals: 0,
            activeRooms: 0,
          })),
          firstValueFrom(
            this.natsClient.send({ cmd: 'billing.analytics.overview' }, {}),
          ).catch(() => ({
            totalRevenue: 0,
            recentSales: [],
            growthData: [],
            revenueByLevel: [],
          })),
          firstValueFrom(
            this.natsClient.send(
              { cmd: 'academy.analytics.tickets' },
              {},
            ),
          ).catch(() => ({ pendingCount: 0, refundCount: 0 })),
        ]);

      return successResponse({
        overview: {
          totalUsers: identityStats.totalUsers,
          activeToday: identityStats.activeToday,
          totalCourses: learningStats.totalCourses,
          totalEnrollments: learningStats.totalEnrollments,
          totalRevenue: billingStats.totalRevenue,
          pendingApprovals: learningStats.pendingApprovals,
          activeRooms: learningStats.activeRooms,
          pendingTickets: ticketStats.pendingCount,
          pendingRefunds: ticketStats.refundCount,
        },
        popularCourses: learningStats.popularCourses,
        recentSales: billingStats.recentSales,
        growthData: billingStats.growthData || [],
        revenueByLevel: billingStats.revenueByLevel || [],
      });
    } catch (error: any) {
      this.logger.error('Failed to fetch platform overview', error.stack);
      return errorResponse('Failed to fetch platform overview');
    }
  }

  @Get('users')
  @UseGuards(GatewayAuthGuard)
  async getUserAnalytics() {
    try {
      const stats = await firstValueFrom(
        this.natsClient.send({ cmd: 'identity.analytics.users' }, {}),
      );
      return successResponse(stats);
    } catch (error: any) {
      return errorResponse('Failed to fetch user analytics');
    }
  }

  @Get('courses')
  @UseGuards(GatewayAuthGuard)
  async getCourseAnalytics() {
    try {
      const stats = await firstValueFrom(
        this.natsClient.send({ cmd: 'learning.analytics.courses' }, {}),
      );
      return successResponse(stats);
    } catch (error: any) {
      return errorResponse('Failed to fetch course analytics');
    }
  }
}
