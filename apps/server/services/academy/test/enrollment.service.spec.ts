import { Test, TestingModule } from '@nestjs/testing';
import { EnrollmentService } from '../src/modules/classroom/enrollment/enrollment.service';
import { PrismaService } from '@server/shared/prisma/prisma.service';
import { AuditLoggerService } from '../src/modules/audit-logger.service';
import { AchievementService } from '../src/modules/gamification/achievement.service';
import { GamificationService } from '../src/modules/gamification/gamification.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { of } from 'rxjs';
import { ActivityType } from '@prisma/generated';

describe('EnrollmentService', () => {
  let service: EnrollmentService;
  let prisma: PrismaService;
  let audit: AuditLoggerService;
  let gamification: GamificationService;
  let nats: any;

  const mockPrisma = {
    enrollment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    liveScheduleSession: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    classAttendance: {
      count: jest.fn(),
    },
    academyCourseProfileAssessment: {
      findMany: jest.fn(),
    },
    academyExamAttempt: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    lesson: {
      count: jest.fn(),
      findUnique: jest.fn(),
    },
    userLessonProgress: {
      count: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    gamificationHistory: {
      count: jest.fn(),
    },
    liveClass: {
      findUnique: jest.fn(),
    },
    vodPackage: {
      findUnique: jest.fn(),
    },
    courseProfile: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockAudit = { log: jest.fn() };
  const mockAchievement = { logActivity: jest.fn() };
  const mockGamification = {
    trackActivity: jest.fn(),
    getProfile: jest.fn(),
    getStreakStatus: jest.fn(),
  };
  const mockNats = {
    emit: jest.fn(),
    send: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrollmentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLoggerService, useValue: mockAudit },
        { provide: AchievementService, useValue: mockAchievement },
        { provide: GamificationService, useValue: mockGamification },
        { provide: 'NATS_SERVICE', useValue: mockNats },
      ],
    }).compile();

    service = module.get<EnrollmentService>(EnrollmentService);
    prisma = module.get<PrismaService>(PrismaService);
    audit = module.get<AuditLoggerService>(AuditLoggerService);
    gamification = module.get<GamificationService>(GamificationService);
    nats = module.get('NATS_SERVICE');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return enrollments and self-heal EXPIRED status', async () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      const mockEnrollments = [
        { id: 'e1', status: 'ACTIVE', expiresAt: pastDate, userId: 'u1' },
      ];
      mockPrisma.enrollment.findMany.mockResolvedValue(mockEnrollments);
      mockPrisma.enrollment.update.mockResolvedValue({ ...mockEnrollments[0], status: 'EXPIRED' });

      const result = await service.findAll({});

      expect(result[0].status).toBe('EXPIRED');
      expect(mockPrisma.enrollment.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'e1' }, data: { status: 'EXPIRED' } })
      );
    });

    it('should ignore self-heal errors and continue', async () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      mockPrisma.enrollment.findMany.mockResolvedValue([
        { id: 'e1', status: 'ACTIVE', expiresAt: pastDate, userId: 'u1' }
      ]);
      mockPrisma.enrollment.update.mockRejectedValue(new Error('Update failed'));

      const result = await service.findAll({});
      expect(result[0].status).toBe('ACTIVE');
    });

    it('should calculate VOD progress and self-heal COMPLETED status', async () => {
      const mockEnrollments = [
        {
          id: 'e1',
          status: 'ACTIVE',
          userId: 'u1',
          vodPackageId: 'v1',
          vodPackage: { courseProfileId: 'cp1' },
        },
      ];
      mockPrisma.enrollment.findMany.mockResolvedValue(mockEnrollments);
      mockPrisma.lesson.count.mockResolvedValue(10);
      mockPrisma.userLessonProgress.count.mockResolvedValue(10);
      mockPrisma.enrollment.update.mockResolvedValue({ ...mockEnrollments[0], status: 'COMPLETED' });

      const result: any = await service.findAll({ userId: 'u1' });

      expect(result[0].progress).toBe(100);
      expect(result[0].status).toBe('COMPLETED');
      expect(nats.emit).toHaveBeenCalledWith('enrollment.completed', expect.anything());
    });

    it('should filter by instructorId and use bridge logic for deliveryTargetId', async () => {
      mockPrisma.enrollment.findMany.mockResolvedValue([]);
      await service.findAll({ instructorId: 'i1', deliveryTargetId: 'target-id' });

      expect(mockPrisma.enrollment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            liveClass: { instructorId: 'i1' },
            OR: [
              { liveClassId: 'target-id' },
              { vodPackageId: 'target-id' },
            ],
          }),
        }),
      );
    });

    it('should filter by vodPackageId directly', async () => {
      mockPrisma.enrollment.findMany.mockResolvedValue([]);
      await service.findAll({ vodPackageId: 'v1' });
      expect(mockPrisma.enrollment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ vodPackageId: 'v1' }),
        }),
      );
    });

    it('should self-heal LIVE enrollment to COMPLETED when eligible', async () => {
      const mockEnrollments = [
        {
          id: 'e1',
          status: 'ACTIVE',
          userId: 'u1',
          liveClassId: 'l1',
          liveClass: {
            cohort: { courseProfileId: 'cp1', endDate: new Date('2020-01-01') },
          },
        },
      ];
      mockPrisma.enrollment.findMany.mockResolvedValue(mockEnrollments);
      mockPrisma.liveScheduleSession.findMany.mockResolvedValue([{ id: 's1' }]);
      mockPrisma.classAttendance.count.mockResolvedValue(1);
      mockPrisma.academyCourseProfileAssessment.findMany.mockResolvedValue([]);
      mockPrisma.enrollment.update.mockResolvedValue({ ...mockEnrollments[0], status: 'COMPLETED' });

      const result: any = await service.findAll({ userId: 'u1' });

      expect(result[0].status).toBe('COMPLETED');
      expect(result[0].progress).toBe(100);
    });

    it('should compute LIVE progress using fallback cutoff date (last session date)', async () => {
      const mockEnrollments = [
        {
          id: 'e1',
          status: 'ACTIVE',
          userId: 'u1',
          liveClassId: 'l1',
          liveClass: {
            cohort: { courseProfileId: 'cp1', endDate: null },
          },
        },
      ];
      mockPrisma.enrollment.findMany.mockResolvedValue(mockEnrollments);
      const lastSessionDate = new Date('2024-03-25');
      mockPrisma.liveScheduleSession.findFirst.mockResolvedValue({ sessionDate: lastSessionDate });
      mockPrisma.liveScheduleSession.findMany.mockResolvedValue([{ id: 's1' }]);
      mockPrisma.classAttendance.count.mockResolvedValue(1);
      mockPrisma.academyCourseProfileAssessment.findMany.mockResolvedValue([]);
      mockPrisma.enrollment.update.mockResolvedValue({ ...mockEnrollments[0], status: 'COMPLETED' });

      await service.findAll({ userId: 'u1' });

      expect(mockPrisma.liveScheduleSession.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { 
            liveClassId: 'l1',
            status: { in: ['SCHEDULED', 'COMPLETED'] }
          },
          orderBy: { sessionDate: 'desc' },
          select: { sessionDate: true },
        })
      );
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException if enrollment missing', async () => {
      mockPrisma.enrollment.findUnique.mockResolvedValue(null);
      await expect(service.findById('unknown')).rejects.toThrow(NotFoundException);
    });

    it('should return enrollment if found', async () => {
      mockPrisma.enrollment.findUnique.mockResolvedValue({ id: 'e1' });
      const result = await service.findById('e1');
      expect(result.id).toBe('e1');
    });
  });

  describe('enroll', () => {
    it('should throw BadRequestException if already enrolled', async () => {
      mockPrisma.enrollment.findFirst.mockResolvedValue({ id: 'e1', status: 'ACTIVE' });
      await expect(service.enroll({ userId: 'u1', liveClassId: 'l1' })).rejects.toThrow('User is already enrolled');
    });

    it('should enroll from CANCELLED status by clearing old progress', async () => {
      mockPrisma.enrollment.findFirst.mockResolvedValue({ id: 'e1', status: 'CANCELLED' });
      mockPrisma.$transaction.mockImplementation(async (cb) => await cb(mockPrisma));
      mockPrisma.enrollment.update.mockResolvedValue({ id: 'e1', status: 'ACTIVE' });

      await service.enroll({ userId: 'u1', liveClassId: 'l1' });

      expect(mockPrisma.userLessonProgress.deleteMany).toHaveBeenCalledWith({ where: { enrollmentId: 'e1' } });
      expect(mockPrisma.enrollment.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'ACTIVE' }) }));
    });

    it('should throw BadRequestException if class is full', async () => {
      mockPrisma.enrollment.findFirst.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async (cb) => await cb(mockPrisma));
      mockPrisma.liveClass.findUnique.mockResolvedValue({ maxStudents: 20 });
      mockPrisma.enrollment.count.mockResolvedValue(20);

      await expect(service.enroll({ userId: 'u1', liveClassId: 'l1' })).rejects.toThrow('Class is full');
    });

    it('should throw if transaction fails', async () => {
      mockPrisma.enrollment.findFirst.mockResolvedValue(null);
      mockPrisma.$transaction.mockRejectedValue(new Error('Tx failed'));
      await expect(service.enroll({ userId: 'u1', liveClassId: 'l1' })).rejects.toThrow('Tx failed');
    });
  });

  describe('trackLessonProgress', () => {
    it('should upsert progress and award XP', async () => {
      const enrollment = { id: 'e1', userId: 'u1', status: 'ACTIVE', vodPackageId: 'v1' };
      mockPrisma.enrollment.findFirst.mockResolvedValue(enrollment);
      mockPrisma.userLessonProgress.upsert.mockResolvedValue({ id: 'p1' });
      mockPrisma.lesson.findUnique.mockResolvedValue({ title: 'Lesson 1' });
      mockPrisma.vodPackage.findUnique.mockResolvedValue({ title: 'Course 1' });
      mockPrisma.lesson.count.mockResolvedValue(10);
      mockPrisma.userLessonProgress.count.mockResolvedValue(5);

      const result = await service.trackLessonProgress('u1', 'v1', 'l1');

      expect(result.success).toBe(true);
      expect(mockGamification.trackActivity).toHaveBeenCalled();
    });

    it('should complete enrollment if all lessons done (VOD)', async () => {
      const enrollment = { id: 'e1', userId: 'u1', status: 'ACTIVE', vodPackageId: 'v1', vodPackage: { courseProfileId: 'cp1' } };
      mockPrisma.enrollment.findFirst.mockResolvedValue(enrollment);
      mockPrisma.lesson.count.mockResolvedValue(1);
      mockPrisma.userLessonProgress.count.mockResolvedValue(1);

      await service.trackLessonProgress('u1', 'v1', 'l1');

      expect(mockPrisma.enrollment.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'COMPLETED' } }));
      expect(nats.emit).toHaveBeenCalledWith('enrollment.completed', { enrollmentId: 'e1' });
    });

    it('should throw BadRequestException if enrollment expired during tracking', async () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      const enrollment = { id: 'e1', status: 'ACTIVE', expiresAt: pastDate };
      mockPrisma.enrollment.findFirst.mockResolvedValue(enrollment);

      await expect(service.trackLessonProgress('u1', 'v1', 'l1')).rejects.toThrow('User enrollment has expired');
      expect(mockPrisma.enrollment.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'EXPIRED' } }));
    });

    it('should throw if user is not enrolled at all', async () => {
      mockPrisma.enrollment.findFirst.mockResolvedValue(null);
      await expect(service.trackLessonProgress('u1', 'v1', 'l1')).rejects.toThrow('User is not enrolled');
    });
  });

  describe('getStatsForUser', () => {
    it('should return user stats including weekly activity', async () => {
      // Mocking internal findAll call indirectly via prisma mocks
      mockPrisma.enrollment.findMany.mockResolvedValue([
        { 
          id: 'e1', 
          userId: 'u1',
          status: 'ACTIVE', 
          vodPackageId: 'v1', 
          vodPackage: { courseProfileId: 'cp1' },
          enrolledAt: new Date() 
        }
      ]);
      mockPrisma.lesson.count.mockResolvedValue(10);
      mockPrisma.userLessonProgress.count.mockResolvedValue(5);

      mockGamification.getProfile.mockResolvedValue({ level: 5, totalXp: 1000 });
      mockGamification.getStreakStatus.mockResolvedValue({ 
        currentStreak: 3, 
        recentActiveDates: [new Date().toISOString().split('T')[0]] 
      });
      mockPrisma.gamificationHistory.count.mockResolvedValue(2);

      const stats = await service.getStatsForUser('u1');

      expect(stats.level).toBe(5);
      expect(stats.streak).toBe(3);
      expect(stats.averageProgress).toBe(50);
      expect(stats.totalLearningHours).toBe(1.3); // (5 lessons * 15 min)/60 = 1.25 -> rounded to 1.3
      expect(stats.weeklyActivity).toBeInstanceOf(Array);
    });

    it('should return empty stats for user with no enrollments', async () => {
      mockPrisma.enrollment.findMany.mockResolvedValue([]);
      mockGamification.getProfile.mockResolvedValue({ level: 1, totalXp: 0 });
      mockGamification.getStreakStatus.mockResolvedValue({ currentStreak: 0, recentActiveDates: [] });

      const stats = await service.getStatsForUser('empty-user');
      expect(stats.totalCourses).toBe(0);
      expect(stats.averageProgress).toBe(0);
    });
  });

  describe('checkGiftRecipient', () => {
    it('should return registered=false if user not found via NATS', async () => {
      mockNats.send.mockReturnValue(of({ user: null }));
      const result = await service.checkGiftRecipient('test@email.com', 'c1');
      expect(result.isRegistered).toBe(false);
    });

    it('should return enrolled=true if user found and has enrollment', async () => {
      mockNats.send.mockReturnValue(of({ user: { id: 'u1' } }));
      mockPrisma.enrollment.findFirst.mockResolvedValue({ id: 'e1' });
      const result = await service.checkGiftRecipient('test@email.com', 'c1');
      expect(result.isRegistered).toBe(true);
      expect(result.isEnrolled).toBe(true);
    });

    it('should return enrolled=false if registered user has no enrollment', async () => {
      mockNats.send.mockReturnValue(of({ user: { id: 'u1' } }));
      mockPrisma.enrollment.findFirst.mockResolvedValue(null);
      const result = await service.checkGiftRecipient('test@email.com', 'c1');
      expect(result.isRegistered).toBe(true);
      expect(result.isEnrolled).toBe(false);
    });
  });

  describe('checkEligibility', () => {
    it('should return isEnrolled=false if no enrollment found', async () => {
      mockPrisma.enrollment.findFirst.mockResolvedValue(null);
      const result = await service.checkEligibility('u1', 'c1', 'CLASS');
      expect(result.isEnrolled).toBe(false);
    });

    it('should self-heal EXPIRED status during eligibility check', async () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      const mock = { id: 'e1', status: 'ACTIVE', expiresAt: pastDate };
      mockPrisma.enrollment.findFirst.mockResolvedValue(mock);

      const result = await service.checkEligibility('u1', 'c1', 'CLASS');

      expect(result.isEnrolled).toBe(false);
      expect(mockPrisma.enrollment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'EXPIRED' } })
      );
    });

    it('should calculate progress metadata for COURSE_PROFILE target', async () => {
      const mock = {
        id: 'e1',
        status: 'ACTIVE',
        vodPackage: { courseProfileId: 'cp1' },
      };
      mockPrisma.enrollment.findFirst.mockResolvedValue(mock);
      mockPrisma.lesson.count.mockResolvedValue(10);
      mockPrisma.userLessonProgress.count.mockResolvedValue(3);

      const result = await service.checkEligibility('u1', 'cp1', 'COURSE_PROFILE');

      expect(result.isEnrolled).toBe(true);
      expect(result.enrollment.progress).toBe(30);
    });
  });

  describe('Status Management & Cleanup', () => {
    it('should cancel enrollment', async () => {
      mockPrisma.enrollment.update.mockResolvedValue({ status: 'CANCELLED' });
      await service.cancelEnrollment('e1');
      expect(mockPrisma.enrollment.update).toHaveBeenCalledWith({ where: { id: 'e1' }, data: { status: 'CANCELLED' } });
    });

    it('should delete and log audit', async () => {
      mockPrisma.enrollment.findUnique.mockResolvedValue({ id: 'e1', userId: 'u1' });
      mockPrisma.enrollment.delete.mockResolvedValue({ id: 'e1' });
      
      await service.delete('e1', 'admin-1');

      expect(mockPrisma.enrollment.delete).toHaveBeenCalled();
      expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'enrollment.delete' }));
    });

    it('should update status and log audit', async () => {
      mockPrisma.enrollment.update.mockResolvedValue({ id: 'e1', status: 'PAUSED' });
      await service.updateStatus('e1', 'PAUSED', 'admin-1');
      expect(mockPrisma.enrollment.update).toHaveBeenCalledWith({
        where: { id: 'e1' },
        data: { status: 'PAUSED' },
      });
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'enrollment.update_status',
          newValues: { status: 'PAUSED' },
        }),
      );
    });
  });
});
