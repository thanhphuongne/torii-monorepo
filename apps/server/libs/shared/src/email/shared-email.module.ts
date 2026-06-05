import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SharedEmailService } from './shared-email.service';

/**
 * Shared Email Module
 * Provides email functionality for all modules
 *
 * Environment Variables:
 * - EMAIL_PROVIDER: 'smtp' | 'mock' (default: 'mock')
 * - EMAIL_FROM: Default sender email
 * - SMTP_HOST: SMTP server host
 * - SMTP_PORT: SMTP server port (default: 587)
 * - SMTP_SECURE: Use TLS (default: false)
 * - SMTP_USER: SMTP username
 * - SMTP_PASS: SMTP password
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [SharedEmailService],
  exports: [SharedEmailService],
})
export class SharedEmailModule {}
