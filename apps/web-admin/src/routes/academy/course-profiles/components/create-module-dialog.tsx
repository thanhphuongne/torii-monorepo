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
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { useCreateAcademyCourseModule } from "@/lib/api/services/academy-course-modules"

const createModuleSchema = z.object({
  title: z.string().min(2, "Tiêu đề mô-đun phải có ít nhất 2 ký tự"),
})

type CreateModuleFormValues = z.infer<typeof createModuleSchema>

export function CreateCourseModuleDialog({
  open,
  onOpenChange,
  courseProfileId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseProfileId: string
}) {
  const createMutation = useCreateAcademyCourseModule()

  const form = useForm<CreateModuleFormValues>({
    resolver: zodResolver(createModuleSchema),
    defaultValues: { title: "" },
  })

  useEffect(() => {
    if (!open) return
    form.reset({ title: "" })
  }, [open, form])

  async function onSubmit(values: CreateModuleFormValues) {
    try {
      await createMutation.mutateAsync({
        courseProfileId,
        input: { title: values.title },
      })
      toast.success("Tạo mô-đun thành công")
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || "Không thể tạo mô-đun")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 pb-0 shrink-0">
          <DialogHeader>
            <DialogTitle>Tạo mô-đun mới</DialogTitle>
            <DialogDescription>
              Mô-đun sẽ được tự động gán thứ tự tiếp theo trong chương trình học của khóa.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form id="create-module-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FieldGroup>
              <Field>
                <FieldLabel>Tiêu đề mô-đun</FieldLabel>
                <Input
                  placeholder="VD: Mô-đun 1 - JLPT N5"
                  {...form.register("title")}
                  disabled={createMutation.isPending}
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
              disabled={createMutation.isPending}
            >
              Hủy
            </Button>
            <Button type="submit" form="create-module-form" disabled={createMutation.isPending} className="gap-2">
              <Plus className="size-4" />
              {createMutation.isPending ? "Đang tạo..." : "Tạo mô-đun"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

