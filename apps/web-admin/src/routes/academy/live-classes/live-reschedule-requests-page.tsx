import { useState, useMemo } from "react"
import { PageHeader } from "@/components/common/page-header"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  useAcademyLiveScheduleRequests,
  useApproveAcademyLiveScheduleRequest,
  useRejectAcademyLiveScheduleRequest
} from "@/lib/api/services/academy-live-schedule-requests"
import { useAcademyLiveClasses } from "@/lib/api/services/academy-live-classes"
import { format, parseISO } from "date-fns"
import { vi } from "date-fns/locale"
import { CalendarSync, CheckCircle2, XCircle, Search } from "lucide-react"
import { toast } from "sonner"
import type { AcademyLiveScheduleRequest } from "@/lib/api/services/academy-live-schedule-requests"
import { Input } from "@workspace/ui/components/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  listPageSearchIconClass,
  listPageSearchInputClass,
  listPageSearchWrapClass,
  listPageToolbarRootClass
} from "@/lib/ui-shell"

export default function LiveRescheduleRequestsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("PENDING")
  const [search, setSearch] = useState("")
  const [detailDialog, setDetailDialog] = useState<{
    open: boolean
    request: AcademyLiveScheduleRequest | null
  }>({ open: false, request: null })
  const [actionConfirmDialog, setActionConfirmDialog] = useState<{
    open: boolean
    action: "approve" | "reject" | null
    requestId?: string
  }>({ open: false, action: null })
  const [rejectReasonDialog, setRejectReasonDialog] = useState<{
    open: boolean
    reason: string
    requestId?: string
  }>({ open: false, reason: "" })

  const { data: allRequests = [], isLoading: isLoadingRequests } = useAcademyLiveScheduleRequests({
    status: statusFilter === "all" ? undefined : (statusFilter as any)
  })

  console.log('[DEBUG] allRequests from API:', allRequests);

  // To show class details, we fetch classes. Since requests only have liveClassId.
  const { data: classes = [], isLoading: isLoadingClasses } = useAcademyLiveClasses({})

  const approveRequestMutation = useApproveAcademyLiveScheduleRequest()
  const rejectRequestMutation = useRejectAcademyLiveScheduleRequest()

  const formatDateLabel = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "EEEE, dd/MM/yyyy", { locale: vi })
    } catch (e) {
      return dateStr
    }
  }

  const handleApproveRequest = (id: string) => {
    approveRequestMutation.mutate({ id, input: { reviewNote: "Phê duyệt từ trung tâm" } }, {
      onSuccess: () => toast.success("Đã phê duyệt yêu cầu"),
      onError: (error: any) => toast.error(error.userMessage || "Lỗi khi phê duyệt yêu cầu")
    })
  }

  const handleRejectRequest = (id: string) => {
    rejectRequestMutation.mutate({ id, input: { reviewNote: "Từ chối từ trung tâm" } }, {
      onSuccess: () => toast.success("Đã từ chối yêu cầu"),
      onError: (error: any) => toast.error(error.userMessage || "Lỗi khi từ chối yêu cầu")
    })
  }

  const handleConfirmAction = () => {
    const requestId = actionConfirmDialog.requestId
    const action = actionConfirmDialog.action
    if (!requestId || !action) return

    // Close first to avoid multiple clicks while mutation pending.
    setActionConfirmDialog({ open: false, action: null })

    if (action === "approve") handleApproveRequest(requestId)
    if (action === "reject") handleRejectRequest(requestId)
  }

  const getRequestStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING": return <Badge variant="warning">Chờ duyệt</Badge>
      case "APPROVED": return <Badge variant="success">Đã duyệt</Badge>
      case "REJECTED": return <Badge variant="destructive">Từ chối</Badge>
      case "CANCELLED": return <Badge variant="secondary">Đã hủy</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  const classMap = useMemo(() => {
    const map = new Map<string, { code: string; name: string }>()
    classes.forEach(c => {
      map.set(c.id, { code: c.code, name: c.name })
    })
    return map
  }, [classes])

  const filteredRequests = useMemo(() => {
    if (!search) return allRequests
    const s = search.toLowerCase()
    return allRequests.filter(req => {
      const classInfo = classMap.get(req.liveClassId || req.session?.liveClassId || "")
      return (
        classInfo?.code.toLowerCase().includes(s) ||
        classInfo?.name.toLowerCase().includes(s) ||
        req.requester?.displayName.toLowerCase().includes(s)
      )
    })
  }, [allRequests, search, classMap])

  console.log('[DEBUG] filteredRequests:', filteredRequests);

  const isLoading = isLoadingRequests || isLoadingClasses

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Phê duyệt dời lịch học"
        subtitle="Quản lý và phê duyệt các yêu cầu dời lịch học từ giảng viên trên toàn hệ thống."
      />

      <div className="space-y-4">
        <div className={listPageToolbarRootClass}>
          <div className={listPageSearchWrapClass}>
            <Search className={listPageSearchIconClass} />
            <Input
              placeholder="Tìm theo mã lớp, tên lớp hoặc tên giảng viên..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={listPageSearchInputClass}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={statusFilter === 'PENDING' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('PENDING')}
              className="h-10 px-4"
            >
              Đang chờ duyệt
            </Button>
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
              className="h-10 px-4"
            >
              Tất cả lịch sử
            </Button>
          </div>
        </div>

        <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6 py-4">Lớp học</TableHead>
                <TableHead>Đề xuất</TableHead>
                <TableHead>Giảng viên</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="pr-6 text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-6"><Skeleton className="h-4 w-20" /><Skeleton className="h-3 w-32 mt-2" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-16 mt-2" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell className="text-right pr-6"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center text-muted-foreground italic">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CalendarSync className="size-8 opacity-20" />
                      <span>Không tìm thấy yêu cầu nào phù hợp.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((req: AcademyLiveScheduleRequest) => {
                  const liveClassId = req.liveClassId || req.session?.liveClassId || ""
                  const classInfo = classMap.get(liveClassId)
                  return (
                    <TableRow key={req.id} className="hover:bg-muted/5 transition-colors group">
                      <TableCell className="pl-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-primary group-hover:underline cursor-pointer" onClick={() => window.open(`/academy/live-classes/${liveClassId}/detail?tab=schedule`, '_blank')}>
                            {classInfo?.code || "—"}
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate max-w-[180px]" title={classInfo?.name}>
                            {classInfo?.name || "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col border-l-2 border-emerald-500/40 pl-2 py-0.5">
                          <span className="font-bold text-sm text-emerald-600 dark:text-emerald-500">{req.proposedDate ? format(parseISO(req.proposedDate), "dd/MM/yyyy") : "—"}</span>
                          <span className="text-[10px] text-emerald-600/70 font-black">{req.proposedStartTime} - {req.proposedEndTime}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-bold text-foreground/80">
                          {req.requester?.displayName || "Giảng viên"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {getRequestStatusBadge(req.status)}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        {req.status === 'PENDING' ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8"
                              onClick={() => setDetailDialog({ open: true, request: req })}
                            >
                              Xem chi tiết
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5 border-emerald-500/40 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 font-medium"
                              onClick={() =>
                                setActionConfirmDialog({
                                  open: true,
                                  action: "approve",
                                  requestId: req.id,
                                })
                              }
                              disabled={approveRequestMutation.isPending}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Duyệt
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/5 font-medium"
                              onClick={() =>
                                setActionConfirmDialog({
                                  open: true,
                                  action: "reject",
                                  requestId: req.id,
                                })
                              }
                              disabled={rejectRequestMutation.isPending}
                            >
                              <XCircle className="h-4 w-4" />
                              Từ chối
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] text-muted-foreground font-medium italic uppercase tracking-wider opacity-60">Đã xử lý</span>
                            {req.reviewedBy && (
                              <Badge variant="outline" className="text-[9px] px-2 py-0.5 font-bold bg-muted/30">
                                bởi {req.reviewer?.displayName || "Admin"}
                              </Badge>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => setDetailDialog({ open: true, request: req })}
                            >
                              Xem chi tiết
                            </Button>
                            {req.status === 'REJECTED' ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() =>
                                  setRejectReasonDialog({
                                    open: true,
                                    reason: req.reviewNote || "Không có lý do cụ thể.",
                                    requestId: req.id,
                                  })
                                }
                              >
                                Xem lý do
                              </Button>
                            ) : null}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog
        open={detailDialog.open}
        onOpenChange={(open) =>
          setDetailDialog((prev) => (open ? prev : { open: false, request: null }))
        }
      >
        <DialogContent className="sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle>Chi tiết yêu cầu dời lịch</DialogTitle>
            <DialogDescription>
              Xem đầy đủ thông tin buổi học gốc, đề xuất thay đổi và ghi chú xử lý.
            </DialogDescription>
          </DialogHeader>

          {detailDialog.request ? (() => {
            const req = detailDialog.request
            const liveClassId = req.liveClassId || req.session?.liveClassId || ""
            const classInfo = classMap.get(liveClassId)
            return (
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="text-xs font-semibold text-muted-foreground">Lớp học</p>
                  <p className="mt-1 text-sm font-bold text-foreground">
                    {classInfo?.code || "—"}{" "}
                    <span className="font-medium text-muted-foreground">
                      {classInfo?.name ? `— ${classInfo.name}` : ""}
                    </span>
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-semibold text-muted-foreground">Buổi học gốc</p>
                    <p className="mt-1 text-sm font-bold">
                      {req.session?.sessionDate ? formatDateLabel(req.session.sessionDate) : "—"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {req.session?.startTime && req.session?.endTime ? `${req.session.startTime} - ${req.session.endTime}` : "—"}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-semibold text-muted-foreground">Đề xuất thay đổi</p>
                    <p className="mt-1 text-sm font-bold text-emerald-700">
                      {req.proposedDate ? format(parseISO(req.proposedDate), "dd/MM/yyyy") : "—"}
                    </p>
                    <p className="mt-1 text-xs text-emerald-700/80">
                      {req.proposedStartTime} - {req.proposedEndTime}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">Giảng viên</p>
                      <p className="mt-1 text-sm font-bold">{req.requester?.displayName || "—"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getRequestStatusBadge(req.status)}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Lý do</p>
                    <div className="mt-1 rounded-md border bg-background p-3 text-sm whitespace-pre-wrap">
                      {req.reason?.trim() ? req.reason : "Không có lý do chi tiết."}
                    </div>
                  </div>
                </div>

                {req.status !== "PENDING" ? (
                  <div className="rounded-lg border p-3 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">Thông tin xử lý</p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Người duyệt:</span>{" "}
                      <span className="font-semibold">{req.reviewer?.displayName || "—"}</span>
                    </p>
                    {req.reviewNote ? (
                      <div className="rounded-md border bg-muted/20 p-3 text-sm whitespace-pre-wrap">
                        {req.reviewNote}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Không có ghi chú xử lý.</p>
                    )}
                  </div>
                ) : null}
              </div>
            )
          })() : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialog({ open: false, request: null })}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={rejectReasonDialog.open}
        onOpenChange={(open) =>
          setRejectReasonDialog((prev) =>
            open ? prev : { open: false, reason: "", requestId: undefined },
          )
        }
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Lý do từ chối</DialogTitle>
            <DialogDescription>
              Yêu cầu của bạn đã bị từ chối. Vui lòng xem ghi chú chi tiết bên dưới.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
            {rejectReasonDialog.reason}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectReasonDialog({ open: false, reason: "" })}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={actionConfirmDialog.open}
        onOpenChange={(open) =>
          setActionConfirmDialog({ open, action: open ? actionConfirmDialog.action : null })
        }
      >
        <AlertDialogContent className="sm:max-w-[480px]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionConfirmDialog.action === "approve"
                ? "Phê duyệt yêu cầu dời lịch?"
                : "Từ chối yêu cầu dời lịch?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Bạn xác nhận thao tác cho yêu cầu có ID{" "}
              <span className="font-semibold">{actionConfirmDialog.requestId}</span>. Hành động này sẽ cập nhật trạng thái xử lý yêu cầu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              disabled={
                approveRequestMutation.isPending || rejectRequestMutation.isPending
              }
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {actionConfirmDialog.action === "approve" ? "Xác nhận phê duyệt" : "Xác nhận từ chối"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
