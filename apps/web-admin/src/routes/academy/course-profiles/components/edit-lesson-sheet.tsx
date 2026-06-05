import React from "react"
import { toast } from "sonner"
import { LessonForm } from "@/components/academy/lesson-form"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { useQueryClient } from "@tanstack/react-query"
import { useAcademyLesson, useUpdateAcademyLesson } from "@/lib/api/services/academy-lessons"

export function EditLessonDialog({
  open,
  onOpenChange,
  lesson,
  courseProfileId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  lesson: any | null
  courseProfileId: string
}) {
  const updateLessonMutation = useUpdateAcademyLesson()
  const qc = useQueryClient()
  const { data: fetchedLesson } = useAcademyLesson(lesson?.id, { enabled: open && !!lesson?.id })

  const defaultValues = React.useMemo(() => ({
    title: fetchedLesson?.title ?? lesson?.title ?? "",
    type: fetchedLesson?.type ?? lesson?.type ?? "VIDEO",
    videoUrl: fetchedLesson?.videoUrl ?? lesson?.videoUrl ?? undefined,
    content: fetchedLesson?.content ?? lesson?.content ?? undefined,
  }), [fetchedLesson, lesson])

  async function onSubmit(values: any) {
    if (!lesson) return
    try {
      await updateLessonMutation.mutateAsync({
        id: lesson.id,
        input: values,
      })
      qc.invalidateQueries({ queryKey: ["academy-course-profile", courseProfileId] })
      qc.invalidateQueries({ queryKey: ["academy-lesson", lesson.id] })
      toast.success("Cập nhật bài giảng thành công")
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || "Không thể cập nhật bài giảng")
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="!w-full sm:!max-w-[800px] flex flex-col h-full p-0 overflow-hidden">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle>Chỉnh sửa bài giảng</SheetTitle>
          <SheetDescription>Thay đổi nội dung và loại bài giảng.</SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6">
            <LessonForm
              mode="edit"
              defaultValues={defaultValues}
              submitting={updateLessonMutation.isPending}
              onSubmit={onSubmit}
              onCancel={() => onOpenChange(false)}
            />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

