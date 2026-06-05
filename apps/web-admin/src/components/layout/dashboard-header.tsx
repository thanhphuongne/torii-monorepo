import React from "react"
import { useLocation, Link } from "react-router-dom"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb"

import { ModeToggle } from "@/components/layout/mode-toggle.tsx"
import { CommandMenu } from "@/components/layout/command-menu.tsx"
import { NotificationsDropdown } from "@/components/layout/notifications-dropdown.tsx"

const SEGMENT_LABELS: Record<string, string> = {
  // Core
  academy: "Học thuật",
  dashboard: "Bảng điều khiển",
  finance: "Tài chính",
  operations: "Vận hành",
  personnel: "Nhân sự",
  system: "Hệ thống",

  // Academy / LMS
  "course-profiles": "Kho Khóa học",
  cohorts: "Đợt khai giảng",
  "live-classes": "Lớp trực tiếp",
  "vod-packages": "Khóa tự học",
  lessons: "Bài dạy",
  quizzes: "Trắc nghiệm",
  assignments: "Bài tập",
  exams: "Kỳ thi",
  "reschedule-requests": "Yêu cầu dời lịch",
  approvals: "Phê duyệt",
  "ai-subscriptions": "Gói AI",
  "study-set-catalogs": "Danh mục bộ thẻ",
  assessment: "Đánh giá",
  questions: "Ngân hàng câu hỏi",

  // JLPT
  jlpt: "Luyện thi JLPT",
  templates: "Mẫu đề",
  mondai: "Mondai",
  config: "Cấu hình",

  // Operational
  blogs: "Tin tức",
  tickets: "Hỗ trợ",
  notifications: "Thông báo",
  audit: "Kiểm tra",
  "audit-logs": "Nhật ký hệ thống",

  // Finance
  orders: "Đơn hàng",
  coupons: "Mã giảm giá",
  "revenue-analytics": "Phân tích doanh thu",
  rewards: "Phần thưởng",
  achievements: "Thành tựu",

  // Personnel / Users
  users: "Người dùng",
  permissions: "Phân quyền",
  roles: "Vai trò",

  // Common Actions / States
  create: "Tạo mới",
  edit: "Chỉnh sửa",
  detail: "Chi tiết",
  new: "Thêm mới",
  my: "Của tôi",
  discussion: "Thảo luận",
  schedule: "Lịch học",
  assessments: "Đánh giá",
  submissions: "Bài nộp",
  profile: "Cá nhân",
  settings: "Cài đặt",
}

export function DashboardHeader() {
  const location = useLocation()

  const pathSegments = location.pathname.split("/").filter(Boolean)

  return (
    <div className="flex h-14 w-full min-w-0 items-center gap-3">
      <div className="hidden min-w-0 flex-1 overflow-hidden md:block">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
                  Bảng điều khiển
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {pathSegments.map((segment, index) => {
              const isLast = index === pathSegments.length - 1
              let href = `/${pathSegments.slice(0, index + 1).join("/")}`

              if (segment === "academy") href = "/"

              const label =
                SEGMENT_LABELS[segment] ?? segment.replace(/-/g, " ")

              if (segment.length > 20 && !SEGMENT_LABELS[segment]) return null

              return (
                <React.Fragment key={`${href}-${index}`}>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage className="max-w-[220px] truncate text-sm font-medium text-foreground">
                        {label}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link
                          to={href}
                          className="text-sm text-muted-foreground hover:text-foreground"
                        >
                          {label}
                        </Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
        <CommandMenu />
        <NotificationsDropdown />
        <ModeToggle />
      </div>
    </div>
  )
}
