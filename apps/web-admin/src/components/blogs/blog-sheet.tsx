import { useEffect, useMemo, useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@workspace/ui/components/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Spinner } from "@workspace/ui/components/spinner"
import { useForm, Controller, type SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { toast } from "@workspace/ui/components/sonner"
import { X, Save } from "lucide-react"
import { useAppSelector } from "@/hooks/hooks"
import { selectUser } from "@/store/slices/auth-slice"
import { storageApi } from "@/lib/api/services/storage-api"
import { formatForDateTimeLocal } from "@/lib/format-utils"
import {
  BlogStatus,
  type BlogCreateDTO,
  type BlogUpdateDTO,
} from "@workspace/schemas"
import { useBlog, useCreateBlog, useUpdateBlog } from "@/lib/api/services/blog"
import type React from "react"

const blogSchema = z
  .object({
    title: z.string().min(1, "Tiêu đề là bắt buộc"),
    excerpt: z.string().optional(),
    content: z.string().min(1, "Nội dung không được để trống"),
    status: z.nativeEnum(BlogStatus),
    publishedAt: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.status === BlogStatus.SCHEDULED) {
        if (!data.publishedAt) return false
        const pubDate = new Date(data.publishedAt)
        // Cho phép trễ 1 phút để tránh lỗi do thời gian xử lý form
        return pubDate > new Date(Date.now() - 60000)
      }
      return true
    },
    {
      message: "Thời gian đăng bài phải ở trong tương lai",
      path: ["publishedAt"],
    },
  )

type BlogFormValues = z.infer<typeof blogSchema>

interface BlogSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  blogId: string | null
}

