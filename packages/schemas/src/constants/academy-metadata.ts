/**
 * Shared metadata definitions for Academy module
 * Used by web-admin for editor presets and web-learner for display labels
 */

export interface MetadataDefinition {
    key: string;
    label: string;
    description?: string;
    defaultValue?: string;
}

// 1. Metadata hiển thị / catalog (Cohort LIVE hoặc VodPackage)
export const ACADEMY_PRODUCT_LISTING_METADATA: MetadataDefinition[] = [
    { key: "sale_price", label: "Giá khuyến mãi", description: "Giá sau giảm (để 0 nếu miễn phí)", defaultValue: "0" },
    { key: "discount_percentage", label: "Giảm giá (%)", description: "Hiển thị badge giảm giá", defaultValue: "0" },
    { key: "course_badge", label: "Badge khóa học", description: "Ví dụ: Hot, New, Best Seller", defaultValue: "Hot" },
    { key: "support_contact", label: "Thông tin hỗ trợ", description: "Zalo, Hotline hoặc Facebook link", defaultValue: "zalo.me/..." },
    { key: "video_demo_url", label: "Link Video Demo", description: "URL YouTube/Vimeo giới thiệu khóa học" },
    { key: "certificate_available", label: "Có chứng chỉ", description: "Hiển thị icon chứng chỉ (true/false)", defaultValue: "true" },
];

// 2. Class (VOD/Live) Metadata
export const VOD_CLASS_METADATA: MetadataDefinition[] = [
    { key: "requirement", label: "Yêu cầu đầu vào", description: "Kiến thức cần có trước khi học" },
    { key: "hours_count", label: "Tổng số giờ học", description: "Ví dụ: 40 giờ", defaultValue: "20" },
    { key: "lessons_count", label: "Tổng số bài học", description: "Tự động hiển thị nếu để trống", defaultValue: "50" },
    { key: "allow_trial", label: "Cho phép học thử", description: "true hoặc false", defaultValue: "false" },
    { key: "trial_sessions_count", label: "Số buổi học thử", description: "Ví dụ: 2 buổi", defaultValue: "2" },
];

export const LIVE_CLASS_METADATA: MetadataDefinition[] = [
    ...VOD_CLASS_METADATA,
    { key: "zoom_link", label: "Link Zoom học trực tuyến", description: "Link phòng học chính" },
    { key: "zoom_password", label: "Mật khẩu Zoom", description: "Nếu có" },
    { key: "messenger_group", label: "Nhóm hỗ trợ", description: "Link Zalo/Telegram/Discord cho lớp" },
];
