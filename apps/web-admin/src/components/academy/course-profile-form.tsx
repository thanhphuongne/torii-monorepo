import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Save, X } from "lucide-react"
import {
  Field,
  FieldError,
  FieldLabel,
  FieldDescription,
  FieldGroup,
  FieldSet,
  FieldLegend,
} from "@workspace/ui/components/field"
import { Spinner } from "@workspace/ui/components/spinner"
import {
  academyCourseProfileCreateDTOSchema,
  academyCourseProfileUpdateDTOSchema,
  type AcademyCourseProfileCreateDTO,
  type AcademyCourseProfileUpdateDTO,
} from "@workspace/schemas"
import type { AcademyCourseProfile } from "@/lib/api/services/academy-course-profiles"
import { LessonMediaUploader } from "./lesson-media-uploader"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

export function CourseProfileForm({
  mode,
  initial,
  onSubmit,
  onCancel,
  submitting,
}: {
  mode: "create" | "edit"
  initial?: AcademyCourseProfile
  onSubmit: (
    data: any
  ) => Promise<void>
  onCancel: () => void
  submitting?: boolean
}) {
  const isEdit = mode === "edit"

  const { handleSubmit, control } = useForm<
    AcademyCourseProfileCreateDTO | AcademyCourseProfileUpdateDTO
  >({
    resolver: zodResolver(
      isEdit
        ? academyCourseProfileUpdateDTOSchema
        : academyCourseProfileCreateDTOSchema
    ) as any,
    defaultValues: isEdit
      ? {
        title: initial?.title ?? "",
        description: initial?.description ?? undefined,
        level: initial?.level ?? undefined,
        thumbnailUrl: initial?.thumbnailUrl ?? undefined,
      }
      : {
        code: "",
        title: "",
        description: undefined,
        level: "N5",
        thumbnailUrl: undefined,
      },
  })

  return (
    <form
      className="space-y-6"
      onSubmit={handleSubmit(async (data) => onSubmit(data))}
      noValidate
    >
      <FieldGroup>
        <FieldSet>
          <FieldLegend>Thông tin cơ bản</FieldLegend>
          <FieldDescription>
            Các thông tin định danh chính của hồ sơ khóa học.
          </FieldDescription>
          <FieldGroup>
            {!isEdit && (
              <Controller
                name={"code" as any}
                control={control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel>Mã</FieldLabel>
                    <Input placeholder="JLPT_N5" {...field} />
                    <FieldDescription>
                      Mã duy nhất không thể thay đổi sau khi tạo (vd: JLPT_N5).
                    </FieldDescription>
                    <FieldError>{fieldState.error?.message}</FieldError>
                  </Field>
                )}
              />
            )}

            <Controller
              name={"title" as any}
              control={control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel>Tiêu đề</FieldLabel>
                  <Input placeholder="Tiếng Nhật N5" {...field} />
                  <FieldError>{fieldState.error?.message}</FieldError>
                </Field>
              )}
            />

            <Controller
              name={"level" as any}
              control={control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel>Cấp độ</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn cấp độ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="N5">N5 – Sơ cấp 1</SelectItem>
                      <SelectItem value="N4">N4 – Sơ cấp 2</SelectItem>
                      <SelectItem value="N3">N3 – Trung cấp</SelectItem>
                      <SelectItem value="N2">N2 – Thượng cấp 1</SelectItem>
                      <SelectItem value="N1">N1 – Thượng cấp 2</SelectItem>
                      <SelectItem value="Beginner">Cơ bản</SelectItem>
                      <SelectItem value="Intermediate">Trung cấp</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldError>{fieldState.error?.message}</FieldError>
                </Field>
              )}
            />
          </FieldGroup>
        </FieldSet>

        <FieldSet>
          <FieldLegend>Mô tả chi tiết</FieldLegend>
          <FieldDescription>
            Nội dung mô tả chi tiết về chương trình học này.
          </FieldDescription>
          <Controller
            name={"description" as any}
            control={control}
            render={({ field, fieldState }) => (
              <Field>
                <Tabs defaultValue="edit" className="mt-2">
                  <TabsList className="mb-4 overflow-x-auto whitespace-nowrap">
                    <TabsTrigger value="edit">Chỉnh sửa</TabsTrigger>
                    <TabsTrigger value="preview">Xem trước</TabsTrigger>
                  </TabsList>
                  <TabsContent value="edit">
                    <RichTextEditor
                      initialContent={field.value || ""}
                      onUpdate={(data: string) => field.onChange(data)}
                    />
                  </TabsContent>
                  <TabsContent value="preview">
                    <div
                      className="border rounded-md p-4 min-h-[200px] prose prose-sm dark:prose-invert max-w-none bg-muted/20"
                      dangerouslySetInnerHTML={{
                        __html: field.value || "<em>Chưa có mô tả.</em>",
                      }}
                    />
                  </TabsContent>
                </Tabs>
                <FieldError>{fieldState.error?.message}</FieldError>
              </Field>
            )}
          />
        </FieldSet>

        <FieldSet>
          <FieldLegend>Hình ảnh</FieldLegend>
          <FieldDescription>
            Tải lên hình ảnh đại diện của khóa học.
          </FieldDescription>
          <FieldGroup>
            <Controller
              name={"thumbnailUrl" as any}
              control={control}
              render={({ field, fieldState }) => (
                <LessonMediaUploader
                  value={field.value || null}
                  onChange={field.onChange}
                  label="Ảnh đại diện"
                  description="Chọn ảnh đại diện cho hồ sơ khóa học. Hỗ trợ JPG, PNG, WebP."
                  accept="image/*"
                  errorMessage={fieldState.error?.message}
                />
              )}
            />
          </FieldGroup>
        </FieldSet>

        <Field orientation="horizontal" className="justify-end pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
            className="gap-2 border-slate-500/30 text-slate-700 bg-transparent hover:bg-slate-50 hover:text-slate-700"
          >
            <X className="size-4" />
            Hủy bỏ
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            className="min-w-[160px] gap-2 border-primary/30 text-primary bg-transparent hover:bg-primary/5"
            variant="outline"
          >
            {submitting ? <Spinner className="h-4 w-4" /> : <Save className="size-4" />}
            {isEdit ? "Cập nhật hồ sơ" : "Tạo hồ sơ"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}
