import { Test, TestingModule } from '@nestjs/testing';
import { ClassReviewService } from '../src/modules/classroom/class-review/class-review.service';
import { PrismaService } from '@server/shared/prisma/prisma.service';
import { GamificationService } from '../src/modules/gamification/gamification.service';
import { AuditLoggerService } from '../src/modules/audit-logger.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

describe('ClassReviewService', () => {
  let service: ClassReviewService;
  let prisma: PrismaService;
  let gamification: GamificationService;
  let audit: AuditLoggerService;

  const mockPrisma = {
    courseReview: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    enrollment: {
      findUnique: jest.fn(),
    },
    lesson: {
      count: jest.fn(),
    },
    userLessonProgress: {
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockGamification = {
    trackActivity: jest.fn().mockResolvedValue({}),
  };

  const mockAudit = {
    log: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassReviewService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: GamificationService, useValue: mockGamification },
        { provide: AuditLoggerService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<ClassReviewService>(ClassReviewService);
    prisma = module.get<PrismaService>(PrismaService);
    gamification = module.get<GamificationService>(GamificationService);
    audit = module.get<AuditLoggerService>(AuditLoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listCourseReviewsByLiveClass', () => {
    it('should return published reviews and mask anonymity', async () => {
      mockPrisma.$transaction.mockResolvedValue([
        [{ id: 'r1', isAnonymous: true, user: { displayName: 'Real Name' } }],
        1
      ]);
      const result = await service.listCourseReviewsByLiveClass('l1', { limit: 10, offset: 0 });
      expect(result.items[0].user.displayName).toBe('Người học ẩn danh');
      expect(result.total).toBe(1);
    });
  });

  describe('listCourseReviewsByVodPackage', () => {
    it('should return published reviews for VOD package', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0]);
      const result = await service.listCourseReviewsByVodPackage('v1', { limit: 10, offset: 0 });
      expect(result.total).toBe(0);
      expect(mockPrisma.courseReview.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { vodPackageId: 'v1', status: 'PUBLISHED' } }),
      );
    });
  });

  describe('listMyReviews', () => {
    it('should return user reviews in unified structure', async () => {
      mockPrisma.courseReview.findMany.mockResolvedValue([
        { id: 'r1', liveClass: { id: 'l1', name: 'N1', cohort: { courseProfile: { title: 'T1' } } } },
      ]);
      const result = await service.listMyReviews('u1');
      expect(result[0].class.name).toBe('N1');
      expect(result[0].class.courseProfile.title).toBe('T1');
    });
  });

  describe('createReview', () => {
    const userId = 'u1';
    const dto = { enrollmentId: 'e1', rating: 5, content: 'Good' };
    const mockEnrollment = {
      id: 'e1',
      userId: 'u1',
      status: 'COMPLETED',
      liveClassId: 'l1',
      vodPackageId: null,
    };

    it('should throw NotFoundException if enrollment missing', async () => {
      mockPrisma.enrollment.findUnique.mockResolvedValue(null);
      await expect(service.createReview(userId, dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if enrollment not owned by user', async () => {
      mockPrisma.enrollment.findUnique.mockResolvedValue({ ...mockEnrollment, userId: 'other' });
      await expect(service.createReview(userId, dto)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if progress < 70% for ACTIVE VOD', async () => {
      mockPrisma.enrollment.findUnique.mockResolvedValue({
        ...mockEnrollment,
        status: 'ACTIVE',
        liveClassId: null,
        vodPackageId: 'v1',
      });
      mockPrisma.lesson.count.mockResolvedValue(10);
      mockPrisma.userLessonProgress.count.mockResolvedValue(5); // 50%

      await expect(service.createReview(userId, dto)).rejects.toThrow('Must complete at least 70%');
    });

    it('should create review and award gamification points for high rating', async () => {
      mockPrisma.enrollment.findUnique.mockResolvedValue(mockEnrollment);
      mockPrisma.courseReview.findUnique.mockResolvedValue(null);
      mockPrisma.courseReview.create.mockResolvedValue({ id: 'r1', status: 'PUBLISHED' });

      const result = await service.createReview(userId, dto);
      expect(result.id).toBe('r1');
      expect(mockGamification.trackActivity).toHaveBeenCalled();
    });

    it('should throw BadRequestException if review already exists for enrollment', async () => {
      mockPrisma.enrollment.findUnique.mockResolvedValue(mockEnrollment);
      mockPrisma.courseReview.findUnique.mockResolvedValue({ id: 'r1' });
      await expect(service.createReview(userId, dto)).rejects.toThrow('REVIEW_ALREADY_EXISTS');
    });

    it('should not fail if gamification tracking fails', async () => {
      mockPrisma.enrollment.findUnique.mockResolvedValue(mockEnrollment);
      mockPrisma.courseReview.findUnique.mockResolvedValue(null);
      mockPrisma.courseReview.create.mockResolvedValue({ id: 'r1', status: 'PUBLISHED' });
      mockGamification.trackActivity.mockRejectedValue(new Error('Gami Fail'));

      const result = await service.createReview(userId, dto);
      expect(result.id).toBe('r1');
    });

    it('should set status to PENDING for low rating', async () => {
      mockPrisma.enrollment.findUnique.mockResolvedValue(mockEnrollment);
      mockPrisma.courseReview.findUnique.mockResolvedValue(null);
      mockPrisma.courseReview.create.mockResolvedValue({ id: 'r1', status: 'PENDING' });

      await service.createReview(userId, { ...dto, rating: 2 });
      expect(mockGamification.trackActivity).not.toHaveBeenCalled();
    });
  });

  describe('updateReview', () => {
    it('should throw ForbiddenException if not owner and not admin', async () => {
      mockPrisma.courseReview.findUnique.mockResolvedValue({ userId: 'other' });
      await expect(service.updateReview('r1', 'u1', { rating: 5 })).rejects.toThrow(ForbiddenException);
    });

    it('should reset status to PENDING when user updates a REJECTED review', async () => {
      mockPrisma.courseReview.findUnique.mockResolvedValue({ id: 'r1', userId: 'u1', status: 'REJECTED' });
      mockPrisma.courseReview.update.mockResolvedValue({ status: 'PENDING' });

      const result = await service.updateReview('r1', 'u1', { rating: 5 });
      expect(result.status).toBe('PENDING');
    });

    it('should allow admin to update any review', async () => {
      mockPrisma.courseReview.findUnique.mockResolvedValue({ id: 'r1', userId: 'other' });
      mockPrisma.courseReview.update.mockResolvedValue({ id: 'r1' });

      await service.updateReview('r1', 'admin1', { rating: 5 }, true);
      expect(mockPrisma.courseReview.update).toHaveBeenCalled();
    });
  });

  describe('hideReview', () => {
    it('should set status to HIDDEN', async () => {
      mockPrisma.courseReview.findUnique.mockResolvedValue({ id: 'r1', userId: 'u1' });
      mockPrisma.courseReview.update.mockResolvedValue({ id: 'r1', status: 'HIDDEN' });
      const result = await service.hideReview('r1', 'u1');
      expect(result.status).toBe('HIDDEN');
    });
  });

  describe('deleteReview', () => {
    it('should delete and log audit', async () => {
      mockPrisma.courseReview.findUnique.mockResolvedValue({ id: 'r1', userId: 'u1', enrollmentId: 'e1' });
      mockPrisma.courseReview.delete.mockResolvedValue({ id: 'r1' });

      await service.deleteReview('r1', 'u1');
      expect(mockPrisma.courseReview.delete).toHaveBeenCalled();
      expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'delete' }));
    });
  });

  describe('adminListReviews', () => {
    it('should filter by rating and dates', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0]);
      await service.adminListReviews({ rating: 5, fromDate: '2024-01-01' });
      expect(mockPrisma.courseReview.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            rating: 5,
            createdAt: expect.objectContaining({ gte: expect.any(Date) }),
          }),
        }),
      );
    });
  });

  describe('moderateReview', () => {
    it('should update status and award point if transition from PENDING to PUBLISHED', async () => {
      const review = { id: 'r1', userId: 'u1', status: 'PENDING', rating: 5 };
      mockPrisma.courseReview.findUnique.mockResolvedValue(review);
      mockPrisma.courseReview.update.mockResolvedValue({ ...review, status: 'PUBLISHED' });

      await service.moderateReview('r1', 'admin1', { action: 'publish' });

      expect(mockGamification.trackActivity).toHaveBeenCalled();
      expect(mockAudit.log).toHaveBeenCalled();
    });

    it('should log rejection reason on reject action', async () => {
      const review = { id: 'r1', userId: 'u1', status: 'PENDING' };
      mockPrisma.courseReview.findUnique.mockResolvedValue(review);
      mockPrisma.courseReview.update.mockResolvedValue({ ...review, status: 'REJECTED' });

      await service.moderateReview('r1', 'admin1', { action: 'reject', reason: 'Spam' });

      expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({
        action: 'moderate.reject',
        metadata: expect.objectContaining({ reason: 'Spam' }),
      }));
    });
  });
});
