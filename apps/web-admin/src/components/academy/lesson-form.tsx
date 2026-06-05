import { useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { toast } from "@workspace/ui/components/sonner"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldLabel,
  FieldError,
  FieldGroup
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import { LessonMediaUploader } from "@/components/academy/lesson-media-uploader"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import type {
  AcademyLessonCreateDTO,
  AcademyLessonUpdateDTO,
} from "@workspace/schemas"
import {
  academyLessonCreateDTOSchema,
  academyLessonUpdateDTOSchema,
} from "@workspace/schemas"

type LessonFormValues = AcademyLessonCreateDTO | AcademyLessonUpdateDTO

interface LessonFormProps {
  defaultValues?: Partial<LessonFormValues>
  onSubmit: (data: LessonFormValues) => Promise<void>
  onCancel: () => void
  submitting?: boolean
  mode?: "create" | "edit"
}

export function LessonForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitting,
  mode = "create",
}: LessonFormProps) {
  const baseSchema =
    mode === "edit"
      ? academyLessonUpdateDTOSchema
      : academyLessonCreateDTOSchema.omit({ moduleId: true, orderIndex: true })

  const enhancedSchema = (baseSchema as any).superRefine((data: any, ctx: any) => {
    const type = data.type
    const videoUrl = data.videoUrl
    if (type === "VIDEO" && (!videoUrl || typeof videoUrl !== "string" || !videoUrl.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["videoUrl"],
        message: "Bài học VIDEO cần có nội dung (video URL).",
      })
    }
  })

  const {
    handleSubmit,
    control,
    watch,
    reset,
  } = useForm<LessonFormValues>({
    resolver: zodResolver(enhancedSchema),
    defaultValues: {
      title: "",
      type: "VIDEO",
      videoUrl: undefined,
      ...defaultValues,
    },
  })

  useEffect(() => {
    reset({
      title: "",
      type: "VIDEO",
      videoUrl: undefined,
      ...defaultValues,
    } as any)
  }, [defaultValues, reset])

  const contentType = watch("type")
  const isMediaUrlType = contentType === "VIDEO"

  const handleFormError = (errors: any) => {
    console.error("Form errors:", errors)
    const firstError = Object.values(errors)[0] as any
    if (firstError?.message) {
      toast.error(firstError.message || "Vui lòng kiểm tra lại các trường thông tin")
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, handleFormError)} className="space-y-6">
      <FieldGroup>
        <Controller
          name="title"
          control={control}
          render={({ field, fieldState }) => (
            <Field>
              <FieldLabel>Tiêu đề</FieldLabel>
              <Input placeholder="Nhập tiêu đề bài học" {...field} />
              <FieldError>{fieldState.error?.message}</FieldError>
            </Field>
          )}
        />

        <Controller
          name="type"
          control={control}
          render={({ field, fieldState }) => (
            <Field>
              <FieldLabel>Loại bài học</FieldLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn loại nội dung" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIDEO">VIDEO</SelectItem>
                  <SelectItem value="READING">READING</SelectItem>
                </SelectContent>
              </Select>
              <FieldDescription>
                VIDEO có video URL; READING là bài đọc / tài liệu.
              </FieldDescription>
              <FieldError>{fieldState.error?.message}</FieldError>
            </Field>
          )}
        />
      </FieldGroup>

      {isMediaUrlType && (
        <FieldGroup>
          <Controller
            name="videoUrl"
            control={control}
            render={({ field, fieldState }) => (
              <LessonMediaUploader
                value={field.value || null}
                onChange={field.onChange}
                label="Video bài giảng"
                description="Chọn file video, hệ thống sẽ tự động upload lên storage."
                accept="video/*"
                errorMessage={fieldState.error?.message}
              />
            )}
          />
        </FieldGroup>
      )}

      <FieldGroup>
        <Controller
          name="content"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel>Nội dung</FieldLabel>
              <RichTextEditor
                value={(field.value as string) ?? ""}
                onChange={field.onChange}
                placeholder="Nhập nội dung bài học..."
                minHeight={260}
              />
            </Field>
          )}
        />
      </FieldGroup>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Hủy
        </Button>
        <Button type="submit" disabled={submitting}>
          {mode === "create" ? "Tạo mới" : "Cập nhật"}
        </Button>
      </div>
    </form>
  )
}
