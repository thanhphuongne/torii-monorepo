import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { AlertTriangle, Plus, FileText, Calendar, CheckCircle2 } from "lucide-react"
import { toast } from "@workspace/ui/components/sonner"
import {
  useAcademyClassAssignments,
  useAddAcademyClassAssignment,
  useUpdateAcademyClassAssignment,
  useRemoveAcademyClassAssignment,
  type AcademyClassAssignment,
} from "@/lib/api/services/academy-class-assignments"
import type { AcademyLiveClassAssignmentCreateDTO } from "@workspace/schemas"
import { ClassAssignmentSheet } from "@/components/academy/class-assignment-sheet"
import { formatDateTime } from "@/lib/format-utils"
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

interface ClassAssignmentsTabProps {
  liveClassId?: string
  vodPackageId?: string
}

export function ClassAssignmentsTab({ liveClassId, vodPackageId }: ClassAssignmentsTabProps) {
  const navigate = useNavigate()

  const id = (vodPackageId || liveClassId) as string;
  const {
    data: classAssignments = [],
    isLoading: isLoadingAssignments,
  } = useAcademyClassAssignments(id)

  const addMutation = useAddAcademyClassAssignment(id)
  const updateMutation = useUpdateAcademyClassAssignment(id)
  const removeMutation = useRemoveAcademyClassAssignment(id)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingAssignment, setEditingAssignment] =
    useState<AcademyClassAssignment | null>(null)
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false)
  const [selectedForRemove, setSelectedForRemove] = useState<AcademyClassAssignment | null>(null)

  const handleCreateClick = () => {
    setEditingAssignment(null)
    setSheetOpen(true)
  }

  const handleEditClick = (ca: AcademyClassAssignment) => {
    setEditingAssignment(ca)
    setSheetOpen(true)
  }

  const handleRemoveClick = (ca: AcademyClassAssignment) => {
    setSelectedForRemove(ca)
    setRemoveConfirmOpen(true)
  }

  const handleConfirmRemove = async () => {
    if (!selectedForRemove) return
    try {
      await removeMutation.mutateAsync(selectedForRemove.id)
      toast.success("Đã gỡ bài tập khỏi lớp")
      setRemoveConfirmOpen(false)
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || error.message || "Không thể gỡ bài tập",
      )
    }
  }

  const handleSubmit = async (data: any) => {
    try {
      if (editingAssignment) {
        await updateMutation.mutateAsync({
          id: editingAssignment.id,
          input: {
            title: data.title,
            instructions: data.instructions,
            openAt: data.openAt ? new Date(data.openAt) : undefined,
            deadline: data.deadline ? new Date(data.deadline) : undefined,
          },
        })
        toast.success("Đã cập nhật bài tập")
      } else {
        const createPayload: AcademyLiveClassAssignmentCreateDTO = {
          ...(vodPackageId ? { vodPackageId } : {}),
          title: data.title,
          instructions: data.instructions,
          openAt: data.openAt ? new Date(data.openAt) : undefined,
          deadline: data.deadline ? new Date(data.deadline) : undefined,
        }
        await addMutation.mutateAsync(createPayload)
        toast.success("Đã giao bài tập cho lớp")
      }
      setSheetOpen(false)
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || error.message || "Không thể lưu bài tập",
      )
      throw error
    }
  }

  const handleGoToGrading = (ca: AcademyClassAssignment) => {
    if (vodPackageId) return
    if (!liveClassId) return
    navigate(`/academy/live-classes/${liveClassId}/assignments/${ca.id}/submissions`)
  }

  if (isLoadingAssignments) {
    return (
      <div className="rounded-md border bg-card overflow-hidden">
        <div className="p-8 space-y-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <FileText className="size-5 text-primary" />
            Bài tập trên lớp
          </h3>
          <p className="text-sm text-muted-foreground">
            Giao bài tập, thiết lập hạn nộp và chấm điểm học viên.
          </p>
        </div>

        <Button className="gap-2" onClick={handleCreateClick}>
          <Plus className="size-4" />
          Giao bài tập
        </Button>
      </div>
      <div className="rounded-md border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Bài tập</TableHead>
              <TableHead>Mở từ</TableHead>
              <TableHead>Hạn nộp</TableHead>
              <TableHead>Bài nộp</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {classAssignments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Lớp học/Gói học hiện chưa có bài tập nào được giao.
                </TableCell>
              </TableRow>
            ) : (
              classAssignments.map((ca) => (
                <TableRow key={ca.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="size-4 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">
                          {ca.assignment?.title || ca.titleOverride || "Bài tập"}
                        </span>
                        {ca.titleOverride && ca.assignment?.title && (
                          <span className="text-xs text-muted-foreground">
                            Gốc: {ca.assignment.title}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {ca.openAt ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="size-3 text-muted-foreground" />
                        {formatDateTime(ca.openAt, "HH:mm dd/MM/yyyy")}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {ca.deadline ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="size-3 text-muted-foreground" />
                        {formatDateTime(ca.deadline, "HH:mm dd/MM/yyyy")}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Không đặt</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {ca._count?.submissions ?? 0} bài nộp
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!vodPackageId ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleGoToGrading(ca)}
                      >
                        <CheckCircle2 className="size-3 mr-1" />
                        Chấm điểm
                      </Button>
                      ) : null}
                      {(!ca.deadline || new Date(ca.deadline) >= new Date()) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditClick(ca)}
                        >
                          Chỉnh sửa
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive border-destructive/40"
                        onClick={() => handleRemoveClick(ca)}
                      >
                        Gỡ
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ClassAssignmentSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        initial={editingAssignment}
        submitting={addMutation.isPending || updateMutation.isPending}
        onSubmit={handleSubmit}
      />

      <AlertDialog open={removeConfirmOpen} onOpenChange={setRemoveConfirmOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <AlertTriangle className="size-5" />
            </AlertDialogMedia>
            <AlertDialogTitle>Xác nhận gỡ bài tập</AlertDialogTitle>
            <AlertDialogDescription>
              Gỡ bài tập{" "}
              <span className="font-semibold text-foreground">
                {selectedForRemove?.assignment?.title || selectedForRemove?.titleOverride}
              </span>{" "}
              khỏi lớp? Dữ liệu bài nộp của học viên (nếu có) có thể bị ảnh hưởng.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" disabled={removeMutation.isPending}>
                Hủy
              </Button>
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => void handleConfirmRemove()}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? "Đang gỡ..." : "Xác nhận gỡ"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
