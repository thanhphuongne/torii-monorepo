import type * as React from "react"
import {
    Home,
    BookOpen,
    Award,
    Clock,
    Trophy,
    Crown,
    User,
    CreditCard,
    Settings,
    LifeBuoy,
    BrainCircuit,
    Bot,
    MessageSquare,
    Receipt,
    Gift,
    Ticket,
    Languages,
    MessagesSquare,
    CalendarDays,
    Newspaper,
    Folder,
    MonitorPlay,
} from 'lucide-react'

export interface NavItem {
    name: string
    href: string
    icon: React.ComponentType<{ className?: string }>
    badge?: number | null
    items?: {
        name: string
        href: string
    }[]
}

export const learningNav: NavItem[] = [
    { name: 'Trang chủ', href: '/dashboard', icon: Home },
    { name: 'Khám phá khóa học', href: '/dashboard/available-courses', icon: BookOpen },
    { name: 'Blog kiến thức', href: '/dashboard/blogs', icon: Newspaper },
    { name: 'Khóa học của tôi', href: '/dashboard/my-courses', icon: Clock },
    { name: 'Thời khóa biểu', href: '/dashboard/schedule', icon: CalendarDays },
    { name: 'Thi thử JLPT', href: '/dashboard/jlpt-list-exam', icon: Languages },
    { name: 'Thẻ ghi nhớ', href: '/dashboard/study-sets', icon: BrainCircuit },
    { name: 'Thư mục của tôi', href: '/dashboard/my-folders', icon: Folder },
]

export const progressNav: NavItem[] = [
    { name: 'Bảng xếp hạng', href: '/dashboard/leaderboard', icon: Crown },
    { name: 'Thành tích', href: '/dashboard/achievements', icon: Trophy },
    { name: 'Cửa hàng quà tặng', href: '/dashboard/rewards', icon: Gift },
    { name: 'Chứng chỉ', href: '/dashboard/certificates', icon: Award },
]

export const accountNav: NavItem[] = [
    { name: 'Hồ sơ học tập', href: '/dashboard/profile', icon: User },
    { name: 'Đánh giá & Phản hồi', href: '/dashboard/reviews', icon: MessageSquare },
    { name: 'Mã giảm giá', href: '/dashboard/coupons', icon: Ticket },
    { name: 'Lịch sử thanh toán', href: '/dashboard/payment', icon: Receipt },
    { name: 'Hỗ trợ', href: '/dashboard/support', icon: LifeBuoy },
    { name: 'Cài đặt', href: '/dashboard/settings', icon: Settings },
]

export const aiSenseiNav: NavItem[] = [
    { name: 'Chat với AI', href: '/ai-sensei/chat', icon: Bot },
    { name: 'Hội thoại chủ đề', href: '/ai-sensei/roleplay/interactive', icon: MessagesSquare },
    { name: 'Hội thoại giọng nói', href: '/ai-sensei/roleplay/voice', icon: MonitorPlay },
    { name: 'Dịch thuật & Ngữ pháp', href: '/ai-sensei/translate', icon: Languages },
    { name: 'Gói dịch vụ AI', href: '/dashboard/payment/subscriptions', icon: CreditCard },
]
