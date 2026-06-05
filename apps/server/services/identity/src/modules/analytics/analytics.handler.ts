import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { PrismaService } from '@server/shared';

@Controller()
export class AnalyticsHandler {
  constructor(private readonly prisma: PrismaService) {}

  @MessagePattern({ cmd: 'identity.analytics.overview' })
  async getOverview() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalUsers, activeToday] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({
        where: {
          lastSignInAt: { gte: today },
          deletedAt: null,
        },
      }),
    ]);

    return { totalUsers, activeToday };
  }

  @MessagePattern({ cmd: 'identity.analytics.users' })
  async getUserStats() {
    const roles = await this.prisma.user.groupBy({
      by: ['role'],
      _count: { _all: true },
      where: { deletedAt: null },
    });

    // Get registrations by month for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const registrations = await this.prisma.user.findMany({
      where: { createdAt: { gte: sixMonthsAgo }, deletedAt: null },
      select: { createdAt: true },
    });

    const monthlyGrowth = registrations.reduce((acc: any, user) => {
      const month = user.createdAt.toLocaleString('default', {
        month: 'short',
      });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

    return {
      roles: roles.map((r) => ({ role: r.role, count: r._count._all })),
      monthlyGrowth: Object.entries(monthlyGrowth).map(([name, count]) => ({
        name,
        count,
      })),
      activityTrends: [],
    };
  }
}