export function BlogSheet({ open, onOpenChange, blogId }: BlogSheetProps) {
  const isEditing = !!blogId
  const { data: blog, isLoading, error } = useBlog(blogId || "")
  const createBlog = useCreateBlog()
  const updateBlog = useUpdateBlog()

  const user = useAppSelector(selectUser)

  const [coverImageFile, setCoverImageFile] = useState<File | null>(null)
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null)
  const [uploadingCover, setUploadingCover] = useState(false)

  const defaultValues = useMemo<BlogFormValues>(
    () => ({
      title: "",
      excerpt: "",
      content: "",
      status: BlogStatus.DRAFT,
      publishedAt: "",
    }),
    [],
  )

  const {
    control,
    handleSubmit,
    reset,
    watch,
  } = useForm<BlogFormValues>({
    resolver: zodResolver(blogSchema),
    defaultValues,
  })

  const statusValue = watch("status")

  useEffect(() => {
    if (!open) return

    if (isEditing) {
      if (!blog || !blogId) return

      const normalizedStatus = (blog.status?.toLowerCase() as BlogStatus) || BlogStatus.DRAFT
      reset({
        title: blog.title || "",
        excerpt: blog.excerpt || "",
        content: blog.content || "",
        status: normalizedStatus,
        publishedAt: blog.publishedAt
          ? formatForDateTimeLocal(blog.publishedAt)
          : "",
      })
      setCoverImageFile(null)
      setCoverImagePreview(blog.coverImageUrl || null)
    } else {
      setCoverImageFile(null)
      setCoverImagePreview(null)
      reset(defaultValues)
    }
  }, [open, isEditing, blog, blogId, reset, defaultValues])

  const handleFileUpload = async (file: File, module: string) => {
    const uploadData = {
      filename: file.name,
      contentType: file.type,
      module,
    }
    const { uploadUrl, fileId } = await storageApi.generateUploadUrl(uploadData)

    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
      mode: "cors",
    })

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text().catch(() => "Lỗi không xác định")
      throw new Error(
        `Tải lên thất bại với mã lỗi ${uploadResponse.status}: ${errorText}`,
      )
    }

    const confirmResult = await storageApi.confirmUpload({ fileId })
    return confirmResult.fileUrl
  }

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setCoverImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setCoverImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const removeCoverImage = () => {
    setCoverImageFile(null)
    setCoverImagePreview(null)
  }

  const isSubmitting = uploadingCover || createBlog.isPending || updateBlog.isPending

  const onSubmit: SubmitHandler<BlogFormValues> = async (data) => {
    try {
      if (isEditing) {
        if (!blogId || !blog) return

        setUploadingCover(true)
        let coverImageUrl: string | null = (blog.coverImageUrl as string | null) ?? null
        if (coverImageFile) {
          coverImageUrl = await handleFileUpload(coverImageFile, "blog-images")
        } else if (coverImagePreview === null) {
          coverImageUrl = null
        }

        await updateBlog.mutateAsync({
          id: blogId,
          blog: {
            title: data.title,
            excerpt: data.excerpt || undefined,
            content: data.content,
            status: data.status,
            coverImageUrl: coverImageUrl || undefined,
            publishedAt:
              data.status === BlogStatus.SCHEDULED && data.publishedAt
                ? new Date(data.publishedAt)
                : undefined,
          } satisfies BlogUpdateDTO,
        })

        toast.success("Đã lưu bài viết")
        onOpenChange(false)
        return
      }

      if (!user?.id) {
        toast.error("User not found")
        return
      }

      setUploadingCover(true)
      let coverImageUrl: string | undefined = undefined
      if (coverImageFile) {
        coverImageUrl = await handleFileUpload(coverImageFile, "blog-images")
      }

      const dto: BlogCreateDTO = {
        title: data.title,
        content: data.content,
        excerpt: data.excerpt || undefined,
        status: data.status,
        publishedAt:
          data.status === BlogStatus.SCHEDULED && data.publishedAt
            ? new Date(data.publishedAt)
            : undefined,
        authorId: user.id,
        coverImageUrl,
      }

      await createBlog.mutateAsync(dto)
      toast.success("Đã tạo bài viết", {
        description: "Bài viết đã được tạo thành công",
      })
      onOpenChange(false)
    } catch (e: any) {
      toast.error(isEditing ? "Lưu bài viết thất bại" : "Tạo bài viết thất bại", {
        description: e?.response?.data?.message || e?.userMessage || e?.message,
      })
    } finally {
      setUploadingCover(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="!w-full sm:!max-w-[900px] max-h-screen p-0 flex flex-col overflow-hidden">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle>{isEditing ? "Chỉnh sửa bài viết" : "Tạo bài viết mới"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Cập nhật thông tin và nội dung cho bài viết này."
              : "Điền thông tin và nội dung cho bài viết mới."}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6 space-y-6">
            {isEditing && isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Spinner />
              </div>
            ) : isEditing && (error || !blog) ? (
              <div className="p-8 text-center text-destructive">
                Không thể tải bài viết
              </div>
            ) : (
              <form id="blog-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="border-b pb-6">
                  <FieldGroup>
                    <FieldSet>
                      <FieldGroup>
                          <Controller
                            control={control}
                            name="title"
                            render={({ field, fieldState }) => (
                              <Field data-invalid={fieldState.invalid}>
                                <FieldLabel htmlFor={field.name} className="required">
                                  Tiêu đề bài viết
                                </FieldLabel>
                                <Input
                                  id={field.name}
                                  {...field}
                                  placeholder="Nhập tiêu đề bài viết..."
                                  autoComplete="off"
                                />
                                <FieldError errors={[fieldState.error]} />
                              </Field>
                            )}
                          />

                          <Controller
                            control={control}
                            name="excerpt"
                            render={({ field, fieldState }) => (
                              <Field data-invalid={fieldState.invalid}>
                                <FieldLabel htmlFor={field.name}>
                                  Mô tả ngắn
                                </FieldLabel>
                                <Textarea
                                  id={field.name}
                                  {...field}
                                  value={field.value || ""}
                                  placeholder="Tóm tắt nội dung bài viết..."
                                  rows={3}
                                  className="resize-none"
                                />
                                <FieldError errors={[fieldState.error]} />
                              </Field>
                            )}
                          />

                          <Controller
                            control={control}
                            name="status"
                            render={({ field, fieldState }) => (
                              <Field data-invalid={fieldState.invalid}>
                                <FieldLabel htmlFor={field.name}>
                                  Trạng thái đăng bài
                                </FieldLabel>
                                <Select
                                  value={field.value}
                                  onValueChange={field.onChange}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Chọn trạng thái" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={BlogStatus.DRAFT}>
                                      Bản nháp
                                    </SelectItem>
                                    <SelectItem value={BlogStatus.SCHEDULED}>
                                      Lên lịch
                                    </SelectItem>
                                    <SelectItem value={BlogStatus.PUBLISHED}>
                                      Đã đăng (Xuất bản)
                                    </SelectItem>
                                    {(isEditing &&
                                      (blog?.status?.toLowerCase() === BlogStatus.PUBLISHED ||
                                        blog?.status?.toLowerCase() === BlogStatus.ARCHIVED)) && (
                                      <SelectItem value={BlogStatus.ARCHIVED}>
                                        Đã lưu trữ
                                      </SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                                <FieldError errors={[fieldState.error]} />
                              </Field>
                            )}
                          />

                          {statusValue === BlogStatus.SCHEDULED && (
                            <Controller
                              control={control}
                              name="publishedAt"
                              render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                  <FieldLabel
                                    htmlFor={field.name}
                                    className="required"
                                  >
                                    Thời gian đăng bài
                                  </FieldLabel>
                                  <Input
                                    id={field.name}
                                    type="datetime-local"
                                    {...field}
                                    min={formatForDateTimeLocal(new Date())}
                                  />
                                  <FieldError
                                    errors={[fieldState.error]}
                                  />
                                </Field>
                              )}
                            />
                          )}

                          <Field>
                            <FieldLabel htmlFor="cover-image-upload">
                              Ảnh bìa (Tùy chọn)
                            </FieldLabel>
                            <div className="space-y-4">
                              <div className="flex items-center gap-3">
                                <Input
                                  id="cover-image-upload"
                                  type="file"
                                  accept="image/*"
                                  onChange={handleCoverImageChange}
                                  className="pt-2 file:text-foreground"
                                />
                                {(coverImageFile || coverImagePreview) && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="gap-2 border-red-500/30 text-red-600 bg-transparent hover:bg-red-50 hover:text-red-600"
                                    onClick={removeCoverImage}
                                    disabled={isSubmitting}
                                  >
                                    <X className="h-4 w-4" />
                                    Xóa ảnh
                                  </Button>
                                )}
                              </div>

                              {(coverImagePreview || coverImageFile) && (
                                <div className="relative rounded-lg overflow-hidden border border-border/50 aspect-video w-full">
                                  <img
                                    src={coverImagePreview || ""}
                                    alt="Bản xem trước"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                            </div>
                          </Field>
                      </FieldGroup>
                    </FieldSet>
                  </FieldGroup>
                </div>

                <div className="h-full min-h-[500px]">
                  <Controller
                    control={control}
                    name="content"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <RichTextEditor
                          value={field.value}
                          onChange={field.onChange}
                        />
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />
                </div>
              </form>
            )}
          </div>
        </ScrollArea>

        <div className="px-6 py-4 border-t flex justify-end gap-3 bg-muted/20 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="gap-2 border-slate-500/30 text-slate-700 bg-transparent hover:bg-slate-50 hover:text-slate-700"
          >
            <X className="size-4" />
            Hủy
          </Button>

          <Button
            type="submit"
            form="blog-form"
            disabled={isSubmitting}
            variant="outline"
            className="gap-2 border-primary/30 text-primary bg-transparent hover:bg-primary/5"
          >
            {isSubmitting ? (
              <Spinner className="mr-2" />
            ) : (
              <Save className="size-4" />
            )}
            {isEditing ? "Lưu bài viết" : "Tạo bài viết"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

