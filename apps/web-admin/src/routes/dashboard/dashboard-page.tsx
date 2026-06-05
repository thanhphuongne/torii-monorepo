import { useAppSelector } from "@/hooks/hooks"
import { selectUser } from "@/store/slices/auth-slice"
import { Link } from "react-router-dom"
import { Button } from "@workspace/ui/components/button"
import { Zap, ShieldAlert } from "lucide-react"
import { ButtonGroup } from "@workspace/ui/components/button-group"
import { PageHeader } from "@/components/common/page-header"
import { usePermissions } from "@/hooks/use-permissions"

// Dashboards
import AdminDashboardV2 from "@/components/dashboard/admin-dashboard-v2"
import StaffAcademicDashboard from "@/components/dashboard/staff-academic-dashboard"
import StaffFinanceDashboard from "@/components/dashboard/staff-finance-dashboard"
import LecturerDashboard from "@/components/dashboard/lecturer-dashboard"

export default function DashboardPage() {
  const user = useAppSelector(selectUser)
  const { canAny, hasWildcard, permissions } = usePermissions()
  const isAdmin = hasWildcard || canAny(["lms.approval.manage"])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Chào buổi sáng"
    if (hour < 18) return "Chào buổi chiều"
    return "Chào buổi tối"
  }

  const isLecturer =
    canAny(["lms.assessment.grade"]) &&
    !canAny([
      "lms.catalog.update",
      "lms.commerce.update",
      "ops.user.manage",
    ]) &&
    !hasWildcard
  const isStaffAcademic = !isAdmin && !isLecturer && canAny([
    "lms.catalog.update",
    "lms.delivery.update",
    "lms.commerce.update",
  ])
  const isStaffFinance = !isAdmin && canAny([
    "ops.order.manage",
    "ops.coupon.manage",
    "ops.support.handle",
    "ops.audit.view",
    "ops.blog.manage",
  ])
  const fullDisplayName = user?.displayName?.trim() || "ADMIN"

  return (
    <div className="flex min-w-0 flex-col gap-6 sm:gap-8">
      <PageHeader
        title={`${getGreeting()}, ${fullDisplayName}`}
        subtitle={
          isLecturer
            ? "Bảng điều khiển giảng viên • Quản lý lớp học và buổi giảng"
            : isStaffAcademic
              ? "Bảng điều khiển học thuật • Nội dung, lớp học và phê duyệt"
              : isStaffFinance
                ? "Bảng điều khiển tài chính • Đơn hàng, doanh thu và hỗ trợ giao dịch"
                : "Bảng chỉ huy trung tâm Torii Admin"
        }
        actions={
          isLecturer ? (
            <Button asChild size="sm" className="font-semibold">
              <Link to="/academy/live-classes">Lớp của tôi</Link>
            </Button>
          ) : isStaffAcademic ? (
            null
          ) : isStaffFinance ? (
            <div className="flex items-center gap-3">
              <ButtonGroup>
                <Button variant="outline" asChild size="sm">
                  <Link to="/orders">Đơn hàng</Link>
                </Button>
                <Button variant="outline" asChild size="sm">
                  <Link to="/coupons">Coupons</Link>
                </Button>
              </ButtonGroup>
              <Button size="sm" asChild>
                <Link to="/tickets">
                  <Zap className="size-4 mr-2" />
                  Hỗ trợ
                </Link>
              </Button>
            </div>
          ) : null
        }
      />

      <div className="relative">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent -translate-y-8" />

        {isAdmin && <AdminDashboardV2 />}
        {isStaffAcademic && <StaffAcademicDashboard />}
        {isStaffFinance && <StaffFinanceDashboard />}
        {isLecturer && <LecturerDashboard />}

        {(!permissions || permissions.length === 0) && (
          <div className="p-20 text-center space-y-4 bg-muted/10 rounded-xl border border-dashed border-border/40">
            <ShieldAlert className="size-12 text-muted-foreground/30 mx-auto" />
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Truy cập bị hạn chế</p>
              <p className="text-base font-semibold">Bạn chưa được gán permission để truy cập trang quản trị.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
