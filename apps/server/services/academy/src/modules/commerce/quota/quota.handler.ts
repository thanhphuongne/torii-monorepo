import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { QuotaService } from './quota.service';
import { AiSubscriptionService } from './ai-subscription.service';

@Controller()
export class QuotaHandler {
  private readonly logger = new Logger(QuotaHandler.name);

  constructor(
    private readonly quotaService: QuotaService,
    private readonly aiSubscriptionService: AiSubscriptionService,
  ) {}

  @MessagePattern({ cmd: 'billing.quota.checkAndConsume' })
  async checkAndConsume(@Payload() data: { userId: string; feature?: string }) {
    try {
      return await this.quotaService.checkAndConsume(data.userId, data.feature);
    } catch (error: any) {
      this.logger.error(
        `Error in billing.quota.checkAndConsume: ${error.message}`,
        error.stack,
      );
      return { allowed: false, error: error.message };
    }
  }

  @MessagePattern({ cmd: 'billing.quota.getStatus' })
  async getStatus(@Payload() data: { userId: string; feature?: string }) {
    try {
      return await this.quotaService.getStatus(data.userId, data.feature);
    } catch (error: any) {
      this.logger.error(
        `Error in billing.quota.getStatus: ${error.message}`,
        error.stack,
      );
      return { error: error.message };
    }
  }

  @MessagePattern({ cmd: 'billing.subscription.getPlans' })
  async getPlans() {
    try {
      const plans = await this.aiSubscriptionService.getPlans();
      return plans.map((p) => ({
        ...p,
        price: parseFloat(p.price.toString()),
      }));
    } catch (error: any) {
      this.logger.error(
        `Error in billing.subscription.getPlans: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  @MessagePattern({ cmd: 'admin.billing.subscription.getAllPlans' })
  async adminGetAllPlans() {
    try {
      const plans = await this.aiSubscriptionService.admin_getAllPlans();
      return plans.map((p) => ({
        ...p,
        price: parseFloat(p.price.toString()),
      }));
    } catch (error: any) {
      this.logger.error(
        `Error in admin.billing.subscription.getAllPlans: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  @MessagePattern({ cmd: 'admin.billing.subscription.updatePlan' })
  async adminUpdatePlan(@Payload() data: { id: string; plan: any }) {
    try {
      return await this.aiSubscriptionService.admin_updatePlan(
        data.id,
        data.plan,
      );
    } catch (error: any) {
      this.logger.error(
        `Error in admin.billing.subscription.updatePlan: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'admin.billing.subscription.getUserSubscriptions' })
  async adminGetUserSubscriptions(
    @Payload()
    params: {
      page: number;
      limit: number;
      search?: string;
      planCode?: string;
    },
  ) {
    try {
      return await this.aiSubscriptionService.admin_getUserSubscriptions(
        params,
      );
    } catch (error: any) {
      this.logger.error(
        `Error in admin.billing.subscription.getUserSubscriptions: ${error.message}`,
        error.stack,
      );
      return { items: [], total: 0, page: 1, totalPages: 0 };
    }
  }
}
