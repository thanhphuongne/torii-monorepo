import { Link } from "react-router-dom"
import {
    Field,
    FieldDescription,
    FieldError,
    FieldLabel,
} from "@workspace/ui/components/field"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select"
import { useAcademyExams, useAcademyExam } from "@/lib/api/services/academy-exams"
import { AcademyExamStatus } from "@workspace/schemas"
import { AlertCircle, ExternalLink, PlusCircle } from "lucide-react"

interface ClassQuizSourcePickerProps {
    courseProfileId?: string
    examId?: string
    onExamChange: (examId: string) => void
    error?: string
}

export function ClassQuizSourcePicker({
    courseProfileId,
    examId,
    onExamChange,
    error,
}: ClassQuizSourcePickerProps) {
    const { data: exams = [], isLoading } = useAcademyExams(
        courseProfileId 
            ? { courseProfileId, status: AcademyExamStatus.PUBLISHED } 
            : { status: AcademyExamStatus.PUBLISHED }
    )

    const { data: selectedExamDetail } = useAcademyExam(examId)

    return (
        <div className="space-y-4">
            <Field>
                <FieldLabel>Đề thi liên kết</FieldLabel>
                <Select
                    value={examId || ""}
                    onValueChange={onExamChange}
                    disabled={isLoading}
                >
                    <SelectTrigger>
                        <SelectValue placeholder={isLoading ? "Đang tải danh sách đề thi..." : "Chọn một đề thi đã công khai..."} />
                    </SelectTrigger>
                    <SelectContent>
                        {exams.length === 0 && !isLoading ? (
                            <div className="p-2 text-sm text-muted-foreground text-center">
                                Không tìm thấy đề thi đã công khai cho khóa học này.
                            </div>
                        ) : (
                            exams.map((exam) => (
                                <SelectItem key={exam.id} value={exam.id}>
                                    {exam.title}
                                </SelectItem>
                            ))
                        )}
                    </SelectContent>
                </Select>
                <FieldDescription>
                    Mọi thiết lập về nhóm câu hỏi và câu hỏi được quản lý tập trung tại trang đề thi.
                </FieldDescription>
                <FieldError>{error}</FieldError>
            </Field>

            <div className="flex flex-wrap items-center gap-4 text-xs">
                {examId ? (
                    <Link
                        to={`/academy/exams/${examId}`}
                        className="flex items-center gap-1 text-primary hover:underline font-medium"
                        target="_blank"
                    >
                        <ExternalLink className="size-3" />
                        Mở đề thi để chỉnh sửa nhóm câu hỏi/câu hỏi
                    </Link>
                ) : (
                    <Link
                        to="/academy/exams/new"
                        className="flex items-center gap-1 text-primary hover:underline font-medium"
                        target="_blank"
                    >
                        <PlusCircle className="size-3" />
                        Tạo đề thi mới cho khóa học
                    </Link>
                )}
            </div>

            {!examId && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/5 text-destructive border border-destructive/10 text-xs">
                    <AlertCircle className="size-4 shrink-0 mt-0.5" />
                    <p>
                        <strong>Cảnh báo:</strong> Bài kiểm tra này chưa liên kết với đề thi nào.
                        Học viên sẽ không thấy câu hỏi cho tới khi bạn chọn một đề thi hợp lệ.
                    </p>
                </div>
            )}

            {selectedExamDetail && (
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                        <h4 className="text-sm font-semibold">Xem trước cấu trúc đề: {selectedExamDetail.title}</h4>
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase font-bold">
                            {selectedExamDetail.status}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                            <p className="text-muted-foreground">Số phần thi</p>
                            <p className="font-medium">{selectedExamDetail.sections?.length || 0}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Tổng số câu hỏi</p>
                            <p className="font-medium">{selectedExamDetail.examQuestions?.length || 0}</p>
                        </div>
                    </div>

                    {Array.isArray(selectedExamDetail.sections) && selectedExamDetail.sections.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Chi tiết từng phần:</p>
                            {selectedExamDetail.sections.map((section: any) => {
                                const count = Array.isArray(selectedExamDetail.examQuestions)
                                    ? selectedExamDetail.examQuestions.filter((q: any) => q.sectionId === section.id).length
                                    : 0
                                return (
                                    <div key={section.id} className="flex justify-between text-xs py-1 border-b border-muted last:border-0">
                                        <span>{section.title}</span>
                                        <span className="text-muted-foreground">{count} câu hỏi</span>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
