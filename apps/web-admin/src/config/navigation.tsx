import {
    Home,
    Newspaper,
    CreditCard,
    ShieldCheck,
    Ticket,
    Key,
    UserCheck,
    Gift,
    GraduationCap,
    Trophy,
    Bot,
    Languages,
    BookOpen,
} from "lucide-react";

/**
 * Quản lý nội dung ngân hàng câu hỏi / đề thi / JLPT (không áp dụng cho giảng viên chỉ có read + grade).
 * Dùng chung cho menu và RoutePermissionGuard trong App.tsx.
 */
export const LMS_ASSESSMENT_CONTENT_MANAGE_ANY = [
    "lms.assessment.create",
    "lms.assessment.update",
    "lms.assessment.delete",
    "lms.assessment.publish",
] as const;

export interface NavItem {
    titleKey: string;
    url: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    permission?: string;
    anyPermission?: string[];
    descriptionKey?: string;
    items?: {
        titleKey: string;
        url: string;
        permission?: string;
        anyPermission?: string[];
    }[];
}

// 1. Academic & Teaching items
export const academicNavItems: NavItem[] = [
    {
        titleKey: "Bảng điều khiển",
        url: "/",
        icon: Home,
    },
    {
        titleKey: "Học vụ (LMS)",
        url: "/academy/live-classes",
        icon: GraduationCap,
        anyPermission: ["lms.catalog.read", "lms.catalog.update", "lms.delivery.read", "lms.delivery.update", "lms.catalog.approve", "lms.commerce.approve"],
        items: [
            { titleKey: "Hồ sơ khóa học", url: "/academy/course-profiles", anyPermission: ["lms.catalog.read", "lms.catalog.update", "lms.assessment.grade"] },
            { titleKey: "Đợt khai giảng", url: "/academy/cohorts", anyPermission: ["lms.commerce.read", "lms.commerce.update"] },
            { titleKey: "Lớp trực tiếp", url: "/academy/live-classes" },
            { titleKey: "Khóa tự học tôi phụ trách", url: "/academy/vod-packages/my", anyPermission: ["lms.assessment.grade"] },
            { titleKey: "Khóa tự học", url: "/academy/vod-packages", anyPermission: ["lms.commerce.read", "lms.commerce.update"] },
            { titleKey: "Duyệt dời lịch học", url: "/academy/live-classes/reschedule-requests", anyPermission: ["lms.delivery.approve"] },
            { titleKey: "Trung tâm phê duyệt", url: "/academy/approvals", anyPermission: ["lms.catalog.approve", "lms.commerce.approve"] },
        ]
    },
    {
        titleKey: "Ngân hàng & Đánh giá",
        url: "/academy/assessment/questions",
        icon: BookOpen,
        anyPermission: [...LMS_ASSESSMENT_CONTENT_MANAGE_ANY],
        items: [
            { titleKey: "Ngân hàng câu hỏi", url: "/academy/assessment/questions" },
            { titleKey: "Danh sách bài thi", url: "/academy/assessment/exams" },
            { titleKey: "Danh mục bộ thẻ", url: "/academy/study-set-catalogs" },
        ]
    },
    {
        titleKey: "Đề thi JLPT mô phỏng",
        url: "/academy/jlpt/templates",
        icon: Languages,
        anyPermission: [...LMS_ASSESSMENT_CONTENT_MANAGE_ANY],
        items: [
            { titleKey: "Quản lý Đề thi (Mẫu đề)", url: "/academy/jlpt/templates" },
            { titleKey: "Ngân hàng Câu hỏi", url: "/academy/jlpt/questions" },
            { titleKey: "Quản lý Mondai", url: "/academy/jlpt/mondai" },
            { titleKey: "Cấu hình JLPT", url: "/academy/jlpt/config" },
        ]
    },
    {
        titleKey: "Gói AI",
        url: "/academy/ai-subscriptions",
        icon: Bot,
        anyPermission: ["ops.subscription.manage"],
    },
];

// 2. Operational & Support items
export const operationsNavItems: NavItem[] = [
    {
        titleKey: "Bài viết & Tin tức",
        url: "/blogs",
        icon: Newspaper,
        anyPermission: ["ops.blog.manage"],
    },
    {
        titleKey: "Yêu cầu hỗ trợ",
        url: "/tickets",
        icon: Ticket,
        permission: "ops.support.handle",
    },
];

// 3. Finance & Sales items
export const financeNavItems: NavItem[] = [
    {
        titleKey: "Đơn hàng & Doanh thu",
        url: "/orders",
        icon: CreditCard,
        permission: "ops.order.manage",
        items: [
            { titleKey: "Danh sách đơn hàng", url: "/orders" },
        ]
    },
    {
        titleKey: "Mã giảm giá",
        url: "/coupons",
        icon: Ticket,
        permission: "ops.coupon.manage",
    },
    {
        titleKey: "Phần thưởng",
        url: "/rewards",
        icon: Gift,
        permission: "ops.gamification.manage",
    },
    {
        titleKey: "Thành tích",
        url: "/achievements",
        icon: Trophy,
        permission: "ops.gamification.manage",
    },
];

// 4. Personnel & HR items
export const personnelNavItems: NavItem[] = [
    {
        titleKey: "Quản lý Người dùng",
        url: "/users",
        icon: UserCheck,
        anyPermission: ["ops.user.manage", "ops.user.view"],
    },
    {
        titleKey: "Phân quyền",
        url: "/permissions",
        icon: Key,
        permission: "ops.user.manage",
    },
];

// 5. System Administration items
export const systemNavItems: NavItem[] = [
    {
        titleKey: "Nhật ký hệ thống",
        url: "/audit-logs",
        icon: ShieldCheck,
        permission: "ops.audit.view",
    },
];

// Compatibility exports
export const mainNavItems = academicNavItems;
export const managementNavItems = operationsNavItems;
