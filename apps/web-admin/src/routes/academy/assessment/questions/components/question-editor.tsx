import { useEffect, useState, type ChangeEvent } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  useCreateAcademyQuestion,
  useUpdateAcademyQuestion,
  type AcademyQuestion,
} from "@/lib/api/services/academy-questions"
import {
  academyQuestionCreateDTOSchema,
  type AcademyQuestionCreateDTO,
  AcademyQuestionCategoryType,
  AcademyQuestionType,
} from "@workspace/schemas"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@workspace/ui/components/sheet"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"

import { CheckCircle2, Loader2, Upload, Image as ImageIcon, FileAudio, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@workspace/ui/lib/utils"
import { storageApi } from "@/lib/api/services/storage-api"

interface QuestionEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  questionId?: string
  initialData?: AcademyQuestion | null
}

const OPTION_KEYS = ["A", "B", "C", "D"]

const defaultOptions = OPTION_KEYS.map((key, i) => ({
  optionKey: key,
  content: "",
  isCorrect: i === 0,
  orderIndex: i,
}))

export function QuestionEditor({ open, onOpenChange, questionId, initialData }: QuestionEditorProps) {
  const createMutation = useCreateAcademyQuestion()
  const updateMutation = useUpdateAcademyQuestion()
  const [uploadingMedia, setUploadingMedia] = useState(false)

  const form = useForm<AcademyQuestionCreateDTO>({
    resolver: zodResolver(academyQuestionCreateDTOSchema) as any,
    defaultValues: {
      stem: "",
      questionType: AcademyQuestionType.SINGLE_CHOICE,
      level: "N3",
      categoryType: AcademyQuestionCategoryType.GRAMMAR,
      explanation: "",
      mediaUrl: "",
      options: defaultOptions,
    },
  })

  const { fields } = useFieldArray({ control: form.control, name: "options" })
  const selectedCategory = form.watch("categoryType")
  const mediaUrl = form.watch("mediaUrl")
  const isListening = selectedCategory === AcademyQuestionCategoryType.LISTENING

  useEffect(() => {
    if (open) {
      if (initialData) {
        const opts = [...(initialData.options?.map(o => ({
          optionKey: o.optionKey,
          content: o.content,
          isCorrect: o.isCorrect,
          orderIndex: o.orderIndex,
        })) || [])]
        while (opts.length < 4) {
          opts.push({ optionKey: OPTION_KEYS[opts.length], content: "", isCorrect: false, orderIndex: opts.length })
        }
        form.reset({
          stem: initialData.stem,
          questionType: AcademyQuestionType.SINGLE_CHOICE,
          level: initialData.level || "N3",
          categoryType: (initialData.categoryType as AcademyQuestionCategoryType) || AcademyQuestionCategoryType.GRAMMAR,
          explanation: initialData.explanation || "",
          mediaUrl: initialData.mediaUrl || "",
          options: opts.slice(0, 4),
        })
      } else {
        form.reset({
          stem: "",
          questionType: AcademyQuestionType.SINGLE_CHOICE,
          level: "N3",
          categoryType: AcademyQuestionCategoryType.GRAMMAR,
          explanation: "",
          mediaUrl: "",
          options: defaultOptions,
        })
      }
    }
  }, [initialData, open, form])

  const onSubmit = async (data: any) => {
    if (!data.options?.some((o: any) => o.isCorrect)) {
      toast.error("Vui lòng chọn ít nhất một đáp án đúng")
      return
    }
    const payload = {
      ...data,
      questionType: AcademyQuestionType.SINGLE_CHOICE,
      options: data.options.map((o: any) => ({ ...o, isCorrect: !!o.isCorrect })),
    }
    try {
      if (questionId) {
        await updateMutation.mutateAsync({ id: questionId, dto: payload })
        toast.success("Cập nhật câu hỏi thành công")
      } else {
        await createMutation.mutateAsync(payload)
        toast.success("Tạo câu hỏi thành công")
      }
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.userMessage || error.message || "Đã có lỗi xảy ra")
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  const mediaLabel = isListening ? "Audio câu hỏi" : "Hình ảnh minh họa"
  const mediaAccept = isListening ? "audio/*" : "image/*"
  const mediaHint = isListening
    ? "Tải file nghe cho câu hỏi dạng Listening (mp3, wav, m4a...)."
    : "Tải ảnh minh họa cho câu hỏi (png, jpg, webp...)."

  const handleMediaUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      setUploadingMedia(true)
      const uploaded = await storageApi.uploadFile(file, "academy-question-bank")
      form.setValue("mediaUrl", uploaded.fileUrl || "", { shouldDirty: true })
      toast.success(`Đã tải lên ${isListening ? "audio" : "hình ảnh"} thành công`)
    } catch {
      toast.error("Tải file thất bại")
    } finally {
      setUploadingMedia(false)
      event.target.value = ""
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex h-full max-h-[100dvh] w-full min-w-0 max-w-[100vw] flex-col gap-0 overflow-hidden p-0 sm:!max-w-[800px]">
        <SheetHeader className="p-6 border-b shrink-0">
          <SheetTitle>
            {questionId ? "Chỉnh sửa câu hỏi" : "Thêm câu hỏi mới"}
          </SheetTitle>
          <SheetDescription>
            {questionId
              ? "Chỉnh sửa nội dung câu hỏi trắc nghiệm."
              : "Tạo câu hỏi trắc nghiệm 4 đáp án cho ngân hàng câu hỏi."}
          </SheetDescription>
        </SheetHeader>

        {/* Cuộn native + overflow-x-hidden — chỉ sheet ngân hàng câu hỏi; tránh khối media/ảnh làm tràn ngang */}
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
          <div className="min-w-0 max-w-full space-y-6 p-6">
          <form id="question-editor-form" onSubmit={form.handleSubmit(onSubmit)} className="min-w-0 max-w-full space-y-6">

            {/* Nội dung câu hỏi */}
            <div className="min-w-0 max-w-full space-y-2">
              <Label className="text-sm font-semibold">
                Nội dung câu hỏi <span className="text-destructive">*</span>
              </Label>
              <RichTextEditor
                value={form.watch("stem")}
                onChange={(val) => form.setValue("stem", val, { shouldDirty: true })}
                placeholder="Nhập nội dung câu hỏi..."
                minHeight={150}
              />
              {form.formState.errors.stem && (
                <p className="text-destructive text-xs">{form.formState.errors.stem.message}</p>
              )}
            </div>

            {/* Cấp độ (JLPT) + Nhóm câu hỏi */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Cấp độ (JLPT)</Label>
                <Select
                  value={form.watch("level")}
                  onValueChange={(v) => form.setValue("level", v)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="N1">N1</SelectItem>
                    <SelectItem value="N2">N2</SelectItem>
                    <SelectItem value="N3">N3</SelectItem>
                    <SelectItem value="N4">N4</SelectItem>
                    <SelectItem value="N5">N5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Nhóm câu hỏi</Label>
                <Select
                  value={(form.watch("categoryType") as string) || AcademyQuestionCategoryType.GRAMMAR}
                  onValueChange={(v) => form.setValue("categoryType", v as AcademyQuestionCategoryType)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={AcademyQuestionCategoryType.VOCABULARY}>Từ vựng</SelectItem>
                    <SelectItem value={AcademyQuestionCategoryType.GRAMMAR}>Ngữ pháp</SelectItem>
                    <SelectItem value={AcademyQuestionCategoryType.KANJI}>Kanji</SelectItem>
                    <SelectItem value={AcademyQuestionCategoryType.READING}>Đọc hiểu</SelectItem>
                    <SelectItem value={AcademyQuestionCategoryType.LISTENING}>Nghe hiểu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Media — tách khối scroll; không lồng control tương tác trong <button> (ô đáp án) */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">{mediaLabel}</Label>
              <div className="isolate min-w-0 max-w-full space-y-3 overflow-hidden rounded-lg border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">{mediaHint}</p>
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <Input
                    type="file"
                    accept={mediaAccept}
                    onChange={handleMediaUpload}
                    disabled={uploadingMedia || isPending}
                    className="max-w-full sm:max-w-sm"
                  />
                  {uploadingMedia && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
                {mediaUrl ? (
                  <div className="min-w-0 max-w-full overflow-hidden rounded-md border bg-background p-2.5">
                    <div className="flex min-w-0 max-w-full items-center justify-between gap-2">
                      <div className="flex min-w-0 max-w-full flex-1 items-center gap-2 overflow-hidden">
                        {isListening ? (
                          <FileAudio className="h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <a
                          href={mediaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="min-w-0 truncate break-all text-xs text-primary hover:underline"
                          title={mediaUrl}
                        >
                          {mediaUrl}
                        </a>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => form.setValue("mediaUrl", "", { shouldDirty: true })}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {isListening ? (
                      <div className="mt-2 max-w-full overflow-hidden rounded-md border bg-muted/20 p-2">
                        <audio controls className="w-full max-w-full" src={mediaUrl} />
                      </div>
                    ) : (
                      <div className="mt-2 w-full min-w-0 max-w-full overflow-hidden rounded-md border bg-muted/20 p-2">
                        <img
                          src={mediaUrl}
                          alt="Xem trước media"
                          decoding="async"
                          className="mx-auto block h-auto max-h-44 w-full min-w-0 max-w-full rounded-md object-contain"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-md border border-dashed p-2.5 text-xs text-muted-foreground">
                    <Upload className="h-4 w-4" />
                    Chưa có media.
                  </div>
                )}
              </div>
            </div>

            {/* Đáp án - 2x2 grid */}
            <div className="space-y-2">
              <div>
                <Label className="text-sm font-semibold">
                  Các đáp án <span className="text-destructive">*</span>
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Bấm vào ô để đánh dấu đáp án đúng
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {fields.map((field, index) => {
                  const isCorrect = form.watch(`options.${index}.isCorrect`)
                  return (
                    <div
                      key={field.id}
                      onClick={() => {
                        fields.forEach((_, i) => form.setValue(`options.${i}.isCorrect`, i === index))
                      }}
                      className={cn(
                        "flex min-w-0 cursor-pointer items-center gap-3 rounded-lg border p-3 text-left transition-all",
                        isCorrect
                          ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                          : "border-border bg-card hover:border-muted-foreground/30"
                      )}
                    >
                      <div className={cn(
                        "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors",
                        isCorrect
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "border-muted-foreground/30 text-muted-foreground"
                      )}>
                        {isCorrect ? <CheckCircle2 className="w-4 h-4" /> : field.optionKey}
                      </div>
                      <Input
                        className="min-h-0 flex-1 border-none bg-transparent px-0 text-sm font-medium shadow-none h-8 placeholder:text-muted-foreground/40 focus-visible:ring-0"
                        placeholder={`Nhập đáp án ${field.optionKey}...`}
                        {...form.register(`options.${index}.content`)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Giải thích (tùy chọn) */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                Giải thích đáp án{" "}
                <span className="text-muted-foreground font-normal">(tùy chọn)</span>
              </Label>
              <RichTextEditor
                value={form.watch("explanation") ?? ""}
                onChange={(val) => form.setValue("explanation", val, { shouldDirty: true })}
                placeholder="Giải thích ngắn gọn tại sao đây là đáp án đúng..."
                minHeight={120}
              />
            </div>

          </form>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-muted/30 shrink-0 flex items-center justify-between">
          <p className="text-xs text-muted-foreground"></p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              form="question-editor-form"
              disabled={isPending || uploadingMedia}
              className="min-w-[120px]"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {isPending ? "Đang xử lý..." : questionId ? "Lưu thay đổi" : "Tạo câu hỏi"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
