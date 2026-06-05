import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Spinner } from "@workspace/ui/components/spinner"
import type { AcademyClassAssignment } from "@/lib/api/services/academy-class-assignments"
import { useEffect, useRef, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { storageApi } from "@/lib/api/services/storage-api"
import { Paperclip } from "lucide-react"
import { toast } from "@workspace/ui/components/sonner"

function hasInstructionBody(s: string) {
  return s.replace(/\u00a0/g, " ").trim().length > 0
}

const assignmentSchema = z.object({
  title: z.string().min(1, "Nhập tiêu đề bài tập").max(255),
  instructions: z.string().refine(hasInstructionBody, {
    message: "Nhập nội dung/hướng dẫn bài tập",
  }),
  openAt: z.string().optional(),
  deadline: z.string().optional(),
}).refine((data) => {
  if (data.openAt && data.deadline) {
    return new Date(data.openAt) < new Date(data.deadline);
  }
  return true;
}, {
  message: "Hạn nộp bài phải sau thời gian mở bài tập",
  path: ["deadline"],
}).refine((data) => {
  if (data.deadline) {
    const now = new Date();
    // buffer a bit for network lag
    now.setMinutes(now.getMinutes() - 5);
    return new Date(data.deadline) > now;
  }
  return true;
}, {
  message: "Hạn nộp bài không được ở quá khứ",
  path: ["deadline"],
})

type AssignmentForm = z.infer<typeof assignmentSchema>

interface ClassAssignmentSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: AcademyClassAssignment | null
  submitting?: boolean
  onSubmit: (data: AssignmentForm) => Promise<void>
}

export function ClassAssignmentSheet({
  open,
  onOpenChange,
  initial,
  submitting,
  onSubmit,
}: ClassAssignmentSheetProps) {
  const isEdit = !!initial
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingFile, setUploadingFile] = useState(false)

  const form = useForm<AssignmentForm>({
    resolver: zodResolver(assignmentSchema),
    defaultValues:
      isEdit && initial
        ? {
            title: initial.assignment?.title ?? "",
            instructions: initial.assignment?.instructions ?? "",
            openAt: initial.openAt
              ? new Date(initial.openAt).toISOString().slice(0, 16)
              : "",
            deadline: initial.deadline
              ? new Date(initial.deadline).toISOString().slice(0, 16)
              : "",
          }
        : {
            title: "",
            instructions: "",
            openAt: "",
            deadline: "",
          },
  })

  useEffect(() => {
    if (open) {
      if (isEdit && initial) {
        form.reset({
          title: initial.assignment?.title ?? "",
          instructions: initial.assignment?.instructions ?? "",
          openAt: initial.openAt
            ? new Date(initial.openAt).toISOString().slice(0, 16)
            : "",
          deadline: initial.deadline
            ? new Date(initial.deadline).toISOString().slice(0, 16)
            : "",
        })
      } else {
        form.reset({
          title: "",
          instructions: "",
          openAt: "",
          deadline: "",
        })
      }
    }
  }, [open, isEdit, initial, form])

  const handleOpenChange = (next: boolean) => {
    if (!next && !submitting) {
      form.reset()
    }
    onOpenChange(next)
  }

  const watchOpenAt = form.watch("openAt")
  const now = new Date().toISOString().slice(0, 16)

  const handleSubmit = form.handleSubmit(async (data) => {
    const payload: AssignmentForm = {
      ...data,
      openAt: data.openAt?.trim()
        ? new Date(data.openAt).toISOString()
        : undefined,
      deadline: data.deadline?.trim()
        ? new Date(data.deadline).toISOString()
        : undefined,
    }
    await onSubmit(payload)
    handleOpenChange(false)
  })

  const appendFileLink = async (file: File) => {
    setUploadingFile(true)
    try {
      const result = await storageApi.uploadFile(file, "academy")
      const label = file.name.replace(/[[\]]/g, "\\$&")
      const line = `\n\n- [${label}](${result.fileUrl})\n`
      const cur = form.getValues("instructions") ?? ""
      form.setValue("instructions", cur + line, {
        shouldDirty: true,
        shouldValidate: true,
        shouldTouch: true,
      })
      toast.success("Đã đính kèm tệp (liên kết đã thêm vào hướng dẫn)")
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Tải tệp thất bại"
      toast.error(msg)
    } finally {
      setUploadingFile(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="!w-full sm:!max-w-[800px] max-h-screen p-0 flex flex-col overflow-hidden">
        <SheetHeader className="p-6 border-b shrink-0">
          <SheetTitle>
            {isEdit ? "Chỉnh sửa bài tập" : "Giao bài tập cho lớp"}
          </SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Chỉnh sửa tiêu đề, hướng dẫn và thời gian mở / hạn nộp."
              : "Tạo bài tập mới dành riêng cho lớp trực tiếp này."}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 min-h-0">
          <form id="assignment-form" onSubmit={handleSubmit} className="p-6 space-y-6">
            <FieldGroup>
              <Field>
                <FieldLabel>Tiêu đề bài tập *</FieldLabel>
                <Input
                  placeholder="Ví dụ: Bài luận giới thiệu bản thân"
                  {...form.register("title")}
                />
                {form.formState.errors.title && (
                  <p className="text-destructive text-sm mt-1">
                    {form.formState.errors.title.message}
                  </p>
                )}
              </Field>

              <Field>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <FieldLabel>Hướng dẫn / Nội dung *</FieldLabel>
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(ev) => {
                        const f = ev.target.files?.[0]
                        if (f) void appendFileLink(f)
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingFile || submitting}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploadingFile ? (
                        <Spinner className="mr-2 h-4 w-4" />
                      ) : (
                        <Paperclip className="mr-2 h-4 w-4" />
                      )}
                      Đính kèm tệp
                    </Button>
                  </div>
                </div>
                <FieldDescription>
                  Có thể tải tệp lên — liên kết sẽ được chèn vào nội dung Markdown bên dưới.
                </FieldDescription>
                <Controller
                  name="instructions"
                  control={form.control}
                  render={({ field }) => (
                    <RichTextEditor
                      value={field.value}
                      onChange={field.onChange}
                      minHeight={280}
                      placeholder="Mô tả yêu cầu bài tập, độ dài, tiêu chí chấm điểm..."
                    />
                  )}
                />
                {form.formState.errors.instructions && (
                  <p className="text-destructive text-sm mt-1">
                    {form.formState.errors.instructions.message}
                  </p>
                )}
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Mở từ</FieldLabel>
                  <Input
                    type="datetime-local"
                    {...form.register("openAt")}
                    min={now}
                  />
                </Field>
                <Field>
                  <FieldLabel>Hạn nộp</FieldLabel>
                  <Input
                    type="datetime-local"
                    {...form.register("deadline")}
                    min={watchOpenAt || now}
                  />
                </Field>
              </div>
            </FieldGroup>
          </form>
        </ScrollArea>
        <div className="p-6 border-t bg-muted/20 flex justify-end gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={submitting}
          >
            Hủy
          </Button>
          <Button type="submit" form="assignment-form" disabled={submitting || uploadingFile}>
            {submitting && <Spinner className="mr-2 h-4 w-4" />}
            {isEdit ? "Lưu" : "Giao bài tập"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
