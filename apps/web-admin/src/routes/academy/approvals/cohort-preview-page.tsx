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
import { ChevronRight, CheckCircle2, XCircle, Calendar, Tag } from "lucide-react"
import { usePermissions } from "@/hooks/use-permissions"
import {
  useAcademyCohort,
  useApproveCohort,
  useRejectCohort,
} from "@/lib/api/services/academy-cohorts"
import { formatDateTime } from "@/lib/format-utils"

const cohortStatusLabelMap: Record<string, string> = {
  DRAFT: "Bản nháp",
  PENDING_APPROVAL: "Chờ duyệt",
  OPENING: "Đang tuyển sinh",
  COMPLETED: "Đã kết thúc",
  ARCHIVED: "Đã lưu trữ",
}

export default function CohortApprovalPreviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { can } = usePermissions()
  const { data: cohort, isLoading } = useAcademyCohort(id)
  const approveMutation = useApproveCohort()
  const rejectMutation = useRejectCohort()

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

  if (!cohort) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Không tìm thấy Đợt khai giảng.
      </div>
    )
  }

  const canApprove =
    can("lms.commerce.approve") && cohort.status === "PENDING_APPROVAL"

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
            <span>Xem trước Đợt khai giảng</span>
          </div>
        }
        subtitle={`Phê duyệt đợt khai giảng #${cohort.code}`}
        stats={[
          { label: "Trạng thái", value: cohortStatusLabelMap[cohort.status] ?? cohort.status ?? "—" },
          { label: "Ngày gửi duyệt", value: formatDateTime(cohort.createdAt, "HH:mm dd/MM/yyyy") },
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
                <p className="font-mono font-bold text-lg">{cohort.code}</p>
              </div>
              <div className="sm:col-span-2 space-y-1">
                <p className="text-xs text-muted-foreground">Tên Đợt khai giảng</p>
                <p className="font-semibold text-xl">{cohort.name}</p>
              </div>
              {cohort.description && (
                <div className="sm:col-span-2 space-y-1">
                  <p className="text-xs text-muted-foreground">Mô tả chương trình</p>
                  <div className="text-sm prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: cohort.description }} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lịch trình & Đăng ký</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Thời gian học</p>
                <div className="flex items-center gap-3 text-sm">
                  <div className="bg-primary/10 p-2 rounded-md">
                    <Calendar className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Khai giảng: {cohort.startDate ? formatDateTime(cohort.startDate, "dd/MM/yyyy") : "—"}</p>
                    <p className="text-muted-foreground text-xs">Kết thúc: {cohort.endDate ? formatDateTime(cohort.endDate, "dd/MM/yyyy") : "—"}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 pt-4 border-t">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Thời gian mở đăng ký</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Bắt đầu:</span>
                    <span className="font-medium">{cohort.enrollmentOpenAt ? formatDateTime(cohort.enrollmentOpenAt, "dd/MM/yyyy") : "—"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Kết thúc:</span>
                    <span className="font-medium">{cohort.enrollmentCloseAt ? formatDateTime(cohort.enrollmentCloseAt, "dd/MM/yyyy") : "—"}</span>
                  </div>
                </div>
              </div>
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
                    id: cohort.id,
                    reason: rejectDialog.reason.trim(),
                  })
                  toast.success(`Đã từ chối "${cohort.name}"`)
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
              Bạn có chắc chắn muốn phê duyệt đợt khai giảng "{cohort.name}"?
              Sau khi duyệt, dữ liệu sẽ được ghi nhận là hợp lệ để mở bán (nếu trạng thái là OPENING).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-primary hover:bg-primary/90"
              onClick={async () => {
                try {
                  await approveMutation.mutateAsync(cohort.id)
                  toast.success(`Đã phê duyệt "${cohort.name}"`)
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

