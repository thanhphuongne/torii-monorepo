import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from '@server/shared/prisma/prisma.service';
import { AuditLoggerService } from '../audit-logger.service';
import {
  AchievementDTO,
  UserAchievementDTO,
  GamificationTransactionType,
} from '@workspace/schemas';

@Injectable()
export class AchievementService {
  private readonly logger = new Logger(AchievementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLoggerService,
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  async getAchievementsForUser(userId: string): Promise<UserAchievementDTO[]> {
    // Get all active achievements
    const achievements = await this.prisma.achievement.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: 'asc' },
    });

    // Get user's progress for each achievement
    const userAchievements = await this.prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
    });

    const userAchievementMap = new Map(
      userAchievements.map((ua) => [ua.achievementId, ua]),
    );

    return achievements.map((achievement) => {
      const userAchievement = userAchievementMap.get(achievement.id);
      if (userAchievement) {
        return userAchievement as unknown as UserAchievementDTO;
      }

      // If no record exists, return a virtual one with isUnlocked: false
      return {
        id: '', // Temporary ID
        achievementId: achievement.id,
        isUnlocked: false,
        progress: {
          current: 0,
          target: (achievement.requirements as any).value || 0,
        },
        unlockedAt: null,
        achievement: achievement as unknown as AchievementDTO,
      } as UserAchievementDTO;
    });
  }

  async evaluateForUser(userId: string): Promise<void> {
    this.logger.log(`Evaluating achievements for user: ${userId}`);

    const achievements = await this.prisma.achievement.findMany({
      where: { isActive: true },
    });

    const userAchievements = await this.prisma.userAchievement.findMany({
      where: { userId },
    });

    const unlockedAchievementIds = new Set(
      userAchievements
        .filter((ua) => ua.isUnlocked)
        .map((ua) => ua.achievementId),
    );

    for (const achievement of achievements) {
      if (unlockedAchievementIds.has(achievement.id)) {
        continue;
      }

      try {
        const requirements = achievement.requirements as any;
        const currentValue = await this.calculateCriteria(
          userId,
          requirements.type,
          requirements,
        );
        const targetValue = requirements.value;

        const progress = { current: currentValue, target: targetValue };

        // Find or create UserAchievement record to update progress
        const uaRecord = userAchievements.find(
          (ua) => ua.achievementId === achievement.id,
        );

        if (currentValue >= targetValue) {
          await this.unlockAchievement(userId, achievement.id, progress);
        } else {
          // Update progress even if not unlocked
          await this.prisma.userAchievement.upsert({
            where: {
              userId_achievementId: { userId, achievementId: achievement.id },
            },
            update: { progress },
            create: {
              userId,
              achievementId: achievement.id,
              isUnlocked: false,
              progress,
            },
          });
        }
      } catch (error) {
        this.logger.error(
          `Error evaluating achievement ${achievement.code} for user ${userId}:`,
          error,
        );
      }
    }
  }

  private async calculateCriteria(
    userId: string,
    type: string,
    requirements: any,
  ): Promise<number> {
    switch (type) {
      case 'STREAK_DAYS': {
        const streak = await this.prisma.streak.findUnique({
          where: { userId },
        });
        return streak?.currentStreak || 0;
      }
      case 'LONGEST_STREAK': {
        const streak = await this.prisma.streak.findUnique({
          where: { userId },
        });
        return streak?.maxStreak || 0;
      }
      case 'LOGIN_DAYS': {
        return await this.prisma.streakLog.count({
          where: { userId, status: 'ACTIVE' },
        });
      }
      case 'LESSONS_COMPLETED': {
        return await this.prisma.userLessonProgress.count({
          where: { userId, isCompleted: true },
        });
      }
      case 'EXAM_PASSED_COUNT': {
        // V2: exam flow removed
        return 0;
      }
      case 'EXAM_ATTEMPT_COUNT': {
        // V2: exam flow removed
        return 0;
      }
      case 'REVIEWS_PUBLISHED': {
        return await this.prisma.courseReview.count({
          where: { userId, status: 'PUBLISHED' },
        });
      }
      case 'POINTS_EARNED_TOTAL': {
        const result = await this.prisma.gamificationHistory.aggregate({
          where: { userId, type: 'EARN', currency: 'POINT' },
          _sum: { amount: true },
        });
        return result._sum.amount || 0;
      }
      case 'CLASSES_COMPLETED': {
        return await this.prisma.enrollment.count({
          where: { userId, status: 'COMPLETED' },
        });
      }
      case 'ENROLLMENTS_COUNT': {
        return await this.prisma.enrollment.count({
          where: { userId },
        });
      }
      case 'LEVEL_REACHED': {
        const gamification = await this.prisma.userGamification.findUnique({
          where: { userId },
        });
        return gamification?.level || 1;
      }
      default:
        this.logger.warn(`Unknown achievement criteria type: ${type}`);
        return 0;
    }
  }

  private async unlockAchievement(
    userId: string,
    achievementId: string,
    progress: any,
  ): Promise<void> {
    const achievement = await this.prisma.achievement.findUnique({
      where: { id: achievementId },
    });
    if (!achievement) return;

    await this.prisma.$transaction(async (tx) => {
      // Check again inside transaction to prevent double unlock
      const ua = await tx.userAchievement.findUnique({
        where: { userId_achievementId: { userId, achievementId } },
      });

      if (ua?.isUnlocked) return;

      // 1. Mark as unlocked
      await tx.userAchievement.upsert({
        where: { userId_achievementId: { userId, achievementId } },
        update: { isUnlocked: true, unlockedAt: new Date(), progress },
        create: {
          userId,
          achievementId,
          isUnlocked: true,
          unlockedAt: new Date(),
          progress,
        },
      });

      // 2. Handle rewards
      const rewards = achievement.rewards as any;
      if (rewards?.points && rewards.points > 0) {
        await tx.userGamification.update({
          where: { userId },
          data: { points: { increment: rewards.points } },
        });

        await tx.gamificationHistory.create({
          data: {
            userId,
            amount: rewards.points,
            type: 'EARN',
            currency: 'POINT',
            description: `Unlock achievement: ${achievement.title}`,
            metadata: { source: 'ACHIEVEMENT', achievementId: achievement.id },
          },
        });
      }

      // 3. (Optional) In-app notification could be added here
    });
    this.logger.log(`User ${userId} unlocked achievement: ${achievement.code}`);

    // Emit notification via NATS (identity service will create in-app notification)
    try {
      this.natsClient.emit(
        { cmd: 'send_notification' },
        {
          recipientId: userId,
          type: 'system',
          payload: {
            title: 'Bạn vừa mở khóa thành tựu mới 🎉',
            body: `Bạn đã đạt được thành tựu "${achievement.title}". Tiếp tục cố gắng nhé!`,
            metadata: {
              achievementId: achievement.id,
              achievementCode: achievement.code,
              category: (achievement as any).category,
              progress,
              rewards: achievement.rewards,
            },
          },
        },
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to emit notification for unlocked achievement ${achievement.id} of user ${userId}: ${error.message}`,
      );
    }
  }

  // --- Admin CRUD ---

  async admin_getAllAchievements() {
    return this.prisma.achievement.findMany({
      orderBy: { orderIndex: 'asc' },
    });
  }

  async admin_createAchievement(data: any, requesterId = 'SYSTEM') {
    const achievement = await this.prisma.achievement.create({
      data: {
        code: data.code,
        category: data.category,
        title: data.title,
        description: data.description,
        icon: data.icon,
        requirements: data.requirements || {},
        rewards: data.rewards || {},
        isActive: data.isActive !== undefined ? data.isActive : true,
        orderIndex: data.orderIndex || 0,
      },
    });

    await this.audit.log({
      userId: requesterId,
      action: 'achievement.create',
      entity: 'Achievement',
      entityId: achievement.id,
      description: `Created achievement: ${achievement.title} (${achievement.code})`,
      newValues: {
        code: achievement.code,
        title: achievement.title,
        category: achievement.category,
      },
    });

    return achievement;
  }

  async admin_updateAchievement(id: string, data: any, requesterId = 'SYSTEM') {
    const old = await this.prisma.achievement.findUnique({
      where: { id },
      select: { title: true, code: true, isActive: true },
    });
    const updated = await this.prisma.achievement.update({
      where: { id },
      data: {
        code: data.code,
        category: data.category,
        title: data.title,
        description: data.description,
        icon: data.icon,
        requirements: data.requirements,
        rewards: data.rewards,
        isActive: data.isActive,
        orderIndex: data.orderIndex,
      },
    });

    await this.audit.log({
      userId: requesterId,
      action: 'achievement.update',
      entity: 'Achievement',
      entityId: id,
      description: `Updated achievement: ${old?.title || id}`,
      oldValues: { title: old?.title, isActive: old?.isActive },
      newValues: { title: updated.title, isActive: updated.isActive },
    });

    return updated;
  }

  async admin_deleteAchievement(id: string, requesterId = 'SYSTEM') {
    const achievement = await this.prisma.achievement.findUnique({
      where: { id },
    });
    const usedCount = await this.prisma.userAchievement.count({
      where: { achievementId: id },
    });
    let result: any;
    if (usedCount > 0) {
      result = await this.prisma.achievement.update({
        where: { id },
        data: { isActive: false },
      });
    } else {
      result = await this.prisma.achievement.delete({ where: { id } });
    }

    await this.audit.log({
      userId: requesterId,
      action: usedCount > 0 ? 'achievement.deactivate' : 'achievement.delete',
      entity: 'Achievement',
      entityId: id,
      description:
        usedCount > 0
          ? `Deactivated achievement: ${achievement?.title} (in use by ${usedCount} users)`
          : `Deleted achievement: ${achievement?.title}`,
      metadata: { code: achievement?.code, usedCount },
    });

    return result;
  }
}
