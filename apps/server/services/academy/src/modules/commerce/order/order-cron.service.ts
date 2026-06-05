import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrderService } from './order.service';

@Injectable()
export class OrderCronService {
  private readonly logger = new Logger(OrderCronService.name);

  constructor(private readonly orderService: OrderService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleOrderAutoCancellation() {
    try {
      this.logger.log('Starting scheduled order auto-cancellation check...');
      const count = await this.orderService.handleOrderAutoCancellation();
      if (count > 0) {
        this.logger.log(`Auto-cancelled ${count} expired orders.`);
      }
    } catch (error) {
      this.logger.error(
        'Error during scheduled order auto-cancellation:',
        error,
      );
    }
  }
}
