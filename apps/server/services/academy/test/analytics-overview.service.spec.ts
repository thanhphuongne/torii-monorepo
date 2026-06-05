import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsOverviewService } from '../src/modules/analytics/analytics-overview/analytics-overview.service';
import { PrismaService } from '@server/shared/prisma/prisma.service';

describe('AnalyticsOverviewService', () => {
  let service: AnalyticsOverviewService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      courseProfile: {
        count: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      enrollment: {
        count: jest.fn(),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      cohort: {
        count: jest.fn(),
      },
      vodPackage: {
        count: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      liveScheduleSession: {
        count: jest.fn(),
      },
      liveClass: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      order: {
        aggregate: jest.fn(),
        findMany: jest.fn(),
      },
      orderItem: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsOverviewService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<AnalyticsOverviewService>(AnalyticsOverviewService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getLearningOverview', () => {
    it('should return correct overview including popular courses from both VOD and LIVE', async () => {
      // Mock counts for Promise.all:
      // [totalCourses, totalEnrollments, pendingCourseApprovals, pendingCohortApprovals, pendingVodApprovals, activeRooms]
      mockPrisma.courseProfile.count
        .mockResolvedValueOnce(50) // Total
        .mockResolvedValueOnce(5); // Pending
      mockPrisma.enrollment.count.mockResolvedValue(200);
      mockPrisma.cohort.count.mockResolvedValue(2);
      mockPrisma.vodPackage.count.mockResolvedValue(3);
      mockPrisma.liveScheduleSession.count.mockResolvedValue(10);

      // Mock getPopularCourses: VOD part
      mockPrisma.enrollment.groupBy.mockResolvedValueOnce([
        { vodPackageId: 'vod-1', _count: { _all: 10 } },
        { vodPackageId: 'vod-2', _count: { _all: 5 } },
      ]);
      mockPrisma.vodPackage.findMany.mockResolvedValue([
        { id: 'vod-1', courseProfileId: 'cp-1' },
        { id: 'vod-2', courseProfileId: 'cp-2' },
      ]);

      // Mock getPopularCourses: LIVE part
      mockPrisma.enrollment.groupBy.mockResolvedValueOnce([
        { liveClassId: 'live-1', _count: { _all: 15 } },
        { liveClassId: 'live-2', _count: { _all: 5 } },
      ]);
      mockPrisma.liveClass.findMany.mockResolvedValue([
        { id: 'live-1', cohort: { courseProfileId: 'cp-1' } }, // Same as vod-1
        { id: 'live-2', cohort: { courseProfileId: 'cp-3' } },
      ]);

      // Top course profiles should be cp-1 (10+15=25), cp-2 (5), cp-3 (5)
      mockPrisma.courseProfile.findMany.mockResolvedValue([
        { id: 'cp-1', title: 'Course 1', level: 'N1', thumbnailUrl: 'url1' },
        { id: 'cp-2', title: 'Course 2', level: 'N2', thumbnailUrl: 'url2' },
        { id: 'cp-3', title: 'Course 3', level: 'N3', thumbnailUrl: 'url3' },
      ]);

      const result = await service.getLearningOverview();

      expect(result.totalCourses).toBe(50);
      expect(result.totalEnrollments).toBe(200);
      expect(result.activeRooms).toBe(10);
      expect(result.pendingApprovals).toBe(5 + 2 + 3); // Course + Cohort + Vod pending

      expect(result.popularCourses).toHaveLength(3);
      expect(result.popularCourses[0].id).toBe('cp-1');
      expect(result.popularCourses[0].totalStudents).toBe(25);
      expect(result.popularCourses[1].totalStudents).toBe(5);
    });

    it('should return empty popular courses if no enrollments exist', async () => {
      mockPrisma.courseProfile.count.mockResolvedValue(0);
      mockPrisma.enrollment.count.mockResolvedValue(0);
      mockPrisma.cohort.count.mockResolvedValue(0);
      mockPrisma.vodPackage.count.mockResolvedValue(0);
      mockPrisma.liveScheduleSession.count.mockResolvedValue(0);

      mockPrisma.enrollment.groupBy.mockResolvedValue([]); // Both VOD and LIVE empty

      const result = await service.getLearningOverview();

      expect(result.popularCourses).toEqual([]);
    });

    it('should filter out popular courses that cannot be found in courseProfile details', async () => {
      mockPrisma.courseProfile.count.mockResolvedValue(0);
      mockPrisma.enrollment.count.mockResolvedValue(0);
      mockPrisma.cohort.count.mockResolvedValue(0);
      mockPrisma.vodPackage.count.mockResolvedValue(0);
      mockPrisma.liveScheduleSession.count.mockResolvedValue(0);

      mockPrisma.enrollment.groupBy.mockResolvedValueOnce([{ vodPackageId: 'v1', _count: { _all: 5 } }]);
      mockPrisma.vodPackage.findMany.mockResolvedValue([{ id: 'v1', courseProfileId: 'ghost-cp' }]);
      mockPrisma.enrollment.groupBy.mockResolvedValueOnce([]);
      mockPrisma.courseProfile.findMany.mockResolvedValue([]); // Detailed info not found

      const result = await service.getLearningOverview();

      expect(result.popularCourses).toEqual([]);
    });

    it('should throw error if database fails', async () => {
      mockPrisma.courseProfile.count.mockRejectedValue(new Error('Internal Database Error'));
      await expect(service.getLearningOverview()).rejects.toThrow('Internal Database Error');
    });
  });

  describe('getBillingOverview', () => {
    it('should return correct billing report and recent sales', async () => {
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { grandTotal: 10000000 } });
      
      const mockDate = new Date('2024-05-20T10:00:00Z');
      mockPrisma.order.findMany.mockResolvedValue([
        {
          id: 'ord-1',
          grandTotal: 1500000,
          paidAt: mockDate,
          user: { displayName: 'John Doe', email: 'john@example.com' },
        },
      ]);

      mockPrisma.orderItem.findMany.mockResolvedValue([
        {
          price: 1500000,
          vodPackage: { courseProfile: { level: 'N1' } },
          cohort: null,
        },
        {
          price: 2000000,
          vodPackage: null,
          cohort: { courseProfile: { level: 'N2' } },
        },
        {
          price: 500000,
          vodPackage: { courseProfile: { level: 'N2' } }, // Same level adding up
          cohort: null,
        },
      ]);

      const result = await service.getBillingOverview();

      expect(result.totalRevenue).toBe(10000000);
      expect(result.recentSales).toHaveLength(1);
      expect(result.recentSales[0].userName).toBe('John Doe');
      expect(result.recentSales[0].date).toBe('2024-05-20');
      
      expect(result.revenueByLevel).toEqual(expect.arrayContaining([
        { level: 'N2', amount: 2500000 },
        { level: 'N1', amount: 1500000 },
      ]));
    });

    it('should handle zero revenue and no orders gracefully', async () => {
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { grandTotal: null } });
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.orderItem.findMany.mockResolvedValue([]);

      const result = await service.getBillingOverview();

      expect(result.totalRevenue).toBe(0);
      expect(result.recentSales).toEqual([]);
      expect(result.revenueByLevel).toEqual([]);
      expect(result.growthData).toEqual([]);
    });

    it('should skip order items without course profile level', async () => {
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { grandTotal: 1000 } });
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.orderItem.findMany.mockResolvedValue([
        {
          price: 1000,
          vodPackage: { courseProfile: { level: null } },
          cohort: null,
        },
      ]);

      const result = await service.getBillingOverview();

      expect(result.revenueByLevel).toEqual([]);
    });

    it('should throw error if billing aggregation fails', async () => {
      mockPrisma.order.aggregate.mockRejectedValue(new Error('Agg Error'));
      await expect(service.getBillingOverview()).rejects.toThrow('Agg Error');
    });
  });
});
