import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { EmailService } from '@server/identity/modules/email/email.service';
import type { SendEmailEvent } from '@server/identity/infrastructure/events/email.event';

/**
 * Email NATS Message Handler
 * Handles event-driven email sending via NATS
 */
@Controller()
export class EmailHandler {
  private readonly logger = new Logger(EmailHandler.name);

  constructor(private readonly emailService: EmailService) {}

  /**
   * Handle send_email event from NATS
   * @EventPattern - Listens to events (fire-and-forget)
   */
  @EventPattern({ cmd: 'send_email' })
  async handleSendEmail(@Payload() event: SendEmailEvent): Promise<void> {
    this.logger.log(`Received send_email event for type: ${event.type}`);

    try {
      await this.emailService.sendEmail(event);
      this.logger.log(`Email sent successfully for type: ${event.type}`);
    } catch (error: any) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      // Don't throw - this is an event handler, failures should be logged only
    }
  }
}
