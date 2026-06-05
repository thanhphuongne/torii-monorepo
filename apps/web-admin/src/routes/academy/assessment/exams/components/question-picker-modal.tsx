import { useState } from "react"
import { useAcademyQuestions } from "@/lib/api/services/academy-questions"
import { AcademyQuestionCategoryType } from "@workspace/schemas"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@workspace/ui/components/dialog"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@workspace/ui/components/table"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Badge } from "@workspace/ui/components/badge"
import { Search, Check } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import {
  listPageSearchIconClass,
  listPageSearchInputClass,
  listPageSearchWrapClass,
} from "@/lib/ui-shell"

interface QuestionPickerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (questions: any[]) => Promise<void>
  existingQuestionIds?: string[]
}

export function QuestionPickerModal({
  open,
  onOpenChange,
  onConfirm,
  existingQuestionIds = []
}: QuestionPickerModalProps) {
  const [search, setSearch] = useState("")
  const [level, setLevel] = useState<string>("ALL")
  const [categoryType, setCategoryType] = useState<string>("ALL")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch questions from question bank
  const { data: questions, isLoading } = useAcademyQuestions({
    q: search || undefined,
    level: level === "ALL" ? undefined : level,
    categoryType: categoryType === "ALL" ? undefined : (categoryType as AcademyQuestionCategoryType),
  })

  const existingIdsSet = new Set(existingQuestionIds)

  // Handle individual checkbox toggle
  const toggleQuestion = (id: string) => {
    if (existingIdsSet.has(id)) return

    const nextSelected = new Set(selectedIds)
    if (nextSelected.has(id)) {
      nextSelected.delete(id)
    } else {
      nextSelected.add(id)
    }
    setSelectedIds(nextSelected)
  }

  // Handle select all toggle
  const toggleAll = () => {
    if (!questions) return
    
    // Filter out already existing questions when selecting all
    const availableQuestions = questions.filter(q => !existingIdsSet.has(q.id))
    
    if (selectedIds.size === availableQuestions.length && availableQuestions.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(availableQuestions.map((q) => q.id)))
    }
  }

  const handleConfirm = async () => {
    if (selectedIds.size === 0) return
    try {
      setIsSubmitting(true)
      const selectedQuestions = questions?.filter(q => selectedIds.has(q.id)) || []
      await onConfirm(selectedQuestions)
      setSelectedIds(new Set())
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Chọn câu hỏi từ Ngân hàng</DialogTitle>
          <DialogDescription>
            Tìm kiếm và chọn các câu hỏi bạn muốn thêm vào bài thi
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="flex flex-wrap gap-3 items-center">
            <div className={cn(listPageSearchWrapClass, "min-w-[200px] flex-1")}>
              <Search className={listPageSearchIconClass} />
              <Input
                placeholder="Tìm kiếm nội dung câu hỏi..."
                className={listPageSearchInputClass}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-[150px]">
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger>
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
            <div className="w-[180px]">
              <Select value={categoryType} onValueChange={setCategoryType}>
                <SelectTrigger>
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

          <div className="border rounded-md overflow-hidden bg-white dark:bg-slate-900 flex-1 overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-white dark:bg-slate-900 border-b z-10">
                <TableRow>
                  <TableHead className="w-[60px] text-center">#</TableHead>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={
                        questions && 
                        questions.length > 0 && 
                        questions.filter(q => !existingIdsSet.has(q.id)).length > 0 &&
                        selectedIds.size === questions.filter(q => !existingIdsSet.has(q.id)).length
                      }
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead className="w-[420px]">Nội dung câu hỏi</TableHead>
                  <TableHead className="w-[150px]">Loại</TableHead>
                  <TableHead className="w-[100px]">Cấp độ</TableHead>
                  <TableHead className="w-[140px]">Nhóm</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-slate-400">Đang tải câu hỏi...</TableCell>
                  </TableRow>
                ) : questions && questions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-slate-400">Không tìm thấy câu hỏi phù hợp</TableCell>
                  </TableRow>
                ) : (
                  questions?.map((q, idx) => {
                    const isAlreadyInExam = existingIdsSet.has(q.id)
                    return (
                      <TableRow key={q.id} className={isAlreadyInExam ? "opacity-50 bg-slate-50/50" : ""}>
                        <TableCell className="text-center font-medium text-muted-foreground/60 tabular-nums text-xs">
                          {idx + 1}
                        </TableCell>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(q.id)}
                            onCheckedChange={() => toggleQuestion(q.id)}
                            disabled={isAlreadyInExam}
                          />
                        </TableCell>
                        <TableCell className="font-medium max-w-[420px]">
                          <div className="flex flex-col gap-1">
                            <div className="whitespace-normal break-words">{q.stem}</div>
                            {isAlreadyInExam && (
                              <div className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                                <Check className="w-3 h-3" /> Đã có trong bài thi
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{q.questionType}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-bold border-blue-200 text-blue-700 bg-blue-50/50">
                            {q.level || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px] font-bold">
                            {q.categoryType || "—"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between pt-4 border-t mt-auto">
            <div className="text-sm text-slate-500">
              Đã chọn {selectedIds.size} câu hỏi mới
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Hủy bỏ
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={selectedIds.size === 0 || isSubmitting}
              >
                Thêm vào bài thi
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
