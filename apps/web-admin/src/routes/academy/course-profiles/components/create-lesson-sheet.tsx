import { useEffect } from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import { useCreateAcademyLesson } from "@/lib/api/services/academy-lessons"
import { LessonForm } from "@/components/academy/lesson-form"

export function CreateLessonDialog({
  open,
  onOpenChange,
  moduleId,
  courseProfileId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  moduleId: string
  courseProfileId: string
}) {
  const createLessonMutation = useCreateAcademyLesson()
  const qc = useQueryClient()

  useEffect(() => {
    if (!open) return
  }, [open])

  async function onSubmit(values: any) {
    try {
      await createLessonMutation.mutateAsync({
        moduleId,
        ...values,
      })
      qc.invalidateQueries({ queryKey: ["academy-course-profile", courseProfileId] })
      toast.success("Tạo bài giảng thành công")
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || "Không thể tạo bài giảng")
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="!w-full sm:!max-w-[800px] flex flex-col h-full p-0 overflow-hidden">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle>Thêm bài giảng mới</SheetTitle>
          <SheetDescription>Điền thông tin bài học và lưu lại.</SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6">
            <LessonForm
              mode="create"
              onSubmit={onSubmit}
              onCancel={() => onOpenChange(false)}
              submitting={createLessonMutation.isPending}
            />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

