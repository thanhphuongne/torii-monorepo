import { Injectable, Logger } from '@nestjs/common';
import { SharedEmailService } from '@server/shared';
import {
  SendEmailEvent,
  OrderSuccessEmailData,
  EnrollmentSuccessEmailData,
  RefundEmailData,
  LiveClassRescheduledEmailData,
} from '@server/identity/infrastructure/events/email.event';
import * as pug from 'pug';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Email Service
 * Handles email sending operations for Communication module
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly templateDir = path.join(__dirname, 'templates', 'pug');

  constructor(private readonly sharedEmailService: SharedEmailService) { }

  private render(templateName: string, data: any): string {
    try {
      let templatePath = path.join(this.templateDir, `${templateName}.pug`);

      // Handle monorepo structure mismatch: templates might be in different relative locations
      if (!fs.existsSync(templatePath)) {
        this.logger.debug(
          `Template not found at ${templatePath}, trying fallback locations...`,
        );

        const fallbacks = [
          // Relative to dist root in monorepo where Nest CLI might place them
          path.join(
            __dirname,
            '../../../../email/templates/pug',
            `${templateName}.pug`,
          ),
          // Relative to process working directory dist folder
          path.join(
            process.cwd(),
            'dist/services/communication/src/modules/email/templates/pug',
            `${templateName}.pug`,
          ),
          // Relative to process working directory source folder
          path.join(
            process.cwd(),
            'apps/server/services/communication/src/modules/email/templates/pug',
            `${templateName}.pug`,
          ),
          // Absolute path fallback for containerized environments
          path.join(
            '/app/apps/server/dist/services/communication/src/modules/email/templates/pug',
            `${templateName}.pug`,
          ),
        ];

        for (const fallback of fallbacks) {
          if (fs.existsSync(fallback)) {
            templatePath = fallback;
            break;
          }
        }
      }

      this.logger.log(`Rendering template from: ${templatePath}`);
      return pug.renderFile(templatePath, data);
    } catch (error) {
      this.logger.error(
        `Failed to render template ${templateName}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Send email based on event type
   */
  async sendEmail(event: SendEmailEvent): Promise<void> {
    const { type, to, data } = event;

    this.logger.log(
      `[EmailService] Processing sendEmail event. Type: ${type}, To: ${to}`,
    );

    try {
      this.logger.debug(`[EmailService] Rendering template for type: ${type}`);
      switch (type) {
        case 'order_success':
          await this.sendOrderSuccessEmail(to, data as OrderSuccessEmailData);
          break;

        case 'verification':
          await this.sendVerificationEmail(to, data);
          break;

        case 'password_reset':
          await this.sendPasswordResetEmail(to, data);
          break;

        case 'password_reset_confirmation':
          await this.sendPasswordResetConfirmationEmail(to, data);
          break;

        case 'otp':
          await this.sendOtpEmail(to, data);
          break;

        case '2fa_code':
          await this.send2FACodeEmail(to, data);
          break;

        case 'welcome':
          await this.sendWelcomeEmail(to, data);
          break;

        case 'course_enrollment':
          await this.sendEnrollmentSuccessEmail(
            to,
            data as EnrollmentSuccessEmailData,
          );
          break;

        case 'invite':
          await this.sendInviteEmail(to, data);
          break;

        case 'refund_status':
          await this.sendRefundStatusEmail(to, data as RefundEmailData);
          break;

        case 'live_class_rescheduled':
          await this.sendLiveClassRescheduledEmail(
            to,
            data as LiveClassRescheduledEmailData,
          );
          break;

        default:
          this.logger.warn(`[EmailService] Unknown email type: ${type}`);
      }
      this.logger.log(`[EmailService] Email of type ${type} processed for ${to}`);
    } catch (error: any) {
      this.logger.error(
        `[EmailService] Failed to send email type ${type} to ${to}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Send order success email with course link
   */
  private async sendOrderSuccessEmail(
    to: string | string[],
    data: OrderSuccessEmailData,
  ): Promise<void> {
    const html = this.render('order-success', data);

    await this.sharedEmailService.sendMail({
      to,
      subject: '🎉 Thanh toán thành công - Bắt đầu học ngay!',
      html,
    });

    this.logger.log(
      `Order success email sent to: ${to}, course: ${data.courseName}`,
    );
  }

  /**
   * Send verification email
   */
  private async sendVerificationEmail(
    to: string | string[],
    data: any,
  ): Promise<void> {
    const html = this.render('verification', data);

    await this.sharedEmailService.sendMail({
      to,
      subject: 'Xác thực tài khoản Torii Nihongo',
      html,
    });

    this.logger.log(`Verification email sent to: ${to}`);
  }

  /**
   * Send password reset email
   */
  private async sendPasswordResetEmail(
    to: string | string[],
    data: any,
  ): Promise<void> {
    const html = this.render('password-reset', data);

    await this.sharedEmailService.sendMail({
      to,
      subject: 'Đặt lại mật khẩu Torii Nihongo',
      html,
    });

    this.logger.log(`Password reset email sent to: ${to}`);
  }

  /**
   * Send OTP email
   */
  private async sendOtpEmail(to: string | string[], data: any): Promise<void> {
    const html = this.render('otp', data);

    await this.sharedEmailService.sendMail({
      to,
      subject: 'Mã OTP Torii Nihongo',
      html,
    });

    this.logger.log(`OTP email sent to: ${to}`);
  }

  /**
   * Send welcome email
   */
  private async sendWelcomeEmail(
    to: string | string[],
    data: any,
  ): Promise<void> {
    const html = this.render('welcome', data);

    await this.sharedEmailService.sendMail({
      to,
      subject: 'Chào mừng đến với Torii Nihongo',
      html,
    });

    this.logger.log(`Welcome email sent to: ${to}`);
  }

  /**
   * Send enrollment success email (for free courses)
   */
  private async sendEnrollmentSuccessEmail(
    to: string | string[],
    data: EnrollmentSuccessEmailData,
  ): Promise<void> {
    const html = this.render('enrollment-success', data);

    await this.sharedEmailService.sendMail({
      to,
      subject: '🎉 Tham gia khóa học thành công - Bắt đầu học ngay!',
      html,
    });

    this.logger.log(
      `Enrollment success email sent to: ${to}, course: ${data.courseName}`,
    );
  }

  /**
   * Send invite email
   */
  private async sendInviteEmail(
    to: string | string[],
    data: any,
  ): Promise<void> {
    const html = this.render('invite', data);

    await this.sharedEmailService.sendMail({
      to,
      subject: 'Lời mời tham gia Torii Nihongo',
      html,
      from: '"Torii Identity" <identity@torii.app>',
    });

    this.logger.log(`Invite email sent to: ${to}`);
  }

  /**
   * Send 2FA code email
   */
  private async send2FACodeEmail(
    to: string | string[],
    data: any,
  ): Promise<void> {
    const html = this.render('2fa-code', data);

    await this.sharedEmailService.sendMail({
      to,
      subject: 'Mã xác thực 2FA - Torii Nihongo',
      html,
    });

    this.logger.log(`2FA code email sent to: ${to}`);
  }

  /**
   * Send password reset confirmation email
   */
  private async sendPasswordResetConfirmationEmail(
    to: string | string[],
    data: any,
  ): Promise<void> {
    const html = this.render('password-reset-confirmation', data);

    await this.sharedEmailService.sendMail({
      to,
      subject: 'Mật khẩu đã được đặt lại thành công - Torii Nihongo',
      html,
    });

    this.logger.log(`Password reset confirmation email sent to: ${to}`);
  }

  /**
   * Send refund status email
   */
  private async sendRefundStatusEmail(
    to: string | string[],
    data: RefundEmailData,
  ): Promise<void> {
    const html = this.render('refund-status', data);
    const subject =
      data.status === 'APPROVED'
        ? '💰 Hoàn tiền thành công - Torii Nihongo'
        : '❌ Thông báo kết quả yêu cầu hoàn tiền - Torii Nihongo';

    await this.sharedEmailService.sendMail({
      to,
      subject,
      html,
    });

    this.logger.log(`Refund status email (${data.status}) sent to: ${to}`);
  }

  /**
   * Send live class rescheduled email
   */
  private async sendLiveClassRescheduledEmail(
    to: string | string[],
    data: LiveClassRescheduledEmailData,
  ): Promise<void> {
    const html = this.render('live-class-rescheduled', data);

    await this.sharedEmailService.sendMail({
      to,
      subject: `📅 Thông báo dời lịch học: ${data.courseName}`,
      html,
    });

    this.logger.log(`Live class rescheduled email sent to: ${to}`);
  }
}
