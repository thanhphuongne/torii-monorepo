import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Field, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { toast } from "sonner"
import { Plus } from "lucide-react"
import { useUpdateAcademyCourseModule } from "@/lib/api/services/academy-course-modules"
import { type AcademyCourseModuleUpdateDTO } from "@/lib/api/services/academy-course-modules"

const editModuleSchema = z.object({
  title: z.string().min(2, "Tiêu đề mô-đun phải có ít nhất 2 ký tự"),
})

type EditModuleFormValues = z.infer<typeof editModuleSchema>

export function EditCourseModuleDialog({
  open,
  onOpenChange,
  courseProfileId,
  module,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseProfileId: string
  module: any | null
}) {
  const updateMutation = useUpdateAcademyCourseModule()

  const form = useForm<EditModuleFormValues>({
    resolver: zodResolver(editModuleSchema),
    defaultValues: { title: "" },
  })

  useEffect(() => {
    if (!open) return
    if (!module) return
    form.reset({ title: module.title ?? "" })
  }, [open, module, form])

  async function onSubmit(values: EditModuleFormValues) {
    if (!module) return
    const payload: AcademyCourseModuleUpdateDTO = { title: values.title }

    try {
      await updateMutation.mutateAsync({
        courseProfileId,
        moduleId: module.id,
        input: payload,
      })
      toast.success("Cập nhật mô-đun thành công")
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || "Không thể cập nhật mô-đun")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 pb-0 shrink-0">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa mô-đun</DialogTitle>
            <DialogDescription>Thay đổi tiêu đề mô-đun.</DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form id="edit-module-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FieldGroup>
              <Field>
                <FieldLabel>Tiêu đề mô-đun</FieldLabel>
                <Input
                  placeholder="VD: Mô-đun 1"
                  {...form.register("title")}
                  disabled={updateMutation.isPending}
                />
                <FieldError>{form.formState.errors.title?.message}</FieldError>
              </Field>
            </FieldGroup>
          </form>
        </div>

        <div className="p-6 pt-4 border-t bg-muted/20 shrink-0">
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
            >
              Hủy
            </Button>
            <Button type="submit" form="edit-module-form" disabled={updateMutation.isPending} className="gap-2">
              <Plus className="size-4" />
              {updateMutation.isPending ? "Đang cập nhật..." : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

