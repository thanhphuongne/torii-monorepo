/**
 * Send Notification Event
 * Emitted when creating in-app notifications
 */
export interface SendNotificationEvent {
  recipientId: string;
  type: string; // COMMENT_REPLY, ORDER_SUCCESS, ORDER_STATUS_UPDATE, etc.
  payload: {
    title: string;
    body: string;
    metadata?: Record<string, any>;
  };
  sendEmail?: boolean; // Optional: also send email notification
}
