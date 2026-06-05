import { useState } from "react"
import {
  useAcademyQuestions,
} from "@/lib/api/services/academy-questions"
import { PageHeader } from "@/components/common/page-header"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@workspace/ui/components/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@workspace/ui/components/select"
import { Badge } from "@workspace/ui/components/badge"
import { Plus, Search, Pencil, Trash2, FileAudio, Image as ImageIcon } from "lucide-react"
import { AcademyQuestionCategoryType } from "@workspace/schemas"
import { QuestionEditor } from "./components/question-editor"
import { DeleteQuestionDialog } from "./components/delete-question-dialog"
import { format } from "date-fns"
import {
  dataTableShellClass,
  dataTableHeaderClass,
  listPageFiltersRowClass,
  listPageSearchIconClass,
  listPageSearchInputClass,
  listPageSearchWrapClass,
  listPageToolbarRootClass,
} from "@/lib/ui-shell"
import { cn } from "@workspace/ui/lib/utils"

export default function QuestionsPage() {
  const [search, setSearch] = useState("")
  const [level, setLevel] = useState<string>("ALL")
  const [categoryType, setCategoryType] = useState<string>("ALL")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null)
  const [questionToDelete, setQuestionToDelete] = useState<{ id: string; stem: string } | null>(null)

  const { data: questions, isLoading } = useAcademyQuestions({
    q: search || undefined,
    level: level === "ALL" ? undefined : level,
    categoryType: categoryType === "ALL" ? undefined : (categoryType as AcademyQuestionCategoryType),
  })

  const handleDelete = (question: any) => {
    setQuestionToDelete({ id: question.id, stem: question.stem })
  }

  const handleEdit = (question: any) => {
    setSelectedQuestion(question)
    setEditingId(question.id)
    setEditorOpen(true)
  }

  const handleCreate = () => {
    setSelectedQuestion(null)
    setEditingId(null)
    setEditorOpen(true)
  }

  const levelBadge = (lvl?: string | null) => {
    if (!lvl) return <span className="text-muted-foreground opacity-30">—</span>
    const code = lvl.toUpperCase()
    if (code === "N1")
      return (
        <Badge
          variant="outline"
          className="text-[10px] font-bold border-rose-500/40 text-rose-600 bg-rose-500/5"
        >
          N1
        </Badge>
      )
    if (code === "N2")
      return (
        <Badge
          variant="outline"
          className="text-[10px] font-bold border-orange-500/40 text-orange-600 bg-orange-500/5"
        >
          N2
        </Badge>
      )
    if (code === "N3")
      return (
        <Badge
          variant="outline"
          className="text-[10px] font-bold border-amber-500/40 text-amber-600 bg-amber-500/5"
        >
          N3
        </Badge>
      )
    if (code === "N4")
      return (
        <Badge
          variant="outline"
          className="text-[10px] font-bold border-emerald-500/40 text-emerald-600 bg-emerald-500/5"
        >
          N4
        </Badge>
      )
    if (code === "N5")
      return (
        <Badge
          variant="outline"
          className="text-[10px] font-bold border-sky-500/40 text-sky-600 bg-sky-500/5"
        >
          N5
        </Badge>
      )
    return (
      <Badge variant="secondary" className="text-[10px] font-bold">
        {code}
      </Badge>
    )
  }

  const categoryTypeLabel: Record<string, string> = {
    [AcademyQuestionCategoryType.VOCABULARY]: "Từ vựng",
    [AcademyQuestionCategoryType.GRAMMAR]: "Ngữ pháp",
    [AcademyQuestionCategoryType.KANJI]: "Kanji",
    [AcademyQuestionCategoryType.READING]: "Đọc hiểu",
    [AcademyQuestionCategoryType.LISTENING]: "Nghe hiểu",
  }

  /** Bảng chỉ cần preview: bỏ thẻ HTML/Markdown để text xuống dòng đúng (TableCell mặc định nowrap). */
  const stemPreviewPlain = (stem: string | null | undefined) => {
    if (!stem?.trim()) return "—"
    const plain = stem.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
    return plain || "—"
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ngân hàng câu hỏi"
        subtitle="Quản lý thư viện câu hỏi dùng chung cho các bài thi và kiểm tra."
        stats={[
          { label: "Tổng câu hỏi", value: questions?.length ?? 0 },
        ]}
        actions={
          <div className="flex gap-2">
            <Button size="sm" className="gap-2 shadow-sm" onClick={handleCreate}>
              <Plus className="h-4 w-4" />
              Thêm câu hỏi
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className={listPageToolbarRootClass}>
        <div className={listPageSearchWrapClass}>
          <Search className={listPageSearchIconClass} />
          <Input
            placeholder="Tìm kiếm nội dung câu hỏi..."
            className={listPageSearchInputClass}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className={listPageFiltersRowClass}>
        <div className="w-full md:w-[150px]">
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Mọi cấp độ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Mọi cấp độ</SelectItem>
              <SelectItem value="N1">N1</SelectItem>
              <SelectItem value="N2">N2</SelectItem>
              <SelectItem value="N3">N3</SelectItem>
              <SelectItem value="N4">N4</SelectItem>
              <SelectItem value="N5">N5</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-full md:w-[180px]">
          <Select value={categoryType} onValueChange={setCategoryType}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Mọi nhóm câu hỏi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Mọi nhóm câu hỏi</SelectItem>
              <SelectItem value={AcademyQuestionCategoryType.VOCABULARY}>Từ vựng</SelectItem>
              <SelectItem value={AcademyQuestionCategoryType.GRAMMAR}>Ngữ pháp</SelectItem>
              <SelectItem value={AcademyQuestionCategoryType.KANJI}>Kanji</SelectItem>
              <SelectItem value={AcademyQuestionCategoryType.READING}>Đọc hiểu</SelectItem>
              <SelectItem value={AcademyQuestionCategoryType.LISTENING}>Nghe hiểu</SelectItem>
            </SelectContent>
          </Select>
        </div>
        </div>
      </div>

      {/* Table — mobile: cuộn ngang, cột câu hỏi min-width rộng để giảm đoạn dọc */}
      <div className={cn(dataTableShellClass, "overflow-x-auto")}>
        <Table className="w-full min-w-[44rem] table-fixed">
          <colgroup>
            <col className="w-[52px]" />
            <col className="w-[42%]" />
            <col className="w-24" />
            <col className="w-28" />
            <col className="w-24" />
            <col className="w-28" />
            <col className="w-[220px]" />
          </colgroup>
          <TableHeader className={dataTableHeaderClass}>
            <TableRow>
              <TableHead className="w-[52px] shrink-0 text-center">#</TableHead>
              <TableHead className="pl-4 text-left whitespace-normal">
                Câu hỏi
              </TableHead>
              <TableHead className="whitespace-nowrap">Cấp độ</TableHead>
              <TableHead className="whitespace-nowrap">Nhóm</TableHead>
              <TableHead className="w-[90px] shrink-0 text-center">Media</TableHead>
              <TableHead className="whitespace-nowrap">Ngày tạo</TableHead>
              <TableHead className="w-[200px] shrink-0 text-right pr-4">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  Đang tải dữ liệu...
                </TableCell>
              </TableRow>
            ) : !questions?.length ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground italic">
                  Không tìm thấy câu hỏi nào
                </TableCell>
              </TableRow>
            ) : (
              questions.map((q, idx) => (
                <TableRow key={q.id} className="hover:bg-muted/10">
                  <TableCell className="text-center font-medium text-muted-foreground/60 tabular-nums text-xs">
                    {idx + 1}
                  </TableCell>
                  <TableCell className="py-3 pl-4 align-top font-medium whitespace-normal [word-break:break-word]">
                    <div className="text-left text-sm leading-relaxed text-foreground">
                      {stemPreviewPlain(q.stem)}
                    </div>
                  </TableCell>
                  <TableCell>{levelBadge(q.level)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px] font-bold">
                      {q.categoryType ? (categoryTypeLabel[q.categoryType] || q.categoryType) : "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {q.mediaUrl ? (
                      <span className="inline-flex items-center justify-center rounded-full border bg-muted/40 px-2 py-1 text-[10px] font-medium text-muted-foreground gap-1">
                        {/\.(mp3|wav|m4a|aac|ogg)$/i.test(q.mediaUrl) ? (
                          <FileAudio className="h-3 w-3" />
                        ) : (
                          <ImageIcon className="h-3 w-3" />
                        )}
                        <span>Đã có</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/60">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(q.createdAt), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => handleEdit(q)}
                      >
                        <Pencil className="h-4 w-4" />
                        Sửa
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => handleDelete(q)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Xóa
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Question Editor */}
      <QuestionEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        questionId={editingId || undefined}
        initialData={selectedQuestion}
      />

      {/* Delete Question Dialog */}
      <DeleteQuestionDialog
        open={!!questionToDelete}
        onOpenChange={(open) => !open && setQuestionToDelete(null)}
        question={questionToDelete}
      />
    </div>
  )
}
