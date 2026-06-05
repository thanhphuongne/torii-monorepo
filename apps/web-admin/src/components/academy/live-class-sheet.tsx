import { useEffect, useMemo } from "react"
import { useForm, Controller, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from "@workspace/ui/components/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  useCreateAcademyLiveClass,
  useUpdateAcademyLiveClass,
  type AcademyLiveClass,
} from "@/lib/api/services/academy-live-classes"
import { InstructorPicker } from "@/components/academy/instructor-picker"
import { useAcademyCohorts } from "@/lib/api/services/academy-cohorts"
import { useUsers } from "@/lib/api/services/users"
import { toast } from "sonner"
import { Loader2, Plus, Trash2, Calendar, Zap } from "lucide-react"
import { useCreateAcademyLiveSchedule } from "@/lib/api/services/academy-live-schedules"
import { useAcademyLiveSchedules } from "@/lib/api/services/academy-live-schedules"
import { LessonMediaUploader } from "@/components/academy/lesson-media-uploader"

const scheduleItemSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  startTime: z.string().min(1, "Bắt đầu không được để trống"),
  endTime: z.string().min(1, "Kết thúc không được để trống"),
}).refine((data) => {
  if (data.startTime && data.endTime) {
    return data.startTime < data.endTime;
  }
  return true;
}, {
  message: "Giờ kết thúc phải sau giờ bắt đầu",
  path: ["endTime"],
})

const liveClassSchema = z.object({
  cohortId: z.string().uuid("Vui lòng chọn Đợt khai giảng"),
  code: z.string().min(2, "Mã lớp phải có ít nhất 2 ký tự"),
  name: z.string().min(3, "Tên lớp phải có ít nhất 3 ký tự"),
  instructorId: z.string().uuid("Vui lòng chọn giảng viên phụ trách"),
  status: z.string().optional(),
  maxStudents: z.number().int().min(1, "Ít nhất 1 học viên").max(30, "Số học viên tối đa là 30").optional().nullable(),
  price: z.number().positive("Giá phải lớn hơn 0").optional().nullable(),
  discountPrice: z.number().min(0, "Giá giảm phải lớn hơn hoặc bằng 0").optional().nullable(),
  thumbnailUrl: z.string().url().optional().nullable(),
  schedules: z.array(scheduleItemSchema).optional(),
})
  .refine(data => {
    if (data.discountPrice != null && data.price != null) {
      return data.discountPrice < data.price;
    }
    return true;
  }, {
    message: "Giá giảm phải nhỏ hơn giá gốc",
    path: ["discountPrice"],
  })

type LiveClassFormValues = z.infer<typeof liveClassSchema>

interface LiveClassSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  academyClass?: AcademyLiveClass | null
  defaultCohortId?: string
}

