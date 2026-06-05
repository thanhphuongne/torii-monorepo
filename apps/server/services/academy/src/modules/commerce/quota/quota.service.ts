import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '@server/shared/prisma/prisma.service';
import { REDIS_CLIENT } from '@server/shared/redis/redis.provider';
import Redis from 'ioredis';
import { AiSubscriptionService } from './ai-subscription.service';

export interface QuotaStatus {
  tier: string;
  limit: number;
  used: number;
  remaining: number;
  resetAt: string;
  expiresAt?: string;
}

@Injectable()
export class QuotaService {
  private readonly logger = new Logger(QuotaService.name);

  // Default limits if no active subscription found
  private readonly DEFAULT_LIMITS: Record<string, number> = {
    free: 10,
    plus: 100,
    premium: 5000,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiSubscriptionService: AiSubscriptionService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) { }

  async checkAndConsume(
    userId: string,
    feature: string = 'ai_turns',
  ): Promise<{ allowed: boolean; status: QuotaStatus }> {
    const status = await this.getStatus(userId, feature);

    if (status.limit !== -1 && status.used >= status.limit) {
      return { allowed: false, status };
    }

    // Increment usage in Redis
    const key = this.getUsageKey(userId, feature);
    const newUsed = await this.redis.incr(key);

    // Set expiration to 24 hours if it's a new key
    if (newUsed === 1) {
      await this.redis.expire(key, 86400); // 24 hours
    }

    status.used = newUsed;
    status.remaining =
      status.limit === -1 ? -1 : Math.max(0, status.limit - newUsed);

    return { allowed: true, status };
  }

  async getStatus(
    userId: string,
    feature: string = 'ai_turns',
  ): Promise<QuotaStatus> {
    const tierInfo = await this.getUserTier(userId);
    const limit =
      (tierInfo.quotas as any)?.[feature] ??
      this.DEFAULT_LIMITS[tierInfo.tier] ??
      10;

    const key = this.getUsageKey(userId, feature);
    const usedRaw = await this.redis.get(key);
    const used = usedRaw ? parseInt(usedRaw, 10) : 0;

    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    return {
      tier: tierInfo.tier,
      limit,
      used,
      remaining: limit === -1 ? -1 : Math.max(0, limit - used),
      resetAt: tomorrow.toISOString(),
      expiresAt: tierInfo.expiresAt,
    };
  }

  private async getUserTier(
    userId: string,
  ): Promise<{ tier: string; quotas: object; expiresAt?: string }> {
    const activeSub =
      await this.aiSubscriptionService.getActiveSubscription(userId);

    if (!activeSub) {
      return {
        tier: 'free',
        quotas: { ai_turns: this.DEFAULT_LIMITS['free'] },
      };
    }

    return {
      tier: activeSub.planCode,
      quotas: (activeSub.plan.quotas as object) ?? {},
      expiresAt: activeSub.expiresAt.toISOString(),
    };
  }

  private getUsageKey(userId: string, feature: string): string {
    const dateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    return `quota:${userId}:${feature}:${dateStr}`;
  }
}
