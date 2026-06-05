/**
 * Email Event Types
 */
export type EmailType =
  | 'verification'
  | 'password_reset'
  | 'password_reset_confirmation'
  | 'otp'
  | 'welcome'
  | 'invite'
  | '2fa_code'
  | 'order_success'
  | 'course_enrollment'
  | 'refund_status'
  | 'live_class_rescheduled';

/**
 * Send Email Event
 * Emitted by services that need to send emails
 */
export interface SendEmailEvent {
  type: EmailType;
  to: string | string[];
  data: any;
}

/**
 * Order Success Email Data
 */
export interface OrderSuccessEmailData {
  displayName: string;
  courseName: string;
  courseUrl: string;
  amount: number;
  currency: string;
  orderId: string;
}

/**
 * Enrollment Success Email Data (for free courses)
 */
export interface EnrollmentSuccessEmailData {
  displayName: string;
  courseName: string;
  courseUrl: string;
  isGift?: boolean;
  senderName?: string;
  giftMessage?: string;
}

/**
 * Refund Email Data
 */
export interface RefundEmailData {
  displayName: string;
  courseName: string;
  amount: number;
  currency: string;
  ticketId: string;
  reason?: string;
  status: 'APPROVED' | 'REJECTED';
}

/**
 * Live Class Rescheduled Email Data
 */
export interface LiveClassRescheduledEmailData {
  displayName: string;
  courseName: string;
  oldDateTime: string;
  newDateTime: string;
  courseUrl: string;
  reason?: string;
}