export function LiveClassSheet({ open, onOpenChange, academyClass, defaultCohortId }: LiveClassSheetProps) {
  const isEditing = !!academyClass
  const createMutation = useCreateAcademyLiveClass()
  const updateMutation = useUpdateAcademyLiveClass()
  const createScheduleMutation = useCreateAcademyLiveSchedule()

  const { data: cohorts } = useAcademyCohorts({} as any)
  const { data: instructors } = useUsers({ role: "lecturer", limit: 100 })

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LiveClassFormValues>({
    resolver: zodResolver(liveClassSchema),
    defaultValues: {
      cohortId: "",
      code: "",
      name: "",
      instructorId: "",
      status: "DRAFT",
      maxStudents: null,
      price: null,
      discountPrice: null,
      thumbnailUrl: "",
      schedules: [],
    },
  })

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "schedules",
  })

  const canEditSchedules = useMemo(() => {
    if (!academyClass) return true
    return academyClass.status === "DRAFT"
  }, [academyClass])

  const { data: liveSchedules } = useAcademyLiveSchedules(
    { liveClassId: academyClass?.id } as any,
    { enabled: open && !!academyClass?.id },
  )

  const WEEKDAYS = [
    { value: "1", label: "Thứ Hai" },
    { value: "2", label: "Thứ Ba" },
    { value: "3", label: "Thứ Tư" },
    { value: "4", label: "Thứ Năm" },
    { value: "5", label: "Thứ Sáu" },
    { value: "6", label: "Thứ Bảy" },
    { value: "0", label: "Chủ Nhật" },
  ]

  useEffect(() => {
    if (academyClass) {
      reset({
        cohortId: academyClass.cohortId ?? "",
        code: academyClass.code,
        name: academyClass.name,
        instructorId: academyClass.instructorId ?? "",
        status: academyClass.status ?? "DRAFT",
        maxStudents: academyClass.maxStudents ?? null,
        price: (academyClass as any).price ? Number((academyClass as any).price) : null,
        discountPrice: (academyClass as any).discountPrice ? Number((academyClass as any).discountPrice) : null,
        thumbnailUrl: academyClass.thumbnailUrl || "",
        schedules: [],
      })
    } else {
      reset({
        cohortId: defaultCohortId ?? "",
        code: "",
        name: "",
        instructorId: "",
        status: "DRAFT",
        maxStudents: null,
        price: null,
        discountPrice: null,
        thumbnailUrl: "",
        schedules: [],
      })
    }
  }, [academyClass, reset, defaultCohortId])

  useEffect(() => {
    if (!open) return
    if (!academyClass?.id) return
    if (!liveSchedules) return

    replace(
      liveSchedules.map((s) => ({
        weekday: s.weekday,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
    )
  }, [academyClass?.id, liveSchedules, open, replace])

  async function onSubmit(values: LiveClassFormValues) {
    try {
      if (isEditing && academyClass) {
        await updateMutation.mutateAsync({
          id: academyClass.id,
          input: {
            name: values.name,
            instructorId: values.instructorId,
            status: values.status as any,
            maxStudents: values.maxStudents === null ? undefined : values.maxStudents,
            price: values.price === null ? undefined : values.price,
            discountPrice: values.discountPrice === null ? undefined : values.discountPrice,
            thumbnailUrl: values.thumbnailUrl?.trim() ? values.thumbnailUrl : undefined,
          },
        })
        toast.success("Cập nhật lớp trực tiếp thành công")
      } else {
        await createMutation.mutateAsync({
          cohortId: values.cohortId,
          code: values.code,
          name: values.name,
          instructorId: values.instructorId,
          status: values.status as any,
          maxStudents: values.maxStudents === null ? undefined : values.maxStudents,
          price: values.price === null ? undefined : values.price,
          discountPrice: values.discountPrice === null ? undefined : values.discountPrice,
          thumbnailUrl: values.thumbnailUrl?.trim() ? values.thumbnailUrl : undefined,
          schedules: values.schedules,
        } as any)

        toast.success("Tạo lớp trực tiếp và thiết lập lịch học thành công")
      }
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error?.userMessage || error?.message || "Đã xảy ra lỗi")
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending || createScheduleMutation.isPending

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="!w-full sm:!max-w-[600px] max-h-screen p-0 flex flex-col overflow-hidden">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle>{isEditing ? "Chỉnh sửa lớp trực tiếp" : "Tạo lớp trực tiếp mới"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Cập nhật thông tin vận hành cho lớp học này."
              : "Khởi tạo một lớp trực tiếp mới thuộc về một đợt khai giảng."}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6">
            <form id="live-class-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <FieldGroup>
                <FieldSet>
                  <FieldLegend>Liên kết cấu trúc</FieldLegend>
                  <FieldGroup>
                    <Field>
                      <FieldLabel>Đợt khai giảng</FieldLabel>
                      <Controller
                        name="cohortId"
                        control={control}
                        render={({ field }) => (
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={isEditing}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn Đợt khai giảng" />
                            </SelectTrigger>
                            <SelectContent>
                              {cohorts?.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name} ({c.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      <FieldError errors={[errors.cohortId]} />
                    </Field>
                  </FieldGroup>
                </FieldSet>

                <FieldSet>
                  <FieldLegend>Thông tin lớp học</FieldLegend>
                  <FieldGroup>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field>
                        <FieldLabel>Mã lớp</FieldLabel>
                        <Controller
                          name="code"
                          control={control}
                          render={({ field }) => (
                            <Input placeholder="VD: N5-L1-2402" {...field} disabled={isEditing} />
                          )}
                        />
                        <FieldError errors={[errors.code]} />
                      </Field>
                      <Field>
                        <FieldLabel>Tên lớp</FieldLabel>
                        <Controller
                          name="name"
                          control={control}
                          render={({ field }) => (
                            <Input placeholder="VD: Lớp trực tiếp 1 - Tối 2/4/6" {...field} />
                          )}
                        />
                        <FieldError errors={[errors.name]} />
                      </Field>
                    </div>

                    <Field>
                      <FieldLabel>Giảng viên phụ trách</FieldLabel>
                      <Controller
                        name="instructorId"
                        control={control}
                        render={({ field }) => (
                          <InstructorPicker
                            value={field.value ?? null}
                            onSelect={(val) => field.onChange(val)}
                            instructors={(instructors as any)?.data ?? []}
                          />
                        )}
                      />
                      <FieldError errors={[errors.instructorId]} />
                    </Field>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field>
                        <FieldLabel>Số học viên tối đa</FieldLabel>
                        <Controller
                          name="maxStudents"
                          control={control}
                          render={({ field }) => (
                            <div className="space-y-1">
                              <Input
                                type="number"
                                min={1}
                                max={30}
                                placeholder="Học viên (Tối đa 30)"
                                value={field.value ?? ""}
                                onChange={(e) => {
                                  const raw = e.target.value
                                  if (raw === "") {
                                    field.onChange(null)
                                    return
                                  }
                                  const n = parseInt(raw, 10)
                                  field.onChange(isNaN(n) ? null : n)
                                }}
                              />
                              <p className="text-[10px] text-muted-foreground italic">* Mỗi lớp học tối đa 30 học viên theo quy định.</p>
                            </div>
                          )}
                        />
                        <FieldError errors={[errors.maxStudents]} />
                      </Field>
                      <div className="grid grid-cols-2 gap-2">
                        <Field>
                          <FieldLabel>Giá gốc (VNĐ)</FieldLabel>
                          <Controller
                            name="price"
                            control={control}
                            render={({ field }) => (
                              <Input
                                type="number"
                                min={1}
                                placeholder="Nhập giá > 0"
                                value={field.value ?? ""}
                                onChange={(e) =>
                                  field.onChange(
                                    e.target.value === "" ? null : Number(e.target.value),
                                  )
                                }
                              />
                            )}
                          />
                          <FieldError errors={[errors.price]} />
                        </Field>
                        <Field>
                          <FieldLabel>Giá giảm (VNĐ)</FieldLabel>
                          <Controller
                            name="discountPrice"
                            control={control}
                            render={({ field }) => (
                              <Input
                                type="number"
                                min={0}
                                placeholder="Không giảm"
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                              />
                            )}
                          />
                          <FieldError errors={[errors.discountPrice]} />
                        </Field>
                      </div>
                    </div>
                  </FieldGroup>
                </FieldSet>

                <FieldSet>
                  <FieldLegend>Hình ảnh</FieldLegend>
                  <FieldDescription>
                    Ảnh đại diện (banner) cho lớp học này. Nếu để trống, hệ thống sẽ dùng ảnh của hồ sơ khóa học.
                  </FieldDescription>
                  <Controller
                    name="thumbnailUrl"
                    control={control}
                    render={({ field, fieldState }) => (
                      <LessonMediaUploader
                        value={field.value || null}
                        onChange={(url) => field.onChange(url ?? "")}
                        label="Ảnh banner lớp học"
                        description="Kích thước gợi ý: 1200x630px. Hỗ trợ JPG, PNG, WebP."
                        accept="image/*"
                        errorMessage={fieldState.error?.message}
                      />
                    )}
                  />
                </FieldSet>

                <FieldSet>
                  <div className="flex items-center justify-between">
                    <FieldLegend>Lịch học tuần</FieldLegend>
                    {!isEditing && (
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => replace([
                            { weekday: 1, startTime: "18:00", endTime: "20:00" },
                            { weekday: 3, startTime: "18:00", endTime: "20:00" },
                            { weekday: 5, startTime: "18:00", endTime: "20:00" }
                          ])}
                        >
                          <Zap className="size-3 text-amber-500 fill-amber-500" />
                          Mẫu 2-4-6
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => replace([
                            { weekday: 2, startTime: "18:00", endTime: "20:00" },
                            { weekday: 4, startTime: "18:00", endTime: "20:00" },
                            { weekday: 6, startTime: "18:00", endTime: "20:00" }
                          ])}
                        >
                          <Zap className="size-3 text-sky-500 fill-sky-500" />
                          Mẫu 3-5-7
                        </Button>
                      </div>
                    )}
                  </div>
                  <FieldDescription>
                    {isEditing
                      ? "Lịch học đang áp dụng cho lớp. Nếu lớp đã được xuất bản/đang diễn ra, lịch được khóa để tránh ảnh hưởng vận hành."
                      : "Thiết lập khung giờ học định kỳ để hệ thống tự động sinh buổi học."}
                  </FieldDescription>

                  <FieldGroup className="mt-4">
                    {fields.length === 0 && !isEditing && (
                      <div
                        className="flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-xl text-muted-foreground bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => append({ weekday: 1, startTime: "18:00", endTime: "20:00" })}
                      >
                        <Calendar className="size-8 opacity-20 mb-2" />
                        <p className="text-xs font-medium">Chưa có lịch. Click để thêm khung giờ.</p>
                      </div>
                    )}

                    {fields.length === 0 && isEditing && (
                      <div className="rounded-xl border bg-muted/20 p-4 text-xs text-muted-foreground">
                        Lớp này chưa có lịch học hoặc chưa tải được lịch.
                      </div>
                    )}

                    <div className="space-y-4">
                      {fields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-background/50 p-3 rounded-lg border shadow-sm relative group">
                          <div className="md:col-span-4">
                            <FieldLabel className="text-[10px] uppercase text-muted-foreground mb-1">Thứ</FieldLabel>
                            <Controller
                              name={`schedules.${index}.weekday`}
                              control={control}
                              render={({ field }) => (
                                <Select
                                  onValueChange={(val) => field.onChange(parseInt(val, 10))}
                                  value={field.value?.toString() ?? ""}
                                  disabled={isEditing && !canEditSchedules}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Chọn thứ" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {WEEKDAYS.map((day) => (
                                      <SelectItem key={day.value} value={day.value}>
                                        {day.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </div>
                          <div className="md:col-span-3">
                            <FieldLabel className="text-[10px] uppercase text-muted-foreground mb-1">Bắt đầu</FieldLabel>
                            <Input
                              type="time"
                              {...control.register(`schedules.${index}.startTime`)}
                              disabled={isEditing && !canEditSchedules}
                            />
                          </div>
                          <div className="md:col-span-3">
                            <FieldLabel className="text-[10px] uppercase text-muted-foreground mb-1">Kết thúc</FieldLabel>
                            <Input
                              type="time"
                              {...control.register(`schedules.${index}.endTime`)}
                              disabled={isEditing && !canEditSchedules}
                            />
                          </div>
                          <div className="md:col-span-2 flex justify-end">
                            {!isEditing && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => remove(index)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {!isEditing && fields.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full border-dashed border"
                        onClick={() => append({ weekday: 1, startTime: "18:00", endTime: "20:00" })}
                      >
                        <Plus className="size-3" /> Thêm khung giờ
                      </Button>
                    )}
                  </FieldGroup>
                </FieldSet>
              </FieldGroup>
            </form>
          </div>
        </ScrollArea>

        <div className="px-6 py-4 border-t gap-2 bg-muted/20 flex justify-end shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Hủy
          </Button>
          <Button type="submit" form="live-class-form" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Lưu thay đổi" : "Tạo lớp trực tiếp"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
