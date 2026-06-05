import { Module } from '@nestjs/common';
import { SharedEmailModule } from '@server/shared';
import { EmailService } from '@server/identity/modules/email/email.service';
import { EmailHandler } from '@server/identity/modules/email/email.handler';

/**
 * Email Module
 * Handles email operations
 */
@Module({
  imports: [SharedEmailModule],
  controllers: [EmailHandler],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
