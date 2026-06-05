export interface DashboardChartDatum {
  name: string;
  value: number;
}

/** Mục chờ duyệt (Course / Cohort / VOD) — ưu tiên theo cập nhật gần nhất */
export type StaffAcademicPendingApprovalKind =
  | 'COURSE_PROFILE'
  | 'COHORT'
  | 'VOD_PACKAGE';

export interface StaffAcademicPendingApprovalItemDTO {
  id: string;
  kind: StaffAcademicPendingApprovalKind;
  title: string;
  code: string;
  /** ISO 8601 */
  updatedAt: string;
}

export interface StaffAcademicDashboardResponseDTO {
  stats: {
    totalCourses: number;
    totalEnrollments: number;
    activeRooms: number;
    pendingApprovals: number;
  };
  pendingApprovalsByType: DashboardChartDatum[];
  /** Tối đa 20 mục PENDING_APPROVAL, gộp 3 loại, sắp xếp theo updatedAt giảm dần */
  pendingApprovalPreview: StaffAcademicPendingApprovalItemDTO[];
}

/** Đơn gần đây (mọi trạng thái) — bảng dashboard admin */
export interface DashboardRecentOrderRowDTO {
  id: string;
  code: string;
  status: string;
  amount: string;
  userName: string;
  userEmail: string;
  /** Ngày hiển thị: paidAt hoặc createdAt (YYYY-MM-DD) */
  date: string;
}

/** Doanh thu đơn PAID gộp theo ngày (UTC date) */
export interface DashboardRevenueDayDTO {
  date: string;
  amount: number;
}

/** Đơn gần đây (mọi trạng thái) — bảng dashboard admin */
export interface DashboardRecentOrderRowDTO {
  id: string;
  code: string;
  status: string;
  amount: string;
  userName: string;
  userEmail: string;
  /** Ngày hiển thị: paidAt hoặc createdAt (YYYY-MM-DD) */
  date: string;
}

/** Doanh thu đơn PAID gộp theo ngày (UTC date) */
export interface DashboardRevenueDayDTO {
  date: string;
  amount: number;
}

export interface StaffOperationsDashboardResponseDTO {
  stats: {
    totalRevenue: number;
    pendingTickets: number;
    pendingRefunds: number;
    paidOrders: number;
  };
  ordersByStatus: DashboardChartDatum[];
  revenueByLevel: {
    level: string;
    amount: number;
  }[];
  recentSales: {
    id: string;
    amount: string;
    userName: string;
    userEmail: string;
    date: string;
  }[];
  /** Đơn mới nhất kèm trạng thái (cho bảng admin) */
  recentOrders: DashboardRecentOrderRowDTO[];
  /** 30 ngày gần nhất, mỗi ngày tổng grand_total đơn PAID */
  revenueLast30Days: DashboardRevenueDayDTO[];
}

/** Thống kê “online” / phiên — gateway đọc trực tiếp DB (User, Session) */
export interface AdminPresenceStatsDTO {
  totalUsers: number;
  /** Đăng nhập ít nhất 1 lần trong ngày (00:00 server, lastSignInAt) */
  activeToday: number;
  /** Số user có ≥1 phiên JWT/session chưa hết hạn và chưa revoke */
  usersWithActiveSession: number;
  /** Tổng phiên hợp lệ (một user có thể nhiều thiết bị) */
  activeSessionCount: number;
  /** User có lastSignInAt trong 15 phút gần nhất (ước lượng hoạt động rất gần đây) */
  usersSignedInLast15Minutes: number;
  measuredAt: string;
}

export interface AdminDashboardResponseDTO {
  presence: AdminPresenceStatsDTO;
  staffAcademic: StaffAcademicDashboardResponseDTO;
  staffOperations: StaffOperationsDashboardResponseDTO;
}

export type RevenueProductType =
  | 'COHORT'
  | 'VOD_PACKAGE'
  | 'LIVE_CLASS'
  | 'AI_SUBSCRIPTION'
  | 'UNKNOWN';

export interface RevenueBreakdownRowDTO {
  name: string;
  value: number;
}

export interface RevenueAnalyticsResponseDTO {
  /** ISO date (YYYY-MM-DD), UTC */
  fromDate: string;
  /** ISO date (YYYY-MM-DD), UTC */
  toDate: string;
  stats: {
    /** Tổng doanh thu đơn PAID trong khoảng (grand_total) */
    totalRevenue: number;
    /** Số đơn PAID trong khoảng */
    paidOrders: number;
    /** Giá trị trung bình 1 đơn PAID */
    avgOrderValue: number;
  };
  /** Doanh thu PAID theo ngày (UTC date) */
  revenueByDay: DashboardRevenueDayDTO[];
  /** Phân bổ doanh thu theo payment_method */
  revenueByPaymentMethod: RevenueBreakdownRowDTO[];
  /** Phân bổ doanh thu theo loại sản phẩm (cohort/vod/live/subscription) */
  revenueByProductType: Array<{ type: RevenueProductType; amount: number }>;
  /** Đơn PAID gần đây trong khoảng (tối đa 20) */
  recentPaidOrders: DashboardRecentOrderRowDTO[];
}

/** Bài nộp chờ chấm (giảng viên) — theo lớp LIVE / gói VOD do GV phụ trách */
export interface LecturerDashboardPendingSubmissionDTO {
  submissionId: string;
  liveClassAssignmentId: string;
  /** Có thể null nếu bài gắn VOD không qua lớp LIVE */
  liveClassId: string | null;
  studentDisplayName: string;
  assignmentTitle: string;
  /** Tên lớp / mã lớp hoặc gói VOD */
  contextLabel: string;
  submittedAt: string;
}

export interface LecturerDashboardResponseDTO {
  stats: {
    /** Bài SUBMITTED chưa có điểm (grade null) */
    pendingSubmissionsToGrade: number;
    /** Buổi SCHEDULED/RESCHEDULED trong ngày (lớp của GV hoặc session gán instructorId) */
    todaySessions: number;
    /** Lớp LIVE OPENING + IN_PROGRESS do GV phụ trách */
    activeLiveClasses: number;
    /** Enrollment ACTIVE thuộc lớp/VOD do GV phụ trách */
    studentsInMyClasses: number;
  };
  pendingSubmissionsPreview: LecturerDashboardPendingSubmissionDTO[];
}

