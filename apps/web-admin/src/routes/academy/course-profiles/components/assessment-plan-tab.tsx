import { useState, useEffect } from "react"
import { useAcademyAssessmentPlan, useUpdateAcademyAssessmentPlan } from "@/lib/api/services/academy-assessment-plans"
import { useAcademyExams } from "@/lib/api/services/academy-exams"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@workspace/ui/components/select"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@workspace/ui/components/table"
import { Plus, Trash2, GripVertical, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { AcademyAssessmentKind } from "@workspace/schemas"

interface AssessmentPlanTabProps {
  courseProfileId: string
  modules: any[]
}

export function AssessmentPlanTab({ courseProfileId, modules }: AssessmentPlanTabProps) {
  const { data: plan } = useAcademyAssessmentPlan(courseProfileId)
  const { data: exams } = useAcademyExams({ status: 'PUBLISHED' as any })
  const updateMutation = useUpdateAcademyAssessmentPlan()

  const [items, setItems] = useState<any[]>([])
  const [init, setInit] = useState(false)

  // Initialize and synchronize items from plan
  useEffect(() => {
    if (plan && (!init || items.length === 0)) {
      setItems(plan.map(p => ({
        id: p.id,
        examId: p.examId,
        assessmentKind: p.assessmentKind,
        moduleId: p.moduleId,
        triggerLessonId: p.triggerLessonId,
        orderIndex: p.orderIndex,
        isRequired: p.isRequired,
        isActive: p.isActive,
      })))
      setInit(true)
    }
  }, [plan, init])

  const addItem = () => {
    setItems([...items, {
      examId: "",
      assessmentKind: AcademyAssessmentKind.MODULE_CHECKPOINT,
      moduleId: modules[0]?.id,
      orderIndex: items.length,
      isRequired: true,
      isActive: true,
    }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items]
    const updatedItem = { ...newItems[index], [field]: value }

    // Clean up fields based on assessment kind
    if (field === "assessmentKind") {
      if (value === AcademyAssessmentKind.FINAL_EXAM) {
        updatedItem.moduleId = undefined
        updatedItem.triggerLessonId = undefined
      } else if (value === AcademyAssessmentKind.MODULE_CHECKPOINT) {
        updatedItem.triggerLessonId = undefined
      } else if (value === AcademyAssessmentKind.LESSON_CHECKPOINT) {
        updatedItem.moduleId = undefined
      }
    }

    newItems[index] = updatedItem
    setItems(newItems)
  }

  const handleSave = async () => {
    try {
      const invalidItem = items.find((item) => {
        if (!item.examId) return true
        if (item.assessmentKind === AcademyAssessmentKind.LESSON_CHECKPOINT) return !item.triggerLessonId
        if (item.assessmentKind === AcademyAssessmentKind.MODULE_CHECKPOINT) return !item.moduleId
        return false
      })

      if (invalidItem) {
        toast.error("Vui lòng chọn đầy đủ đề thi và vị trí kích hoạt cho từng milestone.")
        return
      }

      const cleanedItems = items.map((item, idx) => {
        const cleaned = { ...item, orderIndex: idx };
        if (cleaned.assessmentKind === AcademyAssessmentKind.FINAL_EXAM) {
          cleaned.moduleId = null;
          cleaned.triggerLessonId = null;
        } else if (cleaned.assessmentKind === AcademyAssessmentKind.MODULE_CHECKPOINT) {
          cleaned.moduleId = cleaned.moduleId ?? null;
          cleaned.triggerLessonId = null;
        } else if (cleaned.assessmentKind === AcademyAssessmentKind.LESSON_CHECKPOINT) {
          cleaned.moduleId = null;
        }
        return cleaned;
      });

      await updateMutation.mutateAsync({
        courseProfileId,
        items: cleanedItems,
      })
      toast.success("Cập nhật kế hoạch đánh giá thành công")
    } catch (error: any) {
      toast.error(error.message || "Đã có lỗi xảy ra")
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Kế hoạch đánh giá (Milestones)</CardTitle>
            <CardDescription>
              Thiết lập các bài thi/kiểm tra bắt buộc học viên phải vượt qua để tiếp tục tiến độ.
            </CardDescription>
          </div>
          <Button onClick={addItem} size="sm" className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Thêm Milestone
          </Button>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed rounded-lg text-slate-400">
              Chưa có mốc đánh giá nào được thiết lập.
            </div>
          ) : (
            <>
            <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead className="w-[250px]">Đề thi</TableHead>
                  <TableHead className="w-[150px]">Loại mốc</TableHead>
                  <TableHead>Vị trí kích hoạt (Sau bài/module)</TableHead>
                  <TableHead className="w-[100px]">Bắt buộc</TableHead>
                  <TableHead className="w-[80px] text-right">Xóa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell><GripVertical className="text-slate-300 w-4 h-4 cursor-grab" /></TableCell>
                    <TableCell>
                      <Select
                        value={item.examId}
                        onValueChange={(v) => updateItem(index, "examId", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn đề thi..." />
                        </SelectTrigger>
                        <SelectContent>
                          {exams?.map(e => (
                            <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={item.assessmentKind}
                        onValueChange={(v) => updateItem(index, "assessmentKind", v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={AcademyAssessmentKind.LESSON_CHECKPOINT}>Sau bài học</SelectItem>
                          <SelectItem value={AcademyAssessmentKind.MODULE_CHECKPOINT}>Sau mô-đun</SelectItem>
                          <SelectItem value={AcademyAssessmentKind.FINAL_EXAM}>Cuối khóa</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {item.assessmentKind === AcademyAssessmentKind.LESSON_CHECKPOINT ? (
                        <Select
                          value={item.triggerLessonId || ""}
                          onValueChange={(v) => updateItem(index, "triggerLessonId", v)}
                        >
                          <SelectTrigger className="w-full min-w-[200px]">
                            <SelectValue placeholder="Chọn bài học..." />
                          </SelectTrigger>
                          <SelectContent position="popper" className="max-h-[400px]">
                            {modules.map(m => (
                              <SelectGroup key={m.id}>
                                <SelectLabel className="bg-muted text-muted-foreground">{m.title}</SelectLabel>
                                {(m.lessons || []).map((l: any) => (
                                  <SelectItem key={l.id} value={l.id} className="pl-6">
                                    {l.title}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : item.assessmentKind === AcademyAssessmentKind.MODULE_CHECKPOINT ? (
                        <Select
                          value={item.moduleId || ""}
                          onValueChange={(v) => updateItem(index, "moduleId", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn module..." />
                          </SelectTrigger>
                          <SelectContent>
                            {modules.map(m => (
                              <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-slate-400 italic">Kích hoạt khi hoàn thành toàn bộ khóa học</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={item.isRequired}
                        onCheckedChange={(v) => updateItem(index, "isRequired", !!v)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-destructive border-destructive/40 hover:text-destructive hover:bg-destructive/5 font-medium"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                        Xóa
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>

            <div className="space-y-4 md:hidden">
              {items.map((item, index) => (
                <div key={index} className="space-y-3 rounded-xl border p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <GripVertical className="w-4 h-4" />
                      <span className="font-semibold uppercase">Milestone {index + 1}</span>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-8"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Xóa
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">Đề thi</p>
                    <Select
                      value={item.examId}
                      onValueChange={(v) => updateItem(index, "examId", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn đề thi..." />
                      </SelectTrigger>
                      <SelectContent>
                        {exams?.map(e => (
                          <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">Loại mốc</p>
                    <Select
                      value={item.assessmentKind}
                      onValueChange={(v) => updateItem(index, "assessmentKind", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={AcademyAssessmentKind.LESSON_CHECKPOINT}>Sau bài học</SelectItem>
                        <SelectItem value={AcademyAssessmentKind.MODULE_CHECKPOINT}>Sau mô-đun</SelectItem>
                        <SelectItem value={AcademyAssessmentKind.FINAL_EXAM}>Cuối khóa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">Vị trí kích hoạt</p>
                    {item.assessmentKind === AcademyAssessmentKind.LESSON_CHECKPOINT ? (
                      <Select
                        value={item.triggerLessonId || ""}
                        onValueChange={(v) => updateItem(index, "triggerLessonId", v)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Chọn bài học..." />
                        </SelectTrigger>
                        <SelectContent position="popper" className="max-h-[400px]">
                          {modules.map(m => (
                            <SelectGroup key={m.id}>
                              <SelectLabel className="bg-muted text-muted-foreground">{m.title}</SelectLabel>
                              {(m.lessons || []).map((l: any) => (
                                <SelectItem key={l.id} value={l.id} className="pl-6">
                                  {l.title}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : item.assessmentKind === AcademyAssessmentKind.MODULE_CHECKPOINT ? (
                      <Select
                        value={item.moduleId || ""}
                        onValueChange={(v) => updateItem(index, "moduleId", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn module..." />
                        </SelectTrigger>
                        <SelectContent>
                          {modules.map(m => (
                            <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm italic text-muted-foreground">
                        Kích hoạt khi hoàn thành toàn bộ khóa học
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={item.isRequired}
                      onCheckedChange={(v) => updateItem(index, "isRequired", !!v)}
                    />
                    <span className="text-sm">Bắt buộc hoàn thành</span>
                  </div>
                </div>
              ))}
            </div>
            </>
          )}

          <div className="mt-6 flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>Các mốc "Bắt buộc" sẽ chặn tiến độ học tập của luồng gói tự học cho đến khi hoàn thành.</span>
            </div>
            <Button onClick={handleSave} disabled={updateMutation.isPending} className="w-full sm:w-auto">
              Lưu kế hoạch đánh giá
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
