import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from '@server/shared/prisma/prisma.service';
import {
  ActivityType,
  GamificationTransactionType,
  GamificationCurrency,
  CouponDiscountType,
  CouponScope,
  CouponStatus,
} from '@prisma/generated';
import { AchievementService } from './achievement.service';
import { AuditLoggerService } from '../audit-logger.service';

const COUPON_SOURCE_GAMIFICATION_REWARD = 'GAMIFICATION_REWARD';

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly achievementService: AchievementService,
    private readonly audit: AuditLoggerService,
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) { }

  private getVnDateString(d: Date = new Date()) {
    const vn = new Date(
      d.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }),
    );
    const y = vn.getFullYear();
    const m = String(vn.getMonth() + 1).padStart(2, '0');
    const day = String(vn.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private diffDays(aDateStr: string, bDateStr: string) {
    const a = Date.parse(`${aDateStr}T00:00:00.000Z`);
    const b = Date.parse(`${bDateStr}T00:00:00.000Z`);
    return Math.round((b - a) / (1000 * 60 * 60 * 24));
  }

  /**
   * Chuỗi ngày liên tiếp: diff=1 → +1; diff=2 + còn freeze → dùng 1 freeze coi như nối được (miss 1 ngày);
   * diff>2 hoặc hết freeze → reset về 1.
   */
  /**
   * Chuỗi ngày liên tiếp (Phong cách Riki):
   * - diff=1: Học liên tiếp -> +1 streak.
   * - diff=2: Bỏ lỡ 1 ngày -> Nếu có Lá chắn (shield), tiêu 1 cái để giữ streak.
   * - diff>2 hoặc hết khiên: Reset streak về 1.
   */
  private computeStreakTransition(
    lastActive: string | null,
    todayStr: string,
    currentStreak: number,
    maxStreak: number,
    shieldCount: number,
  ): {
    nextStreak: number;
    nextMax: number;
    shieldsConsumed: number;
    resetConsecutive: boolean;
  } {
    if (!lastActive) {
      return {
        nextStreak: 1,
        nextMax: Math.max(maxStreak, 1),
        shieldsConsumed: 0,
        resetConsecutive: false,
      };
    }
    if (lastActive === todayStr) {
      return {
        nextStreak: currentStreak,
        nextMax: maxStreak,
        shieldsConsumed: 0,
        resetConsecutive: false,
      };
    }
    const diff = this.diffDays(lastActive, todayStr);
    if (diff === 1) {
      const ns = currentStreak + 1;
      return {
        nextStreak: ns,
        nextMax: Math.max(maxStreak, ns),
        shieldsConsumed: 0,
        resetConsecutive: false,
      };
    }

    // Riki Shield Logic: Nếu nghỉ 1 ngày (diff=2) và còn khiên
    if (diff === 2 && shieldCount > 0) {
      return {
        nextStreak: currentStreak, // Giữ nguyên streak nhờ khiên
        nextMax: maxStreak,
        shieldsConsumed: 1,
        resetConsecutive: true, // Dùng khiên thì reset đếm ngày liên tiếp hồi khiên
      };
    }

    // Đứt chuỗi hoàn toàn
    return {
      nextStreak: 1,
      nextMax: Math.max(maxStreak, 1),
      shieldsConsumed: 0,
      resetConsecutive: true,
    };
  }

  /**
   * Một nguồn sự thật cho streak: bảng `streaks` + đồng bộ `user_gamification` (leaderboard / profile).
   */
  /** `tx`: client trong callback `prisma.$transaction`. */
  private async applyDailyStreakAndSync(
    tx: any,
    userId: string,
    dateString: string,
  ): Promise<{ streakSavedByShield: boolean }> {
    await tx.userGamification.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        currentXp: 0,
        totalXp: 0,
        points: 0,
        level: 1,
        currentStreak: 0,
        longestStreak: 0,
        consecutiveActiveDays: 0,
      },
    });

    const prof = await tx.userGamification.findUnique({ where: { userId } });
    const shieldCount = prof?.freezeCount ?? 0;

    await tx.streakLog.upsert({
      where: { userId_date: { userId, date: dateString } },
      update: { status: 'ACTIVE' },
      create: { userId, date: dateString, status: 'ACTIVE' },
    });

    const streakRow = await tx.streak.findUnique({ where: { userId } });
    if (!streakRow) {
      await tx.streak.create({
        data: {
          userId,
          currentStreak: 1,
          maxStreak: 1,
          lastActiveDate: dateString,
          freezeUsedToday: false,
        },
      });
      await tx.userGamification.update({
        where: { userId },
        data: {
          currentStreak: 1,
          longestStreak: 1,
          lastActiveDate: dateString,
          consecutiveActiveDays: 1,
          totalActiveDays: { increment: 1 },
        },
      });
      return { streakSavedByShield: false };
    }

    if (streakRow.lastActiveDate === dateString) {
      return { streakSavedByShield: false };
    }

    const t = this.computeStreakTransition(
      streakRow.lastActiveDate,
      dateString,
      streakRow.currentStreak,
      streakRow.maxStreak,
      shieldCount,
    );
    const streakSavedByShield = t.shieldsConsumed > 0;

    // Cập nhật đếm ngày liên tiếp (để hồi phục khiên)
    let newConsecutive = prof?.consecutiveActiveDays || 0;
    if (t.resetConsecutive) {
      newConsecutive = 1; // RESET nếu đứt chuỗi hoặc dùng khiên
    } else {
      newConsecutive += 1;
    }

    // Logic hồi phục khiên (Riki: 2 ngày hồi 1, 5 ngày hồi đủ 2)
    let newShieldCount = shieldCount - t.shieldsConsumed;
    if (newConsecutive >= 5) {
      newShieldCount = 2;
    } else if (newConsecutive >= 2) {
      newShieldCount = Math.max(newShieldCount, 1);
    }

    await tx.streak.update({
      where: { userId },
      data: {
        currentStreak: t.nextStreak,
        maxStreak: t.nextMax,
        lastActiveDate: dateString,
        freezeUsedToday: streakSavedByShield,
      },
    });

    await tx.userGamification.update({
      where: { userId },
      data: {
        currentStreak: t.nextStreak,
        longestStreak: t.nextMax,
        lastActiveDate: dateString,
        freezeCount: newShieldCount,
        consecutiveActiveDays: newConsecutive,
        totalActiveDays: { increment: 1 },
      },
    });

    if (streakSavedByShield) {
      // Ghi nhận ngày được bảo vệ bởi lá chắn là 'FREEZE'
      const today = new Date(`${dateString}T00:00:00.000Z`);
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const yesterdayStr = this.getVnDateString(yesterday);

      await tx.streakLog.upsert({
        where: { userId_date: { userId, date: yesterdayStr } },
        update: { status: 'FREEZE' },
        create: { userId, date: yesterdayStr, status: 'FREEZE' },
      });
    }

    return { streakSavedByShield };
  }

  private readonly EARNING_RULES: Record<
    string,
    { xp: number; points: number }
  > = {
      [ActivityType.LOGIN]: { xp: 10, points: 5 }, // Riki: Login thưởng 5 pts
      [ActivityType.LESSON_COMPLETE]: { xp: 20, points: 2 },
      [ActivityType.EXAM_COMPLETE]: { xp: 150, points: 10 },
      [ActivityType.REVIEW]: { xp: 5, points: 1 },
      [ActivityType.FLASHCARD_REVIEW]: { xp: 5, points: 1 },
      [ActivityType.QUIZ_ANSWER]: { xp: 1, points: 0 },
      [ActivityType.PRACTICE]: { xp: 2, points: 0 },
    };

  private readonly ACTIVITY_WEIGHTS: Record<string, number> = {
    [ActivityType.LOGIN]: 1,
    [ActivityType.LESSON_COMPLETE]: 5,
    [ActivityType.EXAM_COMPLETE]: 10,
    [ActivityType.REVIEW]: 3,
    [ActivityType.FLASHCARD_REVIEW]: 2,
    [ActivityType.QUIZ_ANSWER]: 1,
    [ActivityType.PRACTICE]: 1,
  };

  private readonly DAILY_XP_CAP: Partial<Record<ActivityType, number>> = {
    [ActivityType.QUIZ_ANSWER]: 20,
    [ActivityType.FLASHCARD_REVIEW]: 15,
    [ActivityType.PRACTICE]: 10,
  };

  private readonly DAILY_POINTS_CAP: Partial<Record<ActivityType, number>> = {
    [ActivityType.LOGIN]: 5,
    [ActivityType.LESSON_COMPLETE]: 20,
    [ActivityType.EXAM_COMPLETE]: 30,
    [ActivityType.FLASHCARD_REVIEW]: 10,
    [ActivityType.REVIEW]: 10,
  };

  /**
   * Track a user learning activity and reward them.
   * Also updates streak based on real learning activities instead of simple logins.
   */
  async trackActivity(
    userId: string,
    activityType: ActivityType,
    metadata: any = {},
  ) {
    this.logger.log(
      `Tracking activity: ${activityType} for user ${userId} with meta: ${JSON.stringify(metadata)}`,
    );
    const rule = this.EARNING_RULES[activityType];
    if (!rule) {
      return {
        amount: 0,
        message: 'No points awarded for this activity.',
      };
    }

    const dateString = this.getVnDateString();

    // Points/XP Award Eligibility Check
    let shouldAward = true;

    if (activityType === ActivityType.LOGIN) {
      // LOGIN chỉ thưởng một lần/ngày (bất kỳ bản ghi EARN nào: XP hoặc POINT)
      // Sử dụng metadata.date (chuỗi YYYY-MM-DD theo giờ VN) để đảm bảo chính xác theo múi giờ
      const existingLoginAward =
        await this.prisma.gamificationHistory.findFirst({
          where: {
            userId,
            activityType: ActivityType.LOGIN,
            type: GamificationTransactionType.EARN,
            metadata: {
              path: ['date'],
              equals: dateString,
            },
          },
        });
      if (existingLoginAward) {
        shouldAward = false;
      }
    } else if (activityType === ActivityType.REVIEW && metadata?.reviewId) {
      // Ensure no duplicate points for the same review
      const existingHistory = await this.prisma.gamificationHistory.findFirst({
        where: {
          userId,
          activityType: ActivityType.REVIEW,
          metadata: { path: ['reviewId'], equals: metadata.reviewId },
        },
      });

      if (existingHistory) {
        shouldAward = false;
      }
    } else if (
      activityType === ActivityType.LESSON_COMPLETE &&
      metadata?.lessonId
    ) {
      // Ensure each lesson only rewards XP/points once per user
      const existingLessonHistory =
        await this.prisma.gamificationHistory.findFirst({
          where: {
            userId,
            activityType: ActivityType.LESSON_COMPLETE,
            metadata: { path: ['lessonId'], equals: metadata.lessonId },
          },
        });

      if (existingLessonHistory) {
        shouldAward = false;
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const { streakSavedByShield } = await this.applyDailyStreakAndSync(
        tx,
        userId,
        dateString,
      );

      if (!shouldAward) {
        return {
          xpEarned: 0,
          pointsEarned: 0,
          streakSavedByShield,
          message:
            'Activity tracked, but rewards already awarded for this item/day.',
        };
      }

      let profile = await tx.userGamification.findUnique({ where: { userId } });
      if (!profile) {
        profile = await tx.userGamification.create({
          data: {
            userId,
            currentXp: 0,
            totalXp: 0,
            points: 0,
            level: 1,
          },
        });
      }

      // --- Caps & dedup ---


      // Dedup per object for mini-games (optional metadata keys)
      const dedupKey = metadata?.lessonId
        ? `lesson:${metadata.lessonId}`
        : metadata?.setId || metadata?.studySetId
          ? `set:${metadata.setId || metadata.studySetId}`
          : metadata?.quizId
            ? `quiz:${metadata.quizId}`
            : metadata?.gameId
              ? `game:${metadata.gameId}`
              : null;

      if (dedupKey) {
        const existing = await tx.gamificationHistory.findFirst({
          where: {
            userId,
            activityType,
            type: GamificationTransactionType.EARN,
            AND: [
              { metadata: { path: ['date'], equals: dateString } },
              { metadata: { path: ['dedupKey'], equals: dedupKey } },
            ],
          },
        });
        if (existing) {
          return {
            xpEarned: 0,
            pointsEarned: 0,
            streakSavedByShield,
            message: 'Duplicate reward for this item today.',
          };
        }
      }

      const { xp, points } = rule;
      let xpAward = xp;
      let pointsAward = points;

      const xpCap = this.DAILY_XP_CAP[activityType];
      if (xpCap != null && xpAward > 0) {
        const s = await tx.gamificationHistory.aggregate({
          where: {
            userId,
            activityType,
            currency: GamificationCurrency.XP,
            type: GamificationTransactionType.EARN,
            metadata: { path: ['date'], equals: dateString },
          },
          _sum: { amount: true },
        });
        const used = s._sum.amount ?? 0;
        xpAward = Math.max(0, Math.min(xpAward, xpCap - used));
      }

      const pointsCap = this.DAILY_POINTS_CAP[activityType];
      if (pointsCap != null && pointsAward > 0) {
        const s = await tx.gamificationHistory.aggregate({
          where: {
            userId,
            activityType,
            currency: GamificationCurrency.POINT,
            type: GamificationTransactionType.EARN,
            metadata: { path: ['date'], equals: dateString },
          },
          _sum: { amount: true },
        });
        const used = s._sum.amount ?? 0;
        pointsAward = Math.max(0, Math.min(pointsAward, pointsCap - used));
      }

      const rewardMeta = {
        ...metadata,
        date: dateString,
        source: 'ACTIVITY',
        ...(dedupKey ? { dedupKey } : {}),
      };

      if (xpAward === 0 && pointsAward === 0) {
        return {
          xpEarned: 0,
          pointsEarned: 0,
          streakSavedByShield,
          message: 'Daily cap reached.',
        };
      }

      // Cấp độ phi tuyến tính: Cấp 2 cần 200 XP, Cấp 3 cần thêm 300 XP (tổng 500), Cấp 4 cần thêm 400 XP (tổng 900)...
      // Công thức: TotalXP = 50 * (L^2 + L - 2)
      const newTotalXp = profile.totalXp + xpAward;
      const newLevel = Math.floor((-1 + Math.sqrt(1 + 8 * (newTotalXp / 100 + 1))) / 2); // 1 + 8*(totalXp/100 + 1) = 9 + totalXp/12.5
      
      const xpForCurrentLevel = 50 * (newLevel * newLevel + newLevel - 2);
      const newCurrentXp = newTotalXp - xpForCurrentLevel;

      const updatedProfile = await tx.userGamification.update({
        where: { userId },
        data: {
          totalXp: newTotalXp,
          currentXp: newCurrentXp,
          points: { increment: pointsAward },
          level: newLevel,
        },
      });

      // Write point tracking in history
      if (pointsAward > 0) {
        await tx.gamificationHistory.create({
          data: {
            userId,
            amount: pointsAward,
            currency: GamificationCurrency.POINT,
            type: GamificationTransactionType.EARN,
            activityType,
            description: metadata?.lessonTitle || `Received points for ${activityType}`,
            metadata: rewardMeta,
          },
        });
      }

      if (xpAward > 0) {
        await tx.gamificationHistory.create({
          data: {
            userId,
            amount: xpAward,
            currency: GamificationCurrency.XP,
            type: GamificationTransactionType.EARN,
            activityType,
            description: metadata?.lessonTitle || `Received XP for ${activityType}`,
            metadata: rewardMeta,
          },
        });
      }

      const result = {
        xpEarned: xpAward,
        pointsEarned: pointsAward,
        newLevel: updatedProfile.level,
        streakSavedByShield,
      };

      // Level up notification (only when level actually increases)
      if (newLevel > profile.level) {
        try {
          this.natsClient.emit(
            { cmd: 'send_notification' },
            {
              recipientId: userId,
              type: 'system',
              payload: {
                title: 'Bạn vừa lên cấp độ mới ⭐',
                body: `Chúc mừng! Bạn đã đạt cấp độ ${newLevel}. Tiếp tục học để mở khóa thêm thành tựu và phần thưởng.`,
                metadata: {
                  previousLevel: profile.level,
                  newLevel,
                  activityType,
                },
              },
            },
          );
        } catch (error: any) {
          this.logger.error(
            `Failed to emit level-up notification for user ${userId}: ${error.message}`,
          );
        }
      }

      // Update streak & evaluate achievements asynchronously based on this activity
      // Note: we don't await to keep the main transaction fast
      this.achievementService
        .evaluateForUser(userId)
        .catch((err) =>
          this.logger.error(
            `Failed to update streak/achievements for user ${userId}:`,
            err,
          ),
        );

      return result;
    });
  }

  /**
   * Get gamification profile WITHOUT mutating streak or tracking login.
   * Streak is now updated only when real learning activities are recorded.
   */
  async getProfile(userId: string) {
    let profile = await this.prisma.userGamification.findUnique({
      where: { userId },
    });
    if (!profile) {
      profile = await this.prisma.userGamification.create({
        data: {
          userId,
          currentXp: 0,
          totalXp: 0,
          points: 0,
          level: 1,
        },
      });
    }

    // Tự động tính toán lại level dựa trên totalXp nếu có sự sai lệch (do thay đổi công thức)
    // Công thức: L = floor((-1 + sqrt(9 + totalXp/12.5)) / 2)
    const calculatedLevel = Math.floor((-1 + Math.sqrt(9 + profile.totalXp / 12.5)) / 2);
    const xpForCurrentLevel = 50 * (calculatedLevel * calculatedLevel + calculatedLevel - 2);
    const calculatedCurrentXp = profile.totalXp - xpForCurrentLevel;

    if (calculatedLevel !== profile.level || calculatedCurrentXp !== profile.currentXp) {
      profile = await this.prisma.userGamification.update({
        where: { userId },
        data: {
          level: calculatedLevel,
          currentXp: calculatedCurrentXp,
        },
      });
    }

    return profile;
  }

  /**
   * Trạng thái streak chỉ đọc (không ghi streak / streak_log).
   * Streak được cập nhật trong `trackActivity` (LOGIN qua NATS, học bài, …).
   */
  async getStreakStatus(userId: string) {
    let profile = await this.prisma.userGamification.findUnique({
      where: { userId },
    });

    if (!profile) {
      profile = await this.prisma.userGamification.create({
        data: { userId, currentXp: 0, totalXp: 0, points: 0, level: 1 },
      });
    }

    const todayStr = this.getVnDateString();
    const streak = await this.prisma.streak.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        currentStreak: 0,
        maxStreak: 0,
        lastActiveDate: null,
        freezeUsedToday: false,
      },
    });

    const isActiveToday = streak.lastActiveDate === todayStr;
    const willBreakTomorrow = isActiveToday && (streak.currentStreak ?? 0) > 0;

    // Show once/day across devices (persisted)
    const shouldShowToast = profile.lastToastShownDate !== todayStr;

    const recent = await this.prisma.streakLog.findMany({
      where: {
        userId,
        status: { in: ['ACTIVE', 'FREEZE'] },
      },
      select: { date: true, status: true },
      orderBy: { date: 'desc' },
      take: 31,
    });

    // Derive counts from streak logs (DailyActivity removed)
    const totalActiveDays = await this.prisma.streakLog.count({
      where: { userId, status: 'ACTIVE' },
    });

    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    const monthAgo = new Date(now);
    monthAgo.setDate(now.getDate() - 30);

    const toDateStr = (d: Date) => this.getVnDateString(d);
    const weeklyActiveCount = await this.prisma.streakLog.count({
      where: {
        userId,
        status: 'ACTIVE',
        date: { gte: toDateStr(weekAgo), lte: todayStr },
      },
    });
    const monthlyActiveCount = await this.prisma.streakLog.count({
      where: {
        userId,
        status: 'ACTIVE',
        date: { gte: toDateStr(monthAgo), lte: todayStr },
      },
    });

    return {
      currentStreak: streak.currentStreak ?? 0,
      longestStreak: streak.maxStreak ?? 0,
      freezeCount: profile.freezeCount ?? 0,
      consecutiveActiveDays: profile.consecutiveActiveDays ?? 0,
      streakSavedByFreeze: streak.freezeUsedToday ?? false,
      isActiveToday,
      willBreakTomorrow,
      lastActiveDate: streak.lastActiveDate ?? null,
      totalActiveDays,
      weeklyActiveCount,
      monthlyActiveCount,
      recentActiveDates: recent
        .filter((r) => r.status === 'ACTIVE')
        .map((r) => r.date),
      recentFreezeDates: recent
        .filter((r) => r.status === 'FREEZE')
        .map((r) => r.date),
      shouldShowToast,
    };
  }

  async markToastShown(userId: string) {
    const todayStr = this.getVnDateString();
    await this.prisma.userGamification.upsert({
      where: { userId },
      update: { lastToastShownDate: todayStr },
      create: {
        userId,
        currentXp: 0,
        totalXp: 0,
        points: 0,
        level: 1,
        lastToastShownDate: todayStr,
      },
    });
    return { success: true };
  }

  async getLeaderboard(userId: string, type?: string) {
    const mode = (type || 'global') as 'global' | 'streak' | 'active';
    let orderBy: any = { totalXp: 'desc' };

    if (mode === 'streak') {
      orderBy = { currentStreak: 'desc' };
    } else if (mode === 'active') {
      orderBy = { totalActiveDays: 'desc' };
    }

    const top = await this.prisma.userGamification.findMany({
      orderBy,
      take: 50,
      select: {
        userId: true,
        level: true,
        totalXp: true,
        currentStreak: true,
        totalActiveDays: true,
        user: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });

    const users = top.map((g, index) => ({
      id: g.user.id,
      displayName: g.user.displayName,
      avatarUrl: g.user.avatarUrl,
      xp: g.totalXp,
      currentStreak: g.currentStreak,
      level: g.level,
      totalActiveDays: g.totalActiveDays,
      rank: index + 1,
    }));

    const current = await this.prisma.userGamification.findUnique({
      where: { userId },
      select: {
        userId: true,
        level: true,
        totalXp: true,
        currentStreak: true,
        totalActiveDays: true,
        user: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });

    let currentUser: any = null;
    if (current) {
      const currentRankInTop = users.find(
        (u) => u.id === current.user.id,
      )?.rank;
      currentUser = {
        id: current.user.id,
        displayName: current.user.displayName,
        avatarUrl: current.user.avatarUrl,
        xp: current.totalXp,
        currentStreak: current.currentStreak,
        level: current.level,
        totalActiveDays: current.totalActiveDays,
        rank: currentRankInTop || 0,
      };
    }

    const totalUsers = await this.prisma.userGamification.count();

    return { users, currentUser, totalUsers, type: mode };
  }

  async getHistory(userId: string, limit: number = 20, offset: number = 0) {
    return this.prisma.gamificationHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async getRewards() {
    return this.prisma.pointReward.findMany({
      where: { isActive: true },
    });
  }

  /**
   * Đổi điểm lấy coupon cá nhân (PointReward type COUPON, config trong JSON).
   */
  async redeemReward(userId: string, rewardId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const reward = await tx.pointReward.findUnique({
        where: { id: rewardId },
      });

      if (!reward || !reward.isActive) {
        throw new NotFoundException('Reward not found or inactive');
      }

      if ((reward.type || 'COUPON').toUpperCase() !== 'COUPON') {
        throw new BadRequestException(
          'Chỉ hỗ trợ đổi phần thưởng dạng coupon.',
        );
      }

      const profile = await tx.userGamification.findUnique({
        where: { userId },
      });

      if (!profile || profile.points < reward.costPoints) {
        throw new BadRequestException(
          'Insufficient points to redeem this reward',
        );
      }

      const config = (reward.config as Record<string, unknown>) || {};

      await tx.userGamification.update({
        where: { userId },
        data: {
          points: { decrement: reward.costPoints },
        },
      });

      const rawPrefix = String(config.prefix ?? 'RWD')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
      const prefix = rawPrefix.length > 0 ? rawPrefix.slice(0, 10) : 'RWD';

      let allocated = '';
      for (let attempt = 0; attempt < 16; attempt++) {
        const candidate =
          attempt < 12
            ? `${prefix}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
            : `RWD-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`;
        const taken = await tx.coupon.findUnique({
          where: { code: candidate },
        });
        if (!taken) {
          allocated = candidate;
          break;
        }
      }
      if (!allocated) {
        throw new BadRequestException('Không tạo được mã coupon, thử lại sau');
      }

      const discountType =
        config.discountType === 'FIXED_AMOUNT'
          ? CouponDiscountType.FIXED_AMOUNT
          : CouponDiscountType.PERCENTAGE;
      const discountValue = Number(config.discountValue ?? 1);
      if (!Number.isFinite(discountValue) || discountValue <= 0) {
        throw new BadRequestException('Cấu hình phần thưởng coupon không hợp lệ');
      }
      if (
        discountType === CouponDiscountType.PERCENTAGE &&
        discountValue > 100
      ) {
        throw new BadRequestException(
          'Cấu hình phần thưởng coupon không hợp lệ: phần trăm giảm tối đa là 100%',
        );
      }
      const validDays = Math.max(1, Number(config.validDays ?? 30));
      const now = new Date();
      const endDate = new Date(
        now.getTime() + validDays * 24 * 60 * 60 * 1000,
      );

      const created = await tx.coupon.create({
        data: {
          code: allocated,
          name: reward.name,
          description: reward.description ?? undefined,
          discountType,
          discountValue,
          maxDiscountAmount:
            config.maxDiscountAmount != null
              ? Number(config.maxDiscountAmount)
              : null,
          minOrderValue:
            config.minOrderValue != null
              ? Number(config.minOrderValue)
              : null,
          usageLimit: 1,
          usageCount: 0,
          perUserLimit: 1,
          startDate: now,
          endDate,
          status: CouponStatus.ACTIVE,
          scope: CouponScope.GLOBAL,
          ownerId: userId,
          source: COUPON_SOURCE_GAMIFICATION_REWARD,
          metadata: {
            rewardId,
            rewardName: reward.name,
          } as object,
        },
      });

      await tx.gamificationHistory.create({
        data: {
          userId,
          amount: -reward.costPoints,
          currency: GamificationCurrency.POINT,
          type: GamificationTransactionType.REDEEM,
          description: `Redeemed ${reward.name}`,
          metadata: {
            rewardId,
            rewardName: reward.name,
            rewardType: 'COUPON',
            couponCode: created.code,
            couponId: created.id,
            date: this.getVnDateString(),
            ...config,
          },
        },
      });

      return {
        success: true,
        message: 'Đổi phần thưởng thành công!',
        couponCode: created.code,
        rewardName: reward.name,
      };
    });

    try {
      this.natsClient.emit(
        { cmd: 'send_notification' },
        {
          recipientId: userId,
          type: 'system',
          payload: {
            title: 'Bạn vừa đổi quà thành công 🎁',
            body: `Bạn đã dùng điểm để đổi phần thưởng "${result.rewardName}". Mã coupon của bạn là ${result.couponCode}.`,
            metadata: {
              rewardId,
              rewardName: result.rewardName,
              couponCode: result.couponCode,
            },
          },
        },
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to emit notification for redeemReward user=${userId}, reward=${rewardId}: ${error.message}`,
      );
    }

    return {
      success: result.success,
      message: result.message,
      couponCode: result.couponCode,
    };
  }

  // --- Admin CRUD ---

  async admin_getAllRewards() {
    return this.prisma.pointReward.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async admin_createReward(data: any, requesterId = 'SYSTEM') {
    const reward = await this.prisma.pointReward.create({
      data: {
        name: data.name,
        description: data.description,
        costPoints: data.costPoints,
        type: data.type || 'COUPON',
        config: data.config || {},
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });

    await this.audit.log({
      userId: requesterId,
      action: 'gamification.reward.create',
      entity: 'PointReward',
      entityId: reward.id,
      description: `Created reward: ${reward.name} (${reward.costPoints} points)`,
      newValues: {
        name: reward.name,
        costPoints: reward.costPoints,
        isActive: reward.isActive,
      },
    });

    return reward;
  }

  async admin_updateReward(id: string, data: any, requesterId = 'SYSTEM') {
    const old = await this.prisma.pointReward.findUnique({
      where: { id },
      select: { name: true, isActive: true },
    });
    const updated = await this.prisma.pointReward.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        costPoints: data.costPoints,
        type: data.type,
        config: data.config,
        isActive: data.isActive,
      },
    });

    await this.audit.log({
      userId: requesterId,
      action: 'gamification.reward.update',
      entity: 'PointReward',
      entityId: id,
      description: `Updated reward: ${old?.name || id}`,
      oldValues: { name: old?.name, isActive: old?.isActive },
      newValues: { name: updated.name, isActive: updated.isActive },
    });

    return updated;
  }

  async admin_deleteReward(id: string, requesterId = 'SYSTEM') {
    const reward = await this.prisma.pointReward.findUnique({ where: { id } });
    const result = await this.prisma.pointReward.delete({
      where: { id },
    });

    await this.audit.log({
      userId: requesterId,
      action: 'gamification.reward.delete',
      entity: 'PointReward',
      entityId: id,
      description: `Deleted reward: ${reward?.name || id}`,
      metadata: { name: reward?.name },
    });

    return result;
  }

  // activity-heatmap removed (DailyActivity removed)
}
