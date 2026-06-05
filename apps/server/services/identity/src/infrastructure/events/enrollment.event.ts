/**
 * Course Enrollment Success Event
 * Emitted when a user successfully enrolls in a course (especially free ones)
 */
export interface CourseEnrollmentSuccessEvent {
  userId: string;
  userEmail: string;
  userName: string;
  courseId: string;
  courseName: string;
  enrollmentId: string;
}

/**
 * Course Gift Received Event
 */
export interface CourseGiftReceivedEvent {
  recipientId: string;
  recipientEmail: string;
  senderId: string;
  senderName: string;
  courseId: string;
  courseName: string;
  giftMessage?: string;
  enrollmentId: string;
}
