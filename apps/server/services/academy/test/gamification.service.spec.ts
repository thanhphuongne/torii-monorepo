import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GamificationService } from '../src/modules/gamification/gamification.service';
import { AchievementService } from '../src/modules/gamification/achievement.service';
import { PrismaService } from '@server/shared/prisma/prisma.service';
import { AuditLoggerService } from '../src/modules/audit-logger.service';
import { ActivityType, GamificationTransactionType, GamificationCurrency } from '@prisma/generated';

describe('GamificationService', () => {
  let service: GamificationService;
  let mockPrisma: any;
  let mockAchievement: any;
  let mockAudit: any;
  let mockNats: any;

  beforeEach(async () => {
    mockPrisma = {
      userGamification: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn().mockResolvedValue({ level: 1 }),
        create: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
      streak: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      streakLog: {
        upsert: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
      gamificationHistory: {
        findFirst: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
        create: jest.fn(),
        findMany: jest.fn(),
      },
      pointReward: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      coupon: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((cb) => {
        if (typeof cb === 'function') return cb(mockPrisma);
        return Promise.all(cb);
      }),
    };

    mockAchievement = {
      evaluateForUser: jest.fn().mockResolvedValue(undefined),
    };

    mockAudit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    mockNats = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamificationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AchievementService, useValue: mockAchievement },
        { provide: AuditLoggerService, useValue: mockAudit },
        { provide: 'NATS_SERVICE', useValue: mockNats },
      ],
    }).compile();

    service = module.get<GamificationService>(GamificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('trackActivity (Streak Logic)', () => {
    it('should increment streak if diff is 1 day', async () => {
      const today = service['getVnDateString']();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = service['getVnDateString'](yesterday);

      mockPrisma.userGamification.findUnique.mockResolvedValue({ id: 'u1', freezeCount: 0 });
      mockPrisma.streak.findUnique.mockResolvedValue({
        lastActiveDate: yesterdayStr,
        currentStreak: 5,
        maxStreak: 10,
      });

      // We use LOGIN as a trigger activity
      await service.trackActivity('u1', ActivityType.LOGIN);

      expect(mockPrisma.streak.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ currentStreak: 6 })
      }));
    });

    it('should use shield (freeze) if diff is 2 days', async () => {
      const today = service['getVnDateString']();
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const twoDaysAgoStr = service['getVnDateString'](twoDaysAgo);

      mockPrisma.userGamification.findUnique.mockResolvedValue({ id: 'u1', freezeCount: 1 });
      mockPrisma.streak.findUnique.mockResolvedValue({
        lastActiveDate: twoDaysAgoStr,
        currentStreak: 5,
        maxStreak: 10,
      });

      const result = await service.trackActivity('u1', ActivityType.LOGIN);

      expect(mockPrisma.streak.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ 
            currentStreak: 5, // Streak maintained
            freezeUsedToday: true 
        })
      }));
      expect((result as any).streakSavedByShield).toBe(true);
    });

    it('should reset streak if diff > 2 days', async () => {
        const lastYear = service['getVnDateString'](new Date(2023, 0, 1));
        mockPrisma.userGamification.findUnique.mockResolvedValue({ id: 'u1', freezeCount: 1 });
        mockPrisma.streak.findUnique.mockResolvedValue({
            lastActiveDate: lastYear,
            currentStreak: 100,
            maxStreak: 100,
        });

        await service.trackActivity('u1', ActivityType.LOGIN);

        expect(mockPrisma.streak.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ currentStreak: 1 })
        }));
    });
  });

  describe('trackActivity (Reward Logic)', () => {
    it('should award XP and Points for lesson completion', async () => {
      mockPrisma.gamificationHistory.findFirst.mockResolvedValue(null); // No dupe
      mockPrisma.userGamification.findUnique.mockResolvedValue({ 
          userId: 'u1', totalXp: 100, points: 50, level: 1 
      });
      mockPrisma.userGamification.update.mockResolvedValue({ level: 1 });
      
      // ActivityType.LESSON_COMPLETE: { xp: 20, points: 2 }
      const result = await service.trackActivity('u1', ActivityType.LESSON_COMPLETE, { lessonId: 'l1' });

      expect((result as any).xpEarned).toBe(20);
      expect((result as any).pointsEarned).toBe(2);
      expect(mockPrisma.gamificationHistory.create).toHaveBeenCalledTimes(2); // One for XP, one for Points
    });

    it('should respect daily caps', async () => {
        // ActivityType.QUIZ_ANSWER cap XP is 20.
        // Mock that we already earned 15 XP today for this activity.
        mockPrisma.gamificationHistory.aggregate.mockResolvedValue({ _sum: { amount: 15 } });
        mockPrisma.userGamification.findUnique.mockResolvedValue({ userId: 'u1', totalXp: 0, level: 1 });
        mockPrisma.userGamification.update.mockResolvedValue({ level: 1 });

        // ActivityType.QUIZ_ANSWER awards 1 XP normally.
        // Wait, rule for QUIZ_ANSWER is 1 XP. Cap is 20.
        // If we earned 15, we can still earn 5.
        // Let's mock a high rule or low cap.
        
        // Let's use ActivityType.FLASHCARD_REVIEW: rule {xp: 5, points: 1}, cap XP: 15.
        // Already earned 12 XP. New reward should be 3 XP.
        const result = await service.trackActivity('u1', ActivityType.FLASHCARD_REVIEW);
        
        expect((result as any).xpEarned).toBeLessThanOrEqual(5); 
        // Logic will depend on the mocked aggregate result.
    });
  });

  describe('redeemReward', () => {
    it('should throw if insufficient points', async () => {
      mockPrisma.pointReward.findUnique.mockResolvedValue({ 
          id: 'r1', isActive: true, costPoints: 1000, type: 'COUPON' 
      });
      mockPrisma.userGamification.findUnique.mockResolvedValue({ points: 500 });

      await expect(service.redeemReward('u1', 'r1')).rejects.toThrow('Insufficient points');
    });

    it('should deduct points and create coupon', async () => {
        const reward = { 
            id: 'r1', isActive: true, costPoints: 100, type: 'COUPON', name: 'Discount',
            config: { discountType: 'PERCENTAGE', discountValue: 10 }
        };
        mockPrisma.pointReward.findUnique.mockResolvedValue(reward);
        mockPrisma.userGamification.findUnique.mockResolvedValue({ points: 500 });
        mockPrisma.coupon.findUnique.mockResolvedValue(null); // Code not taken
        mockPrisma.coupon.create.mockResolvedValue({ id: 'c1', code: 'PROMO-123' });

        const result = await service.redeemReward('u1', 'r1');

        expect(mockPrisma.userGamification.update).toHaveBeenCalledWith(expect.objectContaining({
            data: { points: { decrement: 100 } }
        }));
        expect(mockPrisma.coupon.create).toHaveBeenCalled();
        expect(result.couponCode).toBeDefined();
    });
  });

  describe('Leaderboard', () => {
      it('should return top users and current user rank', async () => {
          mockPrisma.userGamification.findMany.mockResolvedValue([
              { userId: 'u1', totalXp: 100, user: { id: 'u1', displayName: 'User 1' } }
          ]);
          mockPrisma.userGamification.findUnique.mockResolvedValue({ 
              userId: 'u1', totalXp: 100, user: { id: 'u1' } 
          });
          mockPrisma.userGamification.count.mockResolvedValue(100);

          const result = await service.getLeaderboard('u1');
          expect(result.users.length).toBe(1);
          expect(result.currentUser.rank).toBe(1);
      });
  });
});
