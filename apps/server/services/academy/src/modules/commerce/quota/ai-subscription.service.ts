import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@server/shared/prisma/prisma.service';

@Injectable()
export class AiSubscriptionService {
  private readonly logger = new Logger(AiSubscriptionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all active AI subscription plans
   */
  async getPlans() {
    return this.prisma.aiSubscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });
  }

  /**
   * Get active subscription for a user
   */
  async getActiveSubscription(userId: string) {
    const now = new Date();
    return this.prisma.aiUserSubscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        expiresAt: { gt: now },
      },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Activate or extend a subscription for a user
   */
  async activateSubscription(userId: string, planId: string) {
    const plan = await this.prisma.aiSubscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new Error(`Plan with ID ${planId} not found`);
    }

    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setMonth(now.getMonth() + 1); // 1 month subscription

    // Deactivate existing active subscriptions
    await this.prisma.aiUserSubscription.updateMany({
      where: {
        userId,
        status: 'ACTIVE',
      },
      data: {
        status: 'CANCELLED',
      },
    });

    const subscription = await this.prisma.aiUserSubscription.create({
      data: {
        userId,
        planId,
        planCode: plan.code,
        startedAt: now,
        expiresAt,
        status: 'ACTIVE',
      },
    });

    this.logger.log(`Activated plan ${plan.code} for user ${userId}`);
    return subscription;
  }

  /**
   * Admin: Get all subscription plans
   */
  async admin_getAllPlans() {
    return this.prisma.aiSubscriptionPlan.findMany({
      orderBy: { price: 'asc' },
    });
  }

  /**
   * Admin: Update a plan
   */
  async admin_updatePlan(id: string, data: any) {
    return this.prisma.aiSubscriptionPlan.update({
      where: { id },
      data,
    });
  }

  /**
   * Admin: Get all user subscriptions with pagination
   */
  async admin_getUserSubscriptions(params: {
    page: number;
    limit: number;
    search?: string;
    planCode?: string;
  }) {
    const { page, limit, search, planCode } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (planCode) {
      where.planCode = planCode;
    }
    if (search) {
      where.OR = [
        {
          user: {
            displayName: { contains: search, mode: 'insensitive' },
          },
        },
        {
          user: {
            email: { contains: search, mode: 'insensitive' },
          },
        },
        { userId: { contains: search, mode: 'insensitive' } },
        { planCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.aiUserSubscription.findMany({
        where,
        skip,
        take: limit,
        include: {
          plan: true,
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.aiUserSubscription.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
