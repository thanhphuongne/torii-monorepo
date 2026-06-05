import { Controller, Post, Body, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Controller()
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(@Inject('NATS_SERVICE') private readonly nats: ClientProxy) {}

  private async processPayOSWebhook(body: any) {
    const isSuccess = body?.success === true || body?.code === '00';
    if (!isSuccess) {
      return { ok: true, ignored: true, reason: 'PAYMENT_NOT_SUCCESS' };
    }

    const orderCode = body?.data?.orderCode?.toString();
    if (!orderCode) {
      return { ok: true, ignored: true, reason: 'MISSING_ORDER_CODE' };
    }

    try {
      const result = await firstValueFrom(
        this.nats.send(
          { cmd: 'academy.order.handlePaymentSuccess' },
          {
            orderCode,
            transactionId: body.data?.id,
            payload: body,
          },
        ),
      );
      return result;
    } catch (err: any) {
      const message = String(err?.message ?? err);
      const stack = err?.stack ? String(err.stack) : undefined;

      // PayOS "test webhook" commonly uses a dummy orderCode that won't exist in our DB.
      // We must still return 200 so PayOS can validate the webhook URL.
      if (/order not found/i.test(message)) {
        this.logger.warn(
          `Ignoring PayOS webhook (order not found): orderCode=${orderCode}`,
        );
        return { ok: true, ignored: true, reason: 'ORDER_NOT_FOUND' };
      }

      this.logger.error(`PayOS webhook processing failed: ${message}`, stack);
      return { ok: true, ignored: true, reason: 'WEBHOOK_PROCESSING_FAILED' };
    }
  }

  // Public PayOS callback route (configured on PayOS dashboard)
  @Post('payos/webhook')
  async handlePayOSPublic(@Body() body: any) {
    return this.processPayOSWebhook(body);
  }
}
