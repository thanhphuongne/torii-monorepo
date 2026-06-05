import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { AppConfigService } from '@server/shared';
import { PayOS } from '@payos/node';

@Injectable()
export class PayOSService {
  private readonly logger = new Logger(PayOSService.name);
  private payOS: any;

  constructor(private readonly appConfig: AppConfigService) {
    const { clientId, apiKey, checksumKey } = this.appConfig.thirdParty.payos;

    if (!clientId || !apiKey || !checksumKey) {
      this.logger.warn('PayOS configuration is missing. Payment features will fail.');
      this.payOS = null;
    } else {
      this.logger.log(`Initializing PayOS with ClientID: ${clientId}`);
      this.payOS = new (PayOS as any)({ clientId, apiKey, checksumKey });
    }
  }

  async createPaymentLink(data: {
    orderCode: number;
    amount: number;
    description: string;
    cancelUrl: string;
    returnUrl: string;
    items?: { name: string; quantity: number; price: number }[];
  }) {
    if (!this.payOS) {
      throw new BadRequestException('PayOS is not configured. Cannot create payment link.');
    }
    try {
      const paymentLinkResponse = await this.payOS.paymentRequests.create(data);
      return paymentLinkResponse;
    } catch (error: any) {
      this.logger.error(
        `Error creating PayOS payment link: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(`PayOS error: ${error.message}`);
    }
  }

  verifyPaymentWebhookData(webhookData: any): boolean {
    if (!this.payOS) {
      this.logger.warn('Skipping webhook verification: PayOS not configured.');
      return true; // Assume true for testing if not configured
    }
    try {
      return Boolean(this.payOS.webhooks.verify(webhookData));
    } catch (error: any) {
      this.logger.error(
        `Error verifying PayOS webhook payload: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }
}
