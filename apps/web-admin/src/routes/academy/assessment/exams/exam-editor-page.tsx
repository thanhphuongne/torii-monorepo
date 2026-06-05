import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { academyExamsApi, useAcademyExam, useCreateAcademyExam, useUpdateAcademyExam, useAddQuestionsToExam, useRemoveQuestionFromExam } from "@/lib/api/services/academy-exams"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@workspace/ui/components/select"
import { toast } from "sonner"
import { ArrowLeft, Save, Plus, Trash2, Clock, Info, Layout } from "lucide-react"
import { QuestionPickerModal } from "./components/question-picker-modal"
import { Badge } from "@workspace/ui/components/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card"
import { Label } from "@workspace/ui/components/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"

export default function AcademyExamEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEditing = !!id && id !== "new"

  const { data: exam, isLoading: isFetching } = useAcademyExam(isEditing ? id : undefined)
  const createMutation = useCreateAcademyExam()
  const updateMutation = useUpdateAcademyExam()

  const addQuestionsMutation = useAddQuestionsToExam()
  const removeQuestionMutation = useRemoveQuestionFromExam()

  const [pickerOpen, setPickerOpen] = useState(false)
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [removeTargetId, setRemoveTargetId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: "",
    examType: "QUIZ",
    status: "DRAFT",
    totalTimeLimitMinutes: 60,
  })
  const [localQuestions, setLocalQuestions] = useState<any[]>([]) 

  useEffect(() => {
    if (exam && isEditing) {
      setFormData({
        title: exam.title || "",
        examType: exam.examType || "QUIZ",
        status: exam.status || "DRAFT",
        totalTimeLimitMinutes: exam.totalTimeLimitMinutes || 60,
      })
    }
  }, [exam, isEditing])

  const handleAddQuestions = async (selectedQuestions: any[]) => {
    if (!isEditing) {
      // Local mode
      const mapped = selectedQuestions.map(q => ({
        id: `local-${q.id}`, // Temporary id for local display
        questionId: q.id,
        question: q,
        points: 1
      }))
      setLocalQuestions([...localQuestions, ...mapped])
      return
    }

    if (!selectedSectionId) return
    try {
      const questionIds = selectedQuestions.map(q => q.id)
      await addQuestionsMutation.mutateAsync({
        sectionId: selectedSectionId,
        questionIds,
        points: 1,
      })
      toast.success("Đã thêm câu hỏi vào bài thi")
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi thêm câu hỏi")
    }
  }

  const handleRemoveQuestion = async () => {
    if (!removeTargetId) return
    
    if (!isEditing) {
      setLocalQuestions(localQuestions.filter(q => q.id !== removeTargetId))
      setRemoveTargetId(null)
      return
    }

    try {
      await removeQuestionMutation.mutateAsync(removeTargetId)
      toast.success("Đã xóa câu hỏi")
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi xóa câu hỏi")
    } finally {
      setRemoveTargetId(null)
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    if (!formData.title.trim()) {
      toast.error("Vui lòng nhập tên bài thi")
      return null
    }

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: id!,
          dto: {
            ...formData,
          } as any,
        })
        toast.success("Cập nhật đề thi thành công")
        navigate("/academy/assessment/exams")
        return id
      } else {
        // Create Exam with initial section
        const newExam = await createMutation.mutateAsync({
          ...formData,
          sections: [
            {
              title: "Phần 1 - Trắc nghiệm",
              orderIndex: 0,
            }
          ],
          settings: {},
        } as any)

        // After creating the exam, if we have local questions, add them now
        if (localQuestions.length > 0 && newExam.sections?.[0]?.id) {
            const questionIds = localQuestions.map(q => q.questionId)
            await academyExamsApi.addQuestions({
                sectionId: newExam.sections[0].id,
                questionIds,
                points: 1
            })
        }

        toast.success("Tạo đề thi mới thành công")
        navigate("/academy/assessment/exams")
        return newExam
      }
    } catch (error: any) {
      toast.error(error.message || "Đã xảy ra lỗi")
      return null
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending 

  if (isEditing && isFetching) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 font-medium">Đang tải dữ liệu bài thi...</p>
      </div>
    )
  }

  const displaySections = isEditing && exam?.sections ? exam.sections : [
    { id: "new-placeholder", title: "Phần 1 - Trắc nghiệm", orderIndex: 0, questions: localQuestions }
  ]

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/academy/assessment/exams")} className="rounded-full">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {isEditing ? `Chỉnh Sửa: ${formData.title || "Bài thi"}` : "Tạo bài thi mới"}
            </h1>
            <p className="text-sm text-slate-500">Thiết lập thông tin và cấu trúc câu hỏi cho bài kiểm tra.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="default"
            size="lg"
            onClick={() => handleSubmit()}
            disabled={isPending}
            className="min-w-[160px] bg-sky-600 hover:bg-sky-700 shadow-md hover:shadow-lg transition-all duration-300"
          >
            {isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Đang lưu...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isEditing ? "Lưu thay đổi" : "Tạo Đề thi"}
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Info Column */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-sky-100 dark:bg-sky-900/30 rounded-lg text-sky-600 dark:text-sky-400">
                  <Info className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-lg">Thông tin cơ bản</CardTitle>
                  <CardDescription>Tiêu đề và nội dung giới thiệu bài thi</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tên bài thi *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value })
                  }}
                  placeholder="VD: Bài kiểm tra General English 1..."
                  className="text-lg font-medium h-12 focus-visible:ring-sky-500"
                  required
                />
              </div>


            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Layout className="w-5 h-5 text-slate-400" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Cấu trúc đề thi</h3>
            </div>

            {displaySections.map((section: any) => (
              <Card key={section.id} className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 border-b">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center border text-sm font-bold shadow-sm">
                      {section.orderIndex + 1}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">{section.title}</h4>
                      <p className="text-xs text-slate-500">{section.questions?.length || 0} câu hỏi</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (isEditing) {
                        setSelectedSectionId(section.id);
                      }
                      setPickerOpen(true);
                    }}
                    className="h-9 border-sky-200 text-sky-600 hover:bg-sky-50 hover:text-sky-700"
                    disabled={isPending}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Thêm câu hỏi
                  </Button>
                </div>

                <CardContent className="p-0">
                  {(!section.questions || section.questions.length === 0) ? (
                    <div className="p-12 text-center">
                      <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Plus className="w-6 h-6 text-slate-300" />
                      </div>
                      <p className="text-sm text-slate-400">Chưa có câu hỏi nào. Bấm "Thêm câu hỏi" để bắt đầu.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {section.questions.map((eq: any, idx: number) => (
                        <div key={eq.id} className="group flex p-4 gap-4 hover:bg-sky-50/30 dark:hover:bg-sky-900/10 transition-colors items-start">
                          <div className="font-bold text-slate-300 group-hover:text-sky-400 transition-colors pt-1 min-w-[20px]">
                            {idx + 1}.
                          </div>
                          <div className="flex-1 space-y-1.5">
                            <div className="font-medium text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                              {eq.question?.stem}
                            </div>
                            <div className="flex gap-2 items-center">
                              <Badge variant="secondary" className="text-[10px] h-5 py-0 font-normal bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-none uppercase">
                                {eq.question?.questionType?.replace('_', ' ')}
                              </Badge>
                              <Badge className="text-[10px] h-5 py-0 font-bold bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400">
                                {eq.points} điểm
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition-all"
                            onClick={() => setRemoveTargetId(eq.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Sidebar Settings Column */}
        <div className="space-y-6">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3 border-b bg-slate-50/30 dark:bg-slate-900/30">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                Thiết lập bài thi
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">Loại bài thi</Label>
                <Select
                  value={formData.examType}
                  onValueChange={(val) => {
                    setFormData({ ...formData, examType: val })
                  }}
                >
                  <SelectTrigger className="h-10 bg-white dark:bg-slate-950">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="QUIZ">Bài kiểm tra ngắn</SelectItem>
                    <SelectItem value="MODULE_TEST">Kiểm tra mô-đun</SelectItem>
                    <SelectItem value="FINAL_EXAM">Thi cuối kỳ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">Trạng thái</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => {
                    setFormData({ ...formData, status: val })
                  }}
                >
                  <SelectTrigger className="h-10 bg-white dark:bg-slate-950">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Bản nháp</SelectItem>
                    <SelectItem value="PUBLISHED">Hoạt động</SelectItem>
                    <SelectItem value="ARCHIVED">Lưu trữ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">Thời gian làm bài (Phút)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={formData.totalTimeLimitMinutes}
                    onChange={(e) => {
                      setFormData({ ...formData, totalTimeLimitMinutes: parseInt(e.target.value) || 0 })
                    }}
                    min={0}
                    className="h-10 pr-12 focus-visible:ring-sky-500"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">phút</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="p-5 rounded-2xl bg-sky-50 border border-sky-100 dark:bg-sky-900/10 dark:border-sky-900/20">
            <h4 className="text-sm font-bold text-sky-800 dark:text-sky-300 mb-2 flex items-center gap-2">
              💡 Mẹo nhỏ
            </h4>
            <ul className="text-xs text-sky-700/80 dark:text-sky-400/80 space-y-1.5 list-disc pl-4">
              <li>Đặt thời gian 0 để không giới hạn.</li>
              <li>Sử dụng trạng thái "Bản nháp" khi đang biên soạn đề.</li>
              <li>Lưu thông tin cơ bản trước khi thêm câu hỏi.</li>
            </ul>
          </div>
        </div>
      </div>

      <QuestionPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onConfirm={handleAddQuestions}
        existingQuestionIds={
          isEditing 
            ? exam?.sections?.flatMap(s => (s.questions || s.examQuestions)?.map((q: any) => q.question?.id || q.questionId) || []) || []
            : localQuestions.map(q => q.questionId)
        }
      />

      {/* Remove Question Confirmation */}
      <AlertDialog open={!!removeTargetId} onOpenChange={(o) => !o && setRemoveTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa câu hỏi khỏi bài thi?</AlertDialogTitle>
            <AlertDialogDescription>
              Câu hỏi sẽ bị gỡ khỏi đề thi này. Dữ liệu gốc trong ngân hàng câu hỏi không bị ảnh hưởng.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRemoveQuestion}
            >
              Xóa khỏi đề thi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
