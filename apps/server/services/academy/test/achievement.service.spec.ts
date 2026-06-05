import { Test, TestingModule } from '@nestjs/testing';
import { AchievementService } from '../src/modules/gamification/achievement.service';
import { PrismaService } from '@server/shared/prisma/prisma.service';
import { AuditLoggerService } from '../src/modules/audit-logger.service';

describe('AchievementService', () => {
  let service: AchievementService;
  let mockPrisma: any;
  let mockAudit: any;
  let mockNats: any;

  beforeEach(async () => {
    mockPrisma = {
      achievement: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      userAchievement: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
        count: jest.fn(),
      },
      streak: { findUnique: jest.fn() },
      streakLog: { count: jest.fn() },
      userLessonProgress: { count: jest.fn() },
      courseReview: { count: jest.fn() },
      enrollment: { count: jest.fn() },
      userGamification: { findUnique: jest.fn(), update: jest.fn() },
      gamificationHistory: { aggregate: jest.fn(), create: jest.fn() },
      $transaction: jest.fn().mockImplementation((cb) => {
        if (typeof cb === 'function') return cb(mockPrisma);
        return Promise.all(cb);
      }),
    };

    mockAudit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    mockNats = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AchievementService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLoggerService, useValue: mockAudit },
        { provide: 'NATS_SERVICE', useValue: mockNats },
      ],
    }).compile();

    service = module.get<AchievementService>(AchievementService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAchievementsForUser', () => {
    it('should return achievements with progress (returning virtual for unlocked)', async () => {
      mockPrisma.achievement.findMany.mockResolvedValue([
        { id: 'a1', title: 'T1', requirements: { value: 10 } },
        { id: 'a2', title: 'T2', requirements: { value: 5 } }
      ]);
      mockPrisma.userAchievement.findMany.mockResolvedValue([
        { achievementId: 'a1', isUnlocked: true, progress: { current: 10, target: 10 } }
      ]);

      const result = await service.getAchievementsForUser('u1');

      expect(result.length).toBe(2);
      expect(result.find(r => r.achievementId === 'a1')?.isUnlocked).toBe(true);
      expect((result.find(r => r.achievementId === 'a2') as any).isUnlocked).toBe(false);
      expect((result.find(r => r.achievementId === 'a2') as any).progress.target).toBe(5);
    });
  });

  describe('evaluateForUser', () => {
    it('should update progress if criteria not met', async () => {
      mockPrisma.achievement.findMany.mockResolvedValue([
        { id: 'a1', code: 'C1', requirements: { type: 'STREAK_DAYS', value: 7 } }
      ]);
      mockPrisma.userAchievement.findMany.mockResolvedValue([]);
      mockPrisma.streak.findUnique.mockResolvedValue({ currentStreak: 3 });

      await service.evaluateForUser('u1');

      expect(mockPrisma.userAchievement.upsert).toHaveBeenCalledWith(expect.objectContaining({
        create: expect.objectContaining({
          isUnlocked: false,
          progress: { current: 3, target: 7 }
        })
      }));
    });

    it('should unlock and reward points if criteria met', async () => {
      const achievement = { 
        id: 'a1', code: 'C1', title: 'T', 
        requirements: { type: 'LESSONS_COMPLETED', value: 5 },
        rewards: { points: 100 }
      };
      mockPrisma.achievement.findMany.mockResolvedValue([achievement]);
      mockPrisma.achievement.findUnique.mockResolvedValue(achievement);
      mockPrisma.userAchievement.findMany.mockResolvedValue([]);
      mockPrisma.userLessonProgress.count.mockResolvedValue(5);
      
      // Inside unlockAchievement
      mockPrisma.userAchievement.findUnique.mockResolvedValue(null); // Not already unlocked

      await service.evaluateForUser('u1');

      expect(mockPrisma.userAchievement.upsert).toHaveBeenCalledWith(expect.objectContaining({
        update: expect.objectContaining({ isUnlocked: true })
      }));
      expect(mockPrisma.userGamification.update).toHaveBeenCalledWith(expect.objectContaining({
          data: { points: { increment: 100 } }
      }));
      expect(mockNats.emit).toHaveBeenCalled();
    });

    it('should handle complex criteria like POINTS_EARNED_TOTAL', async () => {
        mockPrisma.achievement.findMany.mockResolvedValue([
            { id: 'a1', requirements: { type: 'POINTS_EARNED_TOTAL', value: 1000 } }
        ]);
        mockPrisma.userAchievement.findMany.mockResolvedValue([]);
        mockPrisma.gamificationHistory.aggregate.mockResolvedValue({ _sum: { amount: 500 } });

        await service.evaluateForUser('u1');

        expect(mockPrisma.userAchievement.upsert).toHaveBeenCalledWith(expect.objectContaining({
            create: expect.objectContaining({ progress: { current: 500, target: 1000 } })
        }));
    });
  });

  describe('admin_deleteAchievement', () => {
    it('should delete if not used by any user', async () => {
        mockPrisma.achievement.findUnique.mockResolvedValue({ id: 'a1', title: 'T' });
        mockPrisma.userAchievement.count.mockResolvedValue(0);

        await service.admin_deleteAchievement('a1');

        expect(mockPrisma.achievement.delete).toHaveBeenCalled();
        expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'achievement.delete' }));
    });

    it('should deactivate if used by users', async () => {
        mockPrisma.achievement.findUnique.mockResolvedValue({ id: 'a1', title: 'T' });
        mockPrisma.userAchievement.count.mockResolvedValue(10);

        await service.admin_deleteAchievement('a1');

        expect(mockPrisma.achievement.update).toHaveBeenCalledWith(expect.objectContaining({
            data: { isActive: false }
        }));
        expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'achievement.deactivate' }));
    });
  });
});
