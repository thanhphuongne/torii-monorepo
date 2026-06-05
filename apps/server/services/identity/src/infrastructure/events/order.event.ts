/**
 * Order Payment Success Event
 * Emitted when an order payment is successfully completed
 */
export interface OrderPaymentSuccessEvent {
  userId: string;
  userEmail: string;
  userName: string;
  orderId: string;
  courseId: string;
  courseName: string;
  amount: number;
  currency: string;
  isGift?: boolean;
  recipientName?: string;
}

/**
 * Order Status Changed Event
 * Emitted when order status changes
 */
export interface OrderStatusChangedEvent {
  userId: string;
  orderId: string;
  oldStatus: string;
  newStatus: string;
}
