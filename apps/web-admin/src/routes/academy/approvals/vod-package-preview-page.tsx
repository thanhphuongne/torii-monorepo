import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { PageHeader } from "@/components/common/page-header"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription as UIDialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Textarea } from "@workspace/ui/components/textarea"
import { toast } from "sonner"
import { ChevronRight, CheckCircle2, XCircle, DollarSign, Tag, BookOpen } from "lucide-react"
import { usePermissions } from "@/hooks/use-permissions"
import {
  useAcademyVodPackage,
  useApproveVodPackage,
  useRejectVodPackage,
} from "@/lib/api/services/academy-vod-packages"
import { formatCurrency, formatDateTime } from "@/lib/format-utils"

const vodStatusLabelMap: Record<string, string> = {
  DRAFT: "Bản nháp",
  PENDING_APPROVAL: "Chờ duyệt",
  PUBLISHED: "Đang hoạt động",
  ARCHIVED: "Đã lưu trữ",
}

export default function VodPackageApprovalPreviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { can } = usePermissions()
  const { data: pkg, isLoading } = useAcademyVodPackage(id)
  const approveMutation = useApproveVodPackage()
  const rejectMutation = useRejectVodPackage()

  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean
    reason: string
  }>({ open: false, reason: "" })

  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!pkg) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Không tìm thấy gói tự học.
      </div>
    )
  }

  const canApprove =
    can("lms.commerce.approve") && pkg.status === "PENDING_APPROVAL"

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={
          <div className="flex items-center gap-2">
            <Link
              to="/academy/approvals"
              className="hover:underline text-muted-foreground transition-colors"
            >
              Trung tâm phê duyệt
            </Link>
            <ChevronRight className="size-4" />
            <span>Xem trước gói tự học</span>
          </div>
        }
        subtitle={`Phê duyệt gói học liệu #${pkg.code}`}
        stats={[
          { label: "Trạng thái", value: vodStatusLabelMap[pkg.status] ?? pkg.status ?? "—" },
          { label: "Ngày gửi duyệt", value: formatDateTime(pkg.submittedForApprovalAt || pkg.createdAt, "HH:mm dd/MM/yyyy") },
        ]}
        actions={
          canApprove ? (
            <div className="flex items-center gap-2">
              <Button
                size="lg"
                onClick={() => setApproveConfirmOpen(true)}
                disabled={approveMutation.isPending}
                className="gap-2"
              >
                <CheckCircle2 className="size-5" />
                Phê duyệt
              </Button>
              <Button
                size="lg"
                variant="destructive"
                onClick={() => setRejectDialog({ open: true, reason: "" })}
                disabled={rejectMutation.isPending}
                className="gap-2"
              >
                <XCircle className="size-5" />
                Từ chối
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Thông tin chi tiết</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Tag className="size-3" /> Mã định danh
                </p>
                <p className="font-mono font-bold text-lg">{pkg.code}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <DollarSign className="size-3" /> Giá niêm yết
                </p>
                <p className="font-bold text-lg text-primary">{formatCurrency(pkg.price)}</p>
              </div>
              <div className="sm:col-span-2 space-y-1">
                <p className="text-xs text-muted-foreground">Tên gói hiển thị</p>
                <p className="font-semibold text-xl">{pkg.title}</p>
              </div>
              {pkg.description && (
                <div className="sm:col-span-2 space-y-1">
                  <p className="text-xs text-muted-foreground">Mô tả gói</p>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">{pkg.description}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hồ sơ nội dung gốc</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-md">
                  <BookOpen className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{pkg.courseProfile?.title || "—"}</p>
                </div>
              </div>
              <Button variant="outline" className="w-full" asChild>
                <Link to={`/academy/live-classes`}>Quay lại trang quản lý học vụ</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={rejectDialog.open}
        onOpenChange={(open) => !open && setRejectDialog({ open: false, reason: "" })}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Từ chối phê duyệt</DialogTitle>
            <UIDialogDescription>
              Vui lòng cho biết lý do từ chối để bộ phận soạn thảo có thể điều chỉnh phù hợp.
            </UIDialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Nhập lý do tại đây..."
              value={rejectDialog.reason}
              onChange={(e) => setRejectDialog((prev) => ({ ...prev, reason: e.target.value }))}
              rows={4}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialog({ open: false, reason: "" })}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectDialog.reason.trim() || rejectMutation.isPending}
              onClick={async () => {
                try {
                  await rejectMutation.mutateAsync({
                    id: pkg.id,
                    reason: rejectDialog.reason.trim(),
                  })
                  toast.success(`Đã từ chối "${pkg.title}"`)
                  navigate("/academy/approvals")
                } catch (err: any) {
                  toast.error(
                    err?.response?.data?.message || err?.message || "Không thể từ chối",
                  )
                }
              }}
            >
              Xác nhận từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={approveConfirmOpen} onOpenChange={setApproveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận phê duyệt</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn phê duyệt gói tự học "{pkg.title}"?
              Sau khi duyệt, gói sẽ được xuất bản công khai.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-primary hover:bg-primary/90"
              onClick={async () => {
                try {
                  await approveMutation.mutateAsync(pkg.id)
                  toast.success(`Đã phê duyệt "${pkg.title}"`)
                  navigate("/academy/approvals")
                } catch (err: any) {
                  toast.error(
                    err?.response?.data?.message || err?.message || "Không thể phê duyệt",
                  )
                }
              }}
            >
              Đồng ý phê duyệt
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
