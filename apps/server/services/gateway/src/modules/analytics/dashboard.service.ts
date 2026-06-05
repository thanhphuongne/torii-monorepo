import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '@server/shared';
import type {
  AdminDashboardResponseDTO,
  AdminPresenceStatsDTO,
  DashboardChartDatum,
  LecturerDashboardPendingSubmissionDTO,
  LecturerDashboardResponseDTO,
  RevenueAnalyticsResponseDTO,
  StaffAcademicDashboardResponseDTO,
  StaffOperationsDashboardResponseDTO,
} from '@workspace/schemas';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  async getStaffAcademicDashboard(): Promise<StaffAcademicDashboardResponseDTO> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    const [totalCourses, totalEnrollments, activeRooms] = await Promise.all([
      this.prisma.courseProfile.count({
        where: { status: { not: 'ARCHIVED' } },
      }),
      this.prisma.enrollment.count({
        where: { status: 'ACTIVE' },
      }),
      this.prisma.liveScheduleSession.count({
        where: {
          sessionDate: { gte: startOfToday, lt: startOfTomorrow },
          status: { in: ['SCHEDULED', 'RESCHEDULED'] },
          roomId: { not: null },
        },
      }),
    ]);

    const [pendingCourseProfiles, pendingCohorts, pendingVodPackages] =
      await Promise.all([
        this.prisma.courseProfile.count({
          where: { status: 'PENDING_APPROVAL' },
        }),
        this.prisma.cohort.count({
          where: { status: 'PENDING_APPROVAL' },
        }),
        this.prisma.vodPackage.count({
          where: { status: 'PENDING_APPROVAL' },
        }),
      ]);

    const pendingApprovals =
      pendingCourseProfiles + pendingCohorts + pendingVodPackages;

    const [pendingCourseRows, pendingCohortRows, pendingVodRows] = await Promise.all([
      this.prisma.courseProfile.findMany({
        where: { status: 'PENDING_APPROVAL' },
        orderBy: { updatedAt: 'desc' },
        take: 20,
        select: { id: true, title: true, code: true, updatedAt: true },
      }),
      this.prisma.cohort.findMany({
        where: { status: 'PENDING_APPROVAL' },
        orderBy: { updatedAt: 'desc' },
        take: 20,
        select: { id: true, name: true, code: true, updatedAt: true },
      }),
      this.prisma.vodPackage.findMany({
        where: { status: 'PENDING_APPROVAL' },
        orderBy: { updatedAt: 'desc' },
        take: 20,
        select: { id: true, title: true, code: true, updatedAt: true },
      }),
    ]);

    const pendingApprovalPreview = [
      ...pendingCourseRows.map((r) => ({
        id: r.id,
        kind: 'COURSE_PROFILE' as const,
        title: r.title,
        code: r.code,
        updatedAt: r.updatedAt,
      })),
      ...pendingCohortRows.map((r) => ({
        id: r.id,
        kind: 'COHORT' as const,
        title: r.name,
        code: r.code,
        updatedAt: r.updatedAt,
      })),
      ...pendingVodRows.map((r) => ({
        id: r.id,
        kind: 'VOD_PACKAGE' as const,
        title: r.title,
        code: r.code,
        updatedAt: r.updatedAt,
      })),
    ]
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 20)
      .map((r) => ({
        id: r.id,
        kind: r.kind,
        title: r.title,
        code: r.code,
        updatedAt: r.updatedAt.toISOString(),
      }));

    const pendingApprovalsByType: DashboardChartDatum[] = [
      { name: 'Course Profiles', value: pendingCourseProfiles },
      { name: 'Cohorts', value: pendingCohorts },
      { name: 'VOD Packages', value: pendingVodPackages },
    ].sort((a, b) => b.value - a.value);

    return {
      stats: {
        totalCourses,
        totalEnrollments,
        activeRooms,
        pendingApprovals,
      },
      pendingApprovalsByType,
      pendingApprovalPreview,
    };
  }

  async getStaffOperationsDashboard(): Promise<StaffOperationsDashboardResponseDTO> {
    const billingOverview = await firstValueFrom(
      this.natsClient.send({ cmd: 'billing.analytics.overview' }, {}),
    );

    const ticketStats = await firstValueFrom(
      this.natsClient.send({ cmd: 'academy.analytics.tickets' }, {}),
    );

    const ordersByStatusGroups = await this.prisma.order.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    const ordersByStatus: DashboardChartDatum[] = ordersByStatusGroups
      .map((g) => ({ name: g.status as string, value: g._count._all }))
      .sort((a, b) => b.value - a.value);

    const paidOrders = await this.prisma.order.count({
      where: { status: 'PAID' },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setUTCHours(0, 0, 0, 0);
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29);

    const [recentOrderRows, revenueDayRows] = await Promise.all([
      this.prisma.order.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          code: true,
          status: true,
          grandTotal: true,
          createdAt: true,
          paidAt: true,
          user: { select: { displayName: true, email: true } },
        },
      }),
      this.prisma.$queryRaw<Array<{ day: Date; total: unknown }>>`
        SELECT (DATE_TRUNC('day', COALESCE(paid_at, created_at) AT TIME ZONE 'UTC'))::date AS day,
               COALESCE(SUM(grand_total), 0)::float AS total
        FROM academy_orders
        WHERE status = 'PAID'
          AND COALESCE(paid_at, created_at) >= ${thirtyDaysAgo}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
    ]);

    const recentOrders = recentOrderRows.map((o) => {
      const at = o.paidAt ?? o.createdAt;
      return {
        id: o.id,
        code: o.code,
        status: o.status,
        amount: o.grandTotal.toString(),
        userName: o.user.displayName ?? '',
        userEmail: o.user.email ?? '',
        date: at.toISOString().slice(0, 10),
      };
    });

    const revenueLast30Days = this.buildRevenueLast30DaysSeries(
      thirtyDaysAgo,
      revenueDayRows,
    );

    return {
      stats: {
        totalRevenue: Number(billingOverview?.totalRevenue ?? 0),
        pendingTickets: ticketStats?.pendingCount ?? 0,
        pendingRefunds: ticketStats?.refundCount ?? 0,
        paidOrders,
      },
      ordersByStatus,
      revenueByLevel: (billingOverview?.revenueByLevel ?? []).map((r: any) => ({
        level: String(r.level),
        amount: Number(r.amount ?? 0),
      })),
      recentSales: (billingOverview?.recentSales ?? []).map((s: any) => ({
        id: String(s.id),
        amount: String(s.amount ?? '0'),
        userName: String(s.userName ?? ''),
        userEmail: String(s.userEmail ?? ''),
        date: String(s.date ?? ''),
      })),
      recentOrders,
      revenueLast30Days,
    };
  }

  /** 30 điểm (UTC date), gán 0 cho ngày không có đơn PAID */
  private buildRevenueLast30DaysSeries(
    startUtcMidnight: Date,
    rows: Array<{ day: Date; total: unknown }>,
  ): { date: string; amount: number }[] {
    const byDay = new Map<string, number>();
    for (const r of rows) {
      const d = r.day instanceof Date ? r.day : new Date(r.day as string);
      const key = d.toISOString().slice(0, 10);
      byDay.set(key, Number(r.total) || 0);
    }

    const out: { date: string; amount: number }[] = [];
    const cursor = new Date(startUtcMidnight);
    for (let i = 0; i < 30; i++) {
      const key = cursor.toISOString().slice(0, 10);
      out.push({ date: key, amount: byDay.get(key) ?? 0 });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return out;
  }

  /**
   * Thống kê phiên đăng nhập & hoạt động gần đây (không phải WebSocket realtime).
   * - Session: phiên còn hiệu lực theo bảng `sessions`.
   * - 15 phút / hôm nay: theo `users.last_sign_in_at`.
   */
  async getPresenceStats(): Promise<AdminPresenceStatsDTO> {
    const measuredAt = new Date();
    const startOfToday = new Date(measuredAt);
    startOfToday.setHours(0, 0, 0, 0);
    const fifteenMinAgo = new Date(measuredAt.getTime() - 15 * 60 * 1000);

    const [totalUsers, activeToday, activeSessionCount, sessionUserGroups, usersSignedInLast15Minutes] =
      await Promise.all([
        this.prisma.user.count({ where: { deletedAt: null } }),
        this.prisma.user.count({
          where: {
            deletedAt: null,
            lastSignInAt: { gte: startOfToday },
          },
        }),
        this.prisma.session.count({
          where: {
            expiresAt: { gt: measuredAt },
            revokedAt: null,
          },
        }),
        this.prisma.session.groupBy({
          by: ['userId'],
          where: {
            expiresAt: { gt: measuredAt },
            revokedAt: null,
          },
        }),
        this.prisma.user.count({
          where: {
            deletedAt: null,
            lastSignInAt: { gte: fifteenMinAgo },
          },
        }),
      ]);

    return {
      totalUsers,
      activeToday,
      usersWithActiveSession: sessionUserGroups.length,
      activeSessionCount,
      usersSignedInLast15Minutes,
      measuredAt: measuredAt.toISOString(),
    };
  }

  async getAdminDashboard(): Promise<AdminDashboardResponseDTO> {
    const [staffAcademic, staffOperations, presence] = await Promise.all([
      this.getStaffAcademicDashboard(),
      this.getStaffOperationsDashboard(),
      this.getPresenceStats(),
    ]);

    return {
      presence,
      staffAcademic,
      staffOperations,
    };
  }

  async getRevenueAnalytics(input: {
    fromDate?: string;
    toDate?: string;
  }): Promise<RevenueAnalyticsResponseDTO> {
    const todayUtc = new Date();
    const toDate = (input.toDate || todayUtc.toISOString().slice(0, 10)).trim();
    const fromDate = (input.fromDate || toDate).trim();

    // Parse YYYY-MM-DD into UTC midnight boundaries.
    const from = new Date(`${fromDate}T00:00:00.000Z`);
    const toInclusive = new Date(`${toDate}T00:00:00.000Z`);
    if (Number.isNaN(from.getTime()) || Number.isNaN(toInclusive.getTime())) {
      // fallback: today only
      const fallback = todayUtc.toISOString().slice(0, 10);
      return this.getRevenueAnalytics({ fromDate: fallback, toDate: fallback });
    }

    // Clamp range to 366 days to avoid heavy queries.
    const maxDays = 366;
    const diffDays = Math.floor(
      (toInclusive.getTime() - from.getTime()) / (24 * 60 * 60 * 1000),
    );
    const safeTo =
      diffDays > maxDays ? new Date(from.getTime() + maxDays * 86400000) : toInclusive;

    const toExclusive = new Date(safeTo.getTime() + 24 * 60 * 60 * 1000);

    const [totalRow, paidOrders, revenueDayRows, payMethodRows, productRows, recentPaidRows] =
      await Promise.all([
        this.prisma.$queryRaw<Array<{ total: unknown }>>`
          SELECT COALESCE(SUM(grand_total), 0)::float AS total
          FROM academy_orders
          WHERE status = 'PAID'
            AND COALESCE(paid_at, created_at) >= ${from}
            AND COALESCE(paid_at, created_at) < ${toExclusive}
        `,
        this.prisma.order.count({
          where: {
            status: 'PAID',
            OR: [
              { paidAt: { gte: from, lt: toExclusive } },
              { paidAt: null, createdAt: { gte: from, lt: toExclusive } },
            ],
          },
        }),
        this.prisma.$queryRaw<Array<{ day: Date; total: unknown }>>`
          SELECT (DATE_TRUNC('day', COALESCE(paid_at, created_at) AT TIME ZONE 'UTC'))::date AS day,
                 COALESCE(SUM(grand_total), 0)::float AS total
          FROM academy_orders
          WHERE status = 'PAID'
            AND COALESCE(paid_at, created_at) >= ${from}
            AND COALESCE(paid_at, created_at) < ${toExclusive}
          GROUP BY 1
          ORDER BY 1 ASC
        `,
        this.prisma.$queryRaw<Array<{ name: string; value: unknown }>>`
          SELECT payment_method::text AS name,
                 COALESCE(SUM(grand_total), 0)::float AS value
          FROM academy_orders
          WHERE status = 'PAID'
            AND COALESCE(paid_at, created_at) >= ${from}
            AND COALESCE(paid_at, created_at) < ${toExclusive}
          GROUP BY 1
          ORDER BY 2 DESC
        `,
        this.prisma.$queryRaw<
          Array<{
            type: string;
            amount: unknown;
          }>
        >`
          SELECT
            CASE
              WHEN oi.cohort_id IS NOT NULL THEN 'COHORT'
              WHEN oi.vod_package_id IS NOT NULL THEN 'VOD_PACKAGE'
              WHEN oi.live_class_id IS NOT NULL THEN 'LIVE_CLASS'
              WHEN oi.subscription_plan_id IS NOT NULL THEN 'AI_SUBSCRIPTION'
              ELSE 'UNKNOWN'
            END AS type,
            COALESCE(SUM(oi.price), 0)::float AS amount
          FROM academy_orders o
          JOIN academy_order_items oi ON oi.order_id = o.id
          WHERE o.status = 'PAID'
            AND COALESCE(o.paid_at, o.created_at) >= ${from}
            AND COALESCE(o.paid_at, o.created_at) < ${toExclusive}
          GROUP BY 1
          ORDER BY 2 DESC
        `,
        this.prisma.order.findMany({
          where: {
            status: 'PAID',
            OR: [
              { paidAt: { gte: from, lt: toExclusive } },
              { paidAt: null, createdAt: { gte: from, lt: toExclusive } },
            ],
          },
          take: 20,
          orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            code: true,
            status: true,
            grandTotal: true,
            createdAt: true,
            paidAt: true,
            user: { select: { displayName: true, email: true } },
          },
        }),
      ]);

    const totalRevenue = Number(totalRow?.[0]?.total ?? 0);
    const avgOrderValue = paidOrders > 0 ? totalRevenue / paidOrders : 0;

    const byDay = new Map<string, number>();
    for (const r of revenueDayRows) {
      const d = r.day instanceof Date ? r.day : new Date(r.day as any);
      const key = d.toISOString().slice(0, 10);
      byDay.set(key, Number(r.total) || 0);
    }

    const revenueByDay: { date: string; amount: number }[] = [];
    const cursor = new Date(from);
    while (cursor < toExclusive) {
      const key = cursor.toISOString().slice(0, 10);
      revenueByDay.push({ date: key, amount: byDay.get(key) ?? 0 });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    const revenueByPaymentMethod = payMethodRows.map((r) => ({
      name: String(r.name),
      value: Number(r.value) || 0,
    }));

    const revenueByProductType = productRows.map((r) => ({
      type: String(r.type) as any,
      amount: Number(r.amount) || 0,
    }));

    const recentPaidOrders = recentPaidRows.map((o) => {
      const at = o.paidAt ?? o.createdAt;
      return {
        id: o.id,
        code: o.code,
        status: o.status,
        amount: o.grandTotal.toString(),
        userName: o.user.displayName ?? '',
        userEmail: o.user.email ?? '',
        date: at.toISOString().slice(0, 10),
      };
    });

    return {
      fromDate,
      toDate: safeTo.toISOString().slice(0, 10),
      stats: {
        totalRevenue,
        paidOrders,
        avgOrderValue,
      },
      revenueByDay,
      revenueByPaymentMethod,
      revenueByProductType,
      recentPaidOrders,
    };
  }

  /**
   * Dashboard giảng viên: chỉ số theo instructorId = user đăng nhập.
   * Bài chờ chấm: SubmissionStatus SUBMITTED, grade null, assignment thuộc lớp/VOD do GV phụ trách.
   */
  async getLecturerDashboard(
    lecturerUserId: string,
  ): Promise<LecturerDashboardResponseDTO> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    const assignmentScope = {
      OR: [
        { liveClass: { instructorId: lecturerUserId } },
        { vodPackage: { instructorId: lecturerUserId } },
      ],
    };

    const [
      pendingSubmissionsToGrade,
      todaySessions,
      activeLiveClasses,
      studentsInMyClasses,
      pendingRows,
    ] = await Promise.all([
      this.prisma.assignmentSubmission.count({
        where: {
          status: 'SUBMITTED',
          grade: null,
          liveClassAssignment: assignmentScope,
        },
      }),
      this.prisma.liveScheduleSession.count({
        where: {
          sessionDate: { gte: startOfToday, lt: startOfTomorrow },
          status: { in: ['SCHEDULED', 'RESCHEDULED'] },
          OR: [
            { liveClass: { instructorId: lecturerUserId } },
            { instructorId: lecturerUserId },
          ],
        },
      }),
      this.prisma.liveClass.count({
        where: {
          instructorId: lecturerUserId,
          status: { in: ['OPENING', 'IN_PROGRESS'] },
        },
      }),
      this.prisma.enrollment.count({
        where: {
          status: 'ACTIVE',
          OR: [
            { liveClass: { instructorId: lecturerUserId } },
            { vodPackage: { instructorId: lecturerUserId } },
          ],
        },
      }),
      this.prisma.assignmentSubmission.findMany({
        where: {
          status: 'SUBMITTED',
          grade: null,
          liveClassAssignment: assignmentScope,
        },
        take: 8,
        orderBy: [{ submittedAt: 'desc' }],
        include: {
          user: { select: { displayName: true, email: true } },
          liveClassAssignment: {
            select: {
              id: true,
              liveClassId: true,
              titleOverride: true,
              assignment: { select: { title: true } },
              liveClass: { select: { name: true, code: true } },
              vodPackage: { select: { title: true, code: true } },
            },
          },
        },
      }),
    ]);

    const pendingSubmissionsPreview: LecturerDashboardPendingSubmissionDTO[] =
      pendingRows.map((row) => {
        const lca = row.liveClassAssignment;
        const baseTitle = lca.titleOverride?.trim() || lca.assignment.title;
        let contextLabel = '—';
        if (lca.liveClass) {
          contextLabel =
            lca.liveClass.name ||
            lca.liveClass.code ||
            contextLabel;
        } else if (lca.vodPackage) {
          contextLabel =
            lca.vodPackage.title || lca.vodPackage.code || 'VOD';
        }
        const at = row.submittedAt ?? row.createdAt;
        return {
          submissionId: row.id,
          liveClassAssignmentId: lca.id,
          liveClassId: lca.liveClassId,
          studentDisplayName:
            row.user.displayName?.trim() ||
            row.user.email?.trim() ||
            'Học viên',
          assignmentTitle: baseTitle,
          contextLabel,
          submittedAt: at.toISOString(),
        };
      });

    return {
      stats: {
        pendingSubmissionsToGrade,
        todaySessions,
        activeLiveClasses,
        studentsInMyClasses,
      },
      pendingSubmissionsPreview,
    };
  }

}

