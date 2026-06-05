import { Injectable } from '@nestjs/common';
import { PrismaService } from '@server/shared/prisma/prisma.service';

export interface PopularCourse {
  id: string;
  title: string;
  totalStudents: number;
  jlptLevel: string;
  thumbnailUrl: string | null;
}

export interface LearningAnalyticsOverviewResponse {
  totalCourses: number;
  totalEnrollments: number;
  popularCourses: PopularCourse[];
  pendingApprovals: number;
  activeRooms: number;
}

export interface RecentSale {
  id: string;
  amount: string;
  userName: string;
  userEmail: string;
  date: string;
}

export interface RevenueByLevel {
  level: string;
  amount: number;
}

export interface BillingAnalyticsOverviewResponse {
  totalRevenue: number;
  recentSales: RecentSale[];
  growthData: { name: string; total: number }[];
  revenueByLevel: RevenueByLevel[];
}

@Injectable()
export class AnalyticsOverviewService {
  constructor(private readonly prisma: PrismaService) {}

  async getLearningOverview(): Promise<LearningAnalyticsOverviewResponse> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    const [totalCourses, totalEnrollments, pendingCourseApprovals, pendingCohortApprovals, pendingVodApprovals, activeRooms] =
      await Promise.all([
        this.prisma.courseProfile.count({
          where: { status: { not: 'ARCHIVED' } },
        }),
        this.prisma.enrollment.count({
          where: { status: 'ACTIVE' },
        }),
        this.prisma.courseProfile.count({
          where: { status: 'PENDING_APPROVAL' },
        }),
        this.prisma.cohort.count({
          where: { status: 'PENDING_APPROVAL' },
        }),
        this.prisma.vodPackage.count({
          where: { status: 'PENDING_APPROVAL' },
        }),
        this.prisma.liveScheduleSession.count({
          where: {
            sessionDate: { gte: startOfToday, lt: startOfTomorrow },
            status: { in: ['SCHEDULED', 'RESCHEDULED'] },
            roomId: { not: null },
          },
        }),
      ]);

    const pendingApprovals =
      pendingCourseApprovals + pendingCohortApprovals + pendingVodApprovals;

    const popularCourses = await this.getPopularCourses();

    return {
      totalCourses,
      totalEnrollments,
      popularCourses,
      pendingApprovals,
      activeRooms,
    };
  }

  private async getPopularCourses(): Promise<PopularCourse[]> {
    const countsByCourseProfileId = new Map<string, number>();

    // VOD enrollments -> vodPackageId -> courseProfileId
    const vodGrouped = await this.prisma.enrollment.groupBy({
      by: ['vodPackageId'],
      where: {
        status: 'ACTIVE',
        vodPackageId: { not: null },
      },
      _count: { _all: true },
    });

    const vodPackageIds = vodGrouped
      .map((g) => g.vodPackageId)
      .filter((id): id is string => !!id);

    const vodPackages = await this.prisma.vodPackage.findMany({
      where: { id: { in: vodPackageIds } },
      select: { id: true, courseProfileId: true },
    });
    const vodPackageById = new Map(vodPackages.map((vp) => [vp.id, vp]));

    for (const grouped of vodGrouped) {
      if (!grouped.vodPackageId) continue;
      const vp = vodPackageById.get(grouped.vodPackageId);
      if (!vp) continue;
      const cpId = vp.courseProfileId;
      const prev = countsByCourseProfileId.get(cpId) ?? 0;
      countsByCourseProfileId.set(cpId, prev + grouped._count._all);
    }

    // LIVE enrollments -> liveClassId -> cohort -> courseProfileId
    const liveGrouped = await this.prisma.enrollment.groupBy({
      by: ['liveClassId'],
      where: {
        status: 'ACTIVE',
        liveClassId: { not: null },
      },
      _count: { _all: true },
    });

    const liveClassIds = liveGrouped
      .map((g) => g.liveClassId)
      .filter((id): id is string => !!id);

    const liveClasses = await this.prisma.liveClass.findMany({
      where: { id: { in: liveClassIds } },
      select: {
        id: true,
        cohort: { select: { courseProfileId: true } },
      },
    });

    const liveClassById = new Map(
      liveClasses.map((lc) => [lc.id, lc]),
    );

    for (const grouped of liveGrouped) {
      if (!grouped.liveClassId) continue;
      const lc = liveClassById.get(grouped.liveClassId);
      if (!lc) continue;
      const cpId = lc.cohort.courseProfileId;
      const prev = countsByCourseProfileId.get(cpId) ?? 0;
      countsByCourseProfileId.set(cpId, prev + grouped._count._all);
    }

    const topEntries = Array.from(countsByCourseProfileId.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (topEntries.length === 0) return [];

    const topCourseProfileIds = topEntries.map(([id]) => id);
    const courseProfiles = await this.prisma.courseProfile.findMany({
      where: { id: { in: topCourseProfileIds } },
      select: { id: true, title: true, level: true, thumbnailUrl: true },
    });
    const courseProfileById = new Map(
      courseProfiles.map((cp) => [cp.id, cp]),
    );

    return topEntries
      .map(([cpId, totalStudents]) => {
        const cp = courseProfileById.get(cpId);
        if (!cp) return null;
        return {
          id: cp.id,
          title: cp.title,
          totalStudents,
          jlptLevel: cp.level ?? 'N/A',
          thumbnailUrl: cp.thumbnailUrl ?? null,
        } satisfies PopularCourse;
      })
      .filter((v): v is PopularCourse => v !== null);
  }

  async getBillingOverview(): Promise<BillingAnalyticsOverviewResponse> {
    const totalRevenueAgg = await this.prisma.order.aggregate({
      where: { status: 'PAID' },
      _sum: { grandTotal: true },
    });
    const totalRevenue = totalRevenueAgg._sum.grandTotal
      ? Number(totalRevenueAgg._sum.grandTotal)
      : 0;

    const recentOrders = await this.prisma.order.findMany({
      where: { status: 'PAID' },
      take: 6,
      orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        grandTotal: true,
        paidAt: true,
        createdAt: true,
        user: { select: { displayName: true, email: true } },
      },
    });

    const recentSales: RecentSale[] = recentOrders.map((o) => {
      const d = (o.paidAt ?? o.createdAt).toISOString().slice(0, 10);
      return {
        id: o.id,
        amount: o.grandTotal.toString(),
        userName: o.user.displayName,
        userEmail: o.user.email,
        date: d,
      };
    });

    // Group revenue by courseProfile level via order items snapshot relations.
    const orderItems = await this.prisma.orderItem.findMany({
      where: { order: { status: 'PAID' } },
      select: {
        price: true,
        vodPackage: {
          select: {
            courseProfile: { select: { level: true } },
          },
        },
        cohort: {
          select: {
            courseProfile: { select: { level: true } },
          },
        },
      },
    });

    const revenueByLevelMap = new Map<string, number>();

    for (const item of orderItems) {
      const level =
        item.vodPackage?.courseProfile?.level ??
        item.cohort?.courseProfile?.level;
      if (!level) continue;

      const amount = Number(item.price ?? 0);
      const prev = revenueByLevelMap.get(level) ?? 0;
      revenueByLevelMap.set(level, prev + amount);
    }

    const revenueByLevel = Array.from(revenueByLevelMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([level, amount]) => ({ level, amount }));

    return {
      totalRevenue,
      recentSales,
      growthData: [],
      revenueByLevel,
    };
  }
}

