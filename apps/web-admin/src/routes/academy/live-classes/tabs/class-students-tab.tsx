import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { AlertTriangle, Ban, Plus, User, Users, Trash2 } from "lucide-react"
import { toast } from "@workspace/ui/components/sonner"
import { formatDate } from "@/lib/format-utils"
import {
  useAcademyEnrollments,
  useCreateAcademyEnrollment,
  useCancelAcademyEnrollment,
  useDeleteAcademyEnrollment,
  type AcademyEnrollment,
} from "@/lib/api/services/academy-enrollments"
import { ClassEnrollmentSheet } from "@/components/academy/class-enrollment-sheet"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"

interface ClassStudentsTabProps {
  liveClassId?: string
  vodPackageId?: string
  canManageEnrollment?: boolean
}

export function ClassStudentsTab({
  liveClassId,
  vodPackageId,
  canManageEnrollment = false,
}: ClassStudentsTabProps) {
  const [enrollmentSheetOpen, setEnrollmentSheetOpen] = useState(false)

  const {
    data: enrollments = [],
    isLoading: isLoadingEnrollments,
  } = useAcademyEnrollments({
    liveClassId,
    vodPackageId: vodPackageId,
    page: 1,
    limit: 100,
  })

  const createEnrollment = useCreateAcademyEnrollment()
  const cancelEnrollment = useCancelAcademyEnrollment()
  const deleteEnrollment = useDeleteAcademyEnrollment()

  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [selectedEnrollment, setSelectedEnrollment] = useState<AcademyEnrollment | null>(null)

  const handleCreateEnrollment = async (data: any) => {
    try {
      await createEnrollment.mutateAsync(data)
      toast.success("Đã ghi danh học viên vào lớp")
      setEnrollmentSheetOpen(false)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message || "Không thể ghi danh học viên")
    }
  }

  const handleCancelClick = (enrollment: AcademyEnrollment) => {
    setSelectedEnrollment(enrollment)
    setConfirmCancelOpen(true)
  }

  const handleConfirmCancel = async () => {
    if (!selectedEnrollment) return
    try {
      await cancelEnrollment.mutateAsync(selectedEnrollment.id)
      toast.success("Đã cập nhật trạng thái ghi danh thành CANCELLED")
      setConfirmCancelOpen(false)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message || "Không thể cập nhật trạng thái")
    }
  }

  const handleDeleteClick = (enrollment: AcademyEnrollment) => {
    setSelectedEnrollment(enrollment)
    setConfirmDeleteOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!selectedEnrollment) return
    try {
      await deleteEnrollment.mutateAsync(selectedEnrollment.id)
      toast.success("Đã xóa ghi danh khỏi lớp")
      setConfirmDeleteOpen(false)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message || "Không thể xóa ghi danh")
    }
  }

  if (isLoadingEnrollments) {
    return (
      <div className="rounded-md border bg-card overflow-hidden">
        <div className="p-8 space-y-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Users className="size-5 text-primary" />
            Danh sách học viên
            <Badge variant="outline" className="text-[10px]">
              {enrollments.length} học viên
            </Badge>
          </h3>
          <p className="text-sm text-muted-foreground">
            Quản lý ghi danh, kích hoạt và theo dõi học viên trong lớp học này.
          </p>
        </div>

        {canManageEnrollment && (
          <div className="w-full sm:w-auto">
            <Button className="gap-2 w-full sm:w-auto" onClick={() => setEnrollmentSheetOpen(true)}>
              <Plus className="size-4" />
              Ghi danh học viên
            </Button>
          </div>
        )}
      </div>
      <div className="rounded-md border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Học viên</TableHead>
              <TableHead>Ngày ghi danh</TableHead>
              <TableHead>Hết hạn</TableHead>
              <TableHead>Trạng thái</TableHead>
              {canManageEnrollment && (
                <TableHead className="text-right">Thao tác</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {enrollments.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canManageEnrollment ? 5 : 4}
                  className="h-24 text-center text-muted-foreground"
                >
                  Lớp học/Gói học hiện chưa có học viên nào được ghi danh.
                </TableCell>
              </TableRow>
            ) : (
              enrollments.map((en) => (
                <TableRow key={en.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                        {en.user?.avatarUrl ? (
                          <img
                            src={en.user.avatarUrl}
                            alt={en.user.displayName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="size-4 text-primary" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">
                          {en.user?.displayName || "Học viên"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {en.user?.email || en.userId}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {formatDate(en.enrolledAt)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {en.expiresAt ? (
                      <span className="text-sm">
                        {formatDate(en.expiresAt)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">
                        Không giới hạn
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        en.status === "ACTIVE"
                          ? "default"
                          : en.status === "COMPLETED"
                            ? "secondary"
                            : en.status === "EXPIRED"
                              ? "destructive"
                              : "outline"
                      }
                    >
                      {en.status === "ACTIVE"
                        ? "Đang học"
                        : en.status === "COMPLETED"
                          ? "Hoàn thành"
                          : en.status === "EXPIRED"
                            ? "Đã hết hạn"
                            : "Đã hủy"}
                    </Badge>
                  </TableCell>
                  {canManageEnrollment && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {en.status === "ACTIVE" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelClick(en)}
                            disabled={cancelEnrollment.isPending}
                          >
                            Hủy kích hoạt
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="icon"
                          className="text-destructive border-destructive/40 hover:text-destructive hover:bg-destructive/5"
                          onClick={() => handleDeleteClick(en)}
                          disabled={deleteEnrollment.isPending}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ClassEnrollmentSheet
        open={enrollmentSheetOpen}
        onOpenChange={setEnrollmentSheetOpen}
        liveClassId={liveClassId}
        vodPackageId={vodPackageId}
        submitting={createEnrollment.isPending}
        onSubmit={handleCreateEnrollment}
      />

      <AlertDialog open={confirmCancelOpen} onOpenChange={setConfirmCancelOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-amber-500/10 text-amber-700 dark:text-amber-500">
              <Ban className="size-5" />
            </AlertDialogMedia>
            <AlertDialogTitle>Xác nhận hủy kích hoạt</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn hủy kích hoạt ghi danh của học viên{" "}
              <span className="font-semibold text-foreground">
                {selectedEnrollment?.user?.displayName || selectedEnrollment?.userId}
              </span>
              ? Trạng thái sẽ chuyển thành CANCELLED.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" disabled={cancelEnrollment.isPending}>
                Đóng
              </Button>
            </AlertDialogCancel>
            <Button
              onClick={() => void handleConfirmCancel()}
              disabled={cancelEnrollment.isPending}
            >
              {cancelEnrollment.isPending ? "Đang xử lý..." : "Xác nhận hủy"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <AlertTriangle className="size-5" />
            </AlertDialogMedia>
            <AlertDialogTitle>Xác nhận xóa ghi danh</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa ghi danh của học viên{" "}
              <span className="font-semibold text-foreground">
                {selectedEnrollment?.user?.displayName || selectedEnrollment?.userId}
              </span>{" "}
              khỏi lớp? Thao tác này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" disabled={deleteEnrollment.isPending}>
                Hủy
              </Button>
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => void handleConfirmDelete()}
              disabled={deleteEnrollment.isPending}
            >
              {deleteEnrollment.isPending ? "Đang xóa..." : "Xác nhận xóa"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
