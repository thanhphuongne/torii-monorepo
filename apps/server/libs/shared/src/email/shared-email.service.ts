import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { AppConfigService } from '../config/app-config.service';

export interface EmailOptions {
  /**
   * Recipient email address(es)
   */
  to: string | string[];

  /**
   * Email subject
   */
  subject: string;

  /**
   * HTML content
   */
  html?: string;

  /**
   * Plain text content
   */
  text?: string;

  /**
   * Sender email (optional, uses default if not provided)
   */
  from?: string;

  /**
   * CC recipients
   */
  cc?: string | string[];

  /**
   * BCC recipients
   */
  bcc?: string | string[];

  /**
   * Reply-to address
   */
  replyTo?: string;

  /**
   * Attachments
   */
  attachments?: Array<{
    filename: string;
    content?: Buffer | string;
    path?: string;
    contentType?: string;
  }>;
}

/**
 * Shared Email Service
 * Provides reusable email functionality for all modules via SMTP
 *
 * Environment Variables:
 * - SMTP_ENABLED: Enable/disable SMTP (default: true)
 * - SMTP_HOST: SMTP server host (e.g., smtp.gmail.com)
 * - SMTP_PORT: SMTP server port (default: 587)
 * - SMTP_USER: SMTP username
 * - SMTP_PASS: SMTP password (Gmail: Use App Password!)
 * - SMTP_FROM: Default sender email
 *
 * Use cases:
 * - Authentication emails (verification, password reset)
 * - Marketing emails
 * - Notification emails
 * - Transactional emails
 */
@Injectable()
export class SharedEmailService implements OnModuleInit {
  private readonly logger = new Logger(SharedEmailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly appConfig: AppConfigService) {}

  async onModuleInit() {
    await this.initializeTransporter();
  }

  /**
   * Initialize SMTP transporter
   */
  private async initializeTransporter() {
    const { enabled, host, port, user, pass, from } = this.appConfig.smtp;

    if (!enabled) {
      this.logger.warn(
        '📧 SMTP is DISABLED - Using mock email logging for development',
      );
      return;
    }

    if (!host || !port || !user || !pass) {
      this.logger.warn(
        '📧 SMTP credentials missing - Using mock email logging',
      );
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: host,
        port: port,
        secure: port === 465, // true for 465, false for other ports
        auth: {
          user: user,
          pass: pass,
        },
      });

      // Verify connection
      await this.transporter.verify();
      this.logger.log(`✅ SMTP connection verified: ${host}:${port}`);
      this.logger.log(
        `📧 Email service ready to send from: ${from || 'not set'}`,
      );
    } catch (error) {
      this.logger.error(`❌ Failed to initialize SMTP: ${error.message}`);
      this.logger.warn('📧 Falling back to mock email logging');
      this.transporter = null;
    }
  }

  /**
   * Send email
   */
  async sendMail(options: EmailOptions): Promise<void> {
    // If SMTP is configured, send real email
    if (this.transporter) {
      try {
        const smtpFrom =
          this.appConfig.smtp.from || '"Torii Nihongo" <noreply@torii.app>';

        const mailOptions = {
          from: options.from || smtpFrom,
          to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
          cc: options.cc,
          bcc: options.bcc,
          replyTo: options.replyTo,
          attachments: options.attachments,
        };

        const info = await this.transporter.sendMail(mailOptions);
        this.logger.log(
          `✅ Email sent to ${mailOptions.to} - Message ID: ${info.messageId}`,
        );
        return;
      } catch (error) {
        this.logger.error(
          `❌ Failed to send email to ${options.to}: ${error.message}`,
        );
        this.logger.warn('Falling back to mock logging for this email');
        // Fall through to mock logging
      }
    }

    // Mock email for development (when SMTP is disabled or failed)
    this.logger.log(`=================================================`);
    this.logger.log(`📧 MOCK EMAIL TO: ${options.to}`);
    this.logger.log(`Subject: ${options.subject}`);
    this.logger.log(`\nHTML Content Preview:`);
    this.logger.log(`---`);
    if (options.html) {
      this.logger.log(options.html.substring(0, 200) + '...');
    } else if (options.text) {
      this.logger.log(options.text);
    }
    this.logger.log(`---`);
    this.logger.log(`=================================================`);
  }

  /**
   * Send bulk emails (for marketing, notifications)
   */
  async sendBulkMail(
    recipients: string[],
    options: Omit<EmailOptions, 'to'>,
  ): Promise<void> {
    const promises = recipients.map((recipient) =>
      this.sendMail({ ...options, to: recipient }),
    );

    try {
      await Promise.all(promises);
      this.logger.log(`✅ Bulk email sent to ${recipients.length} recipients`);
    } catch (error) {
      this.logger.error('❌ Failed to send bulk emails:', error);
      throw new Error('Failed to send bulk emails');
    }
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('SMTP is not configured');
      return false;
    }

    try {
      await this.transporter.verify();
      this.logger.log('✅ SMTP connection verified');
      return true;
    } catch (error) {
      this.logger.error('❌ SMTP connection failed:', error);
      return false;
    }
  }
}
