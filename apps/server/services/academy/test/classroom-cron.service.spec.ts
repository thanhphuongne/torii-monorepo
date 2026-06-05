import { Test, TestingModule } from '@nestjs/testing';
import { ClassroomCronService } from '../src/modules/classroom/classroom-cron.service';
import { PrismaService } from '@server/shared/prisma/prisma.service';

describe('ClassroomCronService', () => {
  let service: ClassroomCronService;
  let prisma: PrismaService;

  const mockPrisma = {
    enrollment: {
      updateMany: jest.fn(),
    },
    cohort: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    liveClass: {
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassroomCronService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ClassroomCronService>(ClassroomCronService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleEnrollmentExpirations', () => {
    it('should expire active enrollments that have passed expiresAt', async () => {
      mockPrisma.enrollment.updateMany.mockResolvedValue({ count: 5 });

      await service.handleEnrollmentExpirations();

      expect(mockPrisma.enrollment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
            expiresAt: expect.objectContaining({ lte: expect.any(Date) }),
          }),
          data: { status: 'EXPIRED' },
        }),
      );
    });

    it('should handle zero expired enrollments', async () => {
      mockPrisma.enrollment.updateMany.mockResolvedValue({ count: 0 });
      await service.handleEnrollmentExpirations();
      expect(mockPrisma.enrollment.updateMany).toHaveBeenCalled();
    });
  });

  describe('handleCohortEnrollmentClose', () => {
    it('should close cohorts and update live classes if enrollmentCloseAt passes', async () => {
      const mockCohorts = [{ id: 'c1', code: 'C01' }, { id: 'c2', code: 'C02' }];
      mockPrisma.cohort.findMany.mockResolvedValue(mockCohorts);
      mockPrisma.cohort.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.liveClass.updateMany.mockResolvedValue({ count: 3 });

      await service.handleCohortEnrollmentClose();

      expect(mockPrisma.cohort.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'OPENING',
            enrollmentCloseAt: expect.objectContaining({ lte: expect.any(Date) }),
          }),
        }),
      );
      expect(mockPrisma.cohort.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['c1', 'c2'] } },
        data: { status: 'COMPLETED' },
      });
      expect(mockPrisma.liveClass.updateMany).toHaveBeenCalledWith({
        where: {
          cohortId: { in: ['c1', 'c2'] },
          status: 'OPENING',
        },
        data: { status: 'IN_PROGRESS' },
      });
    });

    it('should return early if no cohorts need closing', async () => {
      mockPrisma.cohort.findMany.mockResolvedValue([]);
      await service.handleCohortEnrollmentClose();
      expect(mockPrisma.cohort.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('handleCohortCourseEnd', () => {
    it('should complete live classes when cohort endDate passes', async () => {
      const mockCohorts = [{ id: 'c1', code: 'C01' }];
      mockPrisma.cohort.findMany.mockResolvedValue(mockCohorts);
      mockPrisma.cohort.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.liveClass.updateMany.mockResolvedValue({ count: 2 });

      await service.handleCohortCourseEnd();

      expect(mockPrisma.cohort.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['OPENING', 'COMPLETED'] },
            endDate: expect.objectContaining({ lte: expect.any(Date) }),
          }),
        }),
      );
      expect(mockPrisma.cohort.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['c1'] }, status: 'OPENING' },
        data: { status: 'COMPLETED' },
      });
      expect(mockPrisma.liveClass.updateMany).toHaveBeenCalledWith({
        where: {
          cohortId: { in: ['c1'] },
          status: { in: ['OPENING', 'IN_PROGRESS'] },
        },
        data: { status: 'COMPLETED' },
      });
    });

    it('should return early if no cohorts ended', async () => {
      mockPrisma.cohort.findMany.mockResolvedValue([]);
      await service.handleCohortCourseEnd();
      expect(mockPrisma.liveClass.updateMany).not.toHaveBeenCalled();
    });
  });
});
