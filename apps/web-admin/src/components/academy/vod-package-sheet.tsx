import { useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
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
  FieldGroup,
  FieldLabel,
  FieldError,
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
  useCreateAcademyVodPackage,
  useUpdateAcademyVodPackage,
  type AcademyVodPackage,
} from "@/lib/api/services/academy-vod-packages"
import { useAcademyCourseProfiles } from "@/lib/api/services/academy-course-profiles"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { InstructorPicker } from "@/components/academy/instructor-picker"
import { useUsers } from "@/lib/api/services/users"
import { LessonMediaUploader } from "@/components/academy/lesson-media-uploader"

const vodPackageSchema = z.object({
  courseProfileId: z.string().uuid("Vui lòng chọn hồ sơ khóa học"),
  code: z.string().min(2, "Mã gói VOD phải có ít nhất 2 ký tự"),
  title: z.string().min(3, "Tên gói VOD phải có ít nhất 3 ký tự"),
  price: z.number().min(0, "Giá phải lớn hơn hoặc bằng 0"),
  discountPrice: z.number().min(0, "Giá giảm phải lớn hơn hoặc bằng 0").optional().nullable(),
  status: z.string().optional(),
  instructorId: z.string().uuid("Vui lòng chọn giảng viên phụ trách"),
  thumbnailUrl: z.string().url().optional().nullable(),
}).refine(data => {
  if (data.discountPrice != null && data.price != null) {
    return data.discountPrice < data.price;
  }
  return true;
}, {
  message: "Giá giảm phải nhỏ hơn giá gốc",
  path: ["discountPrice"],
})

type VodPackageFormValues = z.infer<typeof vodPackageSchema>

interface VodPackageSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vodPackage?: AcademyVodPackage | null
}

export function VodPackageSheet({ open, onOpenChange, vodPackage }: VodPackageSheetProps) {
  const isEditing = !!vodPackage
  const createMutation = useCreateAcademyVodPackage()
  const updateMutation = useUpdateAcademyVodPackage()

  const { data: profiles } = useAcademyCourseProfiles({ status: isEditing ? undefined : 'PUBLISHED' })
  const { data: instructors } = useUsers({ role: "lecturer", limit: 100 })

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VodPackageFormValues>({
    resolver: zodResolver(vodPackageSchema),
    defaultValues: {
      courseProfileId: "",
      code: "",
      title: "",
      price: 0,
      discountPrice: null,
      status: "DRAFT",
      instructorId: "",
      thumbnailUrl: "",
    },
  })

  useEffect(() => {
    if (vodPackage) {
      reset({
        courseProfileId: vodPackage.courseProfileId,
        code: vodPackage.code,
        title: vodPackage.title,
        price: Number(vodPackage.price),
        discountPrice: vodPackage.discountPrice ? Number(vodPackage.discountPrice) : null,
        status: vodPackage.status ?? "DRAFT",
        instructorId: vodPackage.instructorId ?? "",
        thumbnailUrl: vodPackage.thumbnailUrl || "",
      })
    } else {
      reset({
        courseProfileId: "",
        code: "",
        title: "",
        price: 0,
        discountPrice: null,
        status: "DRAFT",
        instructorId: "",
        thumbnailUrl: "",
      })
    }
  }, [vodPackage, reset])

  async function onSubmit(values: VodPackageFormValues) {
    try {
      const input = {
        courseProfileId: values.courseProfileId,
        code: values.code,
        title: values.title,
        price: values.price,
        discountPrice: values.discountPrice,
        status: values.status as any,
        instructorId: values.instructorId,
        thumbnailUrl: values.thumbnailUrl?.trim() ? values.thumbnailUrl : undefined,
      }

      if (isEditing && vodPackage) {
        await updateMutation.mutateAsync({
          id: vodPackage.id,
          input,
        })
        toast.success("Cập nhật gói tự học thành công")
      } else {
        await createMutation.mutateAsync(input)
        toast.success("Tạo gói tự học thành công")
      }
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error?.userMessage || error?.message || "Đã xảy ra lỗi")
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="!w-full sm:!max-w-[600px] max-h-screen p-0 flex flex-col overflow-hidden">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle>{isEditing ? "Chỉnh sửa gói tự học" : "Tạo gói tự học mới"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Cập nhật thông tin quản lý cho gói tự học này."
              : "Khởi tạo một gói tự học mới dựa trên chương trình."}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6">
            <form id="vod-package-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <FieldGroup>
                <FieldSet>
                  <FieldLegend>Chương trình và định danh</FieldLegend>
                  <FieldGroup>
                    <Field>
                      <FieldLabel>Hồ sơ khóa học gốc</FieldLabel>
                      <Controller
                        name="courseProfileId"
                        control={control}
                        render={({ field }) => (
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={isEditing}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn hồ sơ khóa học" />
                            </SelectTrigger>
                            <SelectContent>
                              {(isEditing ? profiles : (profiles?.filter(p => p.status === 'PUBLISHED') || []))?.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.title} ({p.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      <FieldError errors={[errors.courseProfileId]} />
                    </Field>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field>
                        <FieldLabel>Mã gói (VD: VOD-N4-ALL)</FieldLabel>
                        <Controller
                          name="code"
                          control={control}
                          render={({ field }) => (
                            <Input placeholder="Mã định danh" {...field} disabled={isEditing} />
                          )}
                        />
                        <FieldError errors={[errors.code]} />
                      </Field>
                      <Field>
                        <FieldLabel>Tên gói (VD: Trọn bộ N4 tự học)</FieldLabel>
                        <Controller
                          name="title"
                          control={control}
                          render={({ field }) => (
                            <Input placeholder="Tên hiển thị" {...field} />
                          )}
                        />
                        <FieldError errors={[errors.title]} />
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
                  </FieldGroup>
                </FieldSet>

                <FieldSet>
                  <FieldLegend>Kinh doanh</FieldLegend>
                  <FieldGroup>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field>
                        <FieldLabel>Giá học phí (VNĐ)</FieldLabel>
                        <Controller
                          name="price"
                          control={control}
                          render={({ field }) => (
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
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
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                              placeholder="Để trống nếu không giảm"
                            />
                          )}
                        />
                        <FieldError errors={[errors.discountPrice]} />
                      </Field>
                    </div>
                  </FieldGroup>
                </FieldSet>

                <FieldSet>
                  <FieldLegend>Hình ảnh</FieldLegend>
                  <FieldDescription>
                    Ảnh banner cho gói tự học này. Nếu để trống, hệ thống sẽ dùng ảnh của hồ sơ khóa học.
                  </FieldDescription>
                  <Controller
                    name="thumbnailUrl"
                    control={control}
                    render={({ field, fieldState }) => (
                      <LessonMediaUploader
                        value={field.value || null}
                        onChange={(url) => field.onChange(url ?? "")}
                        label="Ảnh banner gói tự học"
                        description="Kích thước gợi ý: 1200x630px. Hỗ trợ JPG, PNG, WebP."
                        accept="image/*"
                        errorMessage={fieldState.error?.message}
                      />
                    )}
                  />
                </FieldSet>
              </FieldGroup>
            </form>
          </div>
        </ScrollArea>

        <div className="px-6 py-4 border-t gap-2 bg-muted/20 flex justify-end shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Hủy
          </Button>
          <Button type="submit" form="vod-package-form" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Lưu thay đổi" : "Tạo gói tự học"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
