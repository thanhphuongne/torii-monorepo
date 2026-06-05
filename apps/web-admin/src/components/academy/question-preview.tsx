import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"

interface QuestionPreviewProps {
    content: string
    questionType?: string
    options?: any
    correctAnswer?: any
    explanation?: string
    childrenQuestions?: Array<{
        id: string
        content: string
        questionType: string
        level?: string | null
        options?: any
        correctAnswer?: any
        explanation?: string | null
    }>
}

export function QuestionPreview({
    content,
    questionType = "SINGLE_CHOICE",
    options,
    correctAnswer,
    explanation,
    childrenQuestions,
}: QuestionPreviewProps) {
    const [selectedValues, setSelectedValues] = useState<string[]>([])
    const [checked, setChecked] = useState(false)

    const isMultiple = questionType === "MULTIPLE_CHOICE"
    const isGroup = questionType === "GROUP_PARENT"
    const supportsCheck = ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE"].includes(questionType)

    const normalizedOptions = useMemoOptions(options)
    const normalizedCorrect = useMemoCorrect(correctAnswer)

    const toggleOption = (val: string) => {
        if (!supportsCheck) return
        setChecked(false)
        if (isMultiple) {
            setSelectedValues(prev =>
                prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
            )
        } else {
            setSelectedValues([val])
        }
    }

    const handleCheck = () => {
        if (selectedValues.length === 0) return
        setChecked(true)
    }

    return (
        <div className="space-y-8 py-2">
            {/* Header/Type Badge */}
            <div className="flex items-center gap-2">
                <Badge variant="outline" className="px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wider bg-primary/5 text-primary border-primary/20">
                    {questionType.replace('_', ' ')}
                </Badge>
                {isGroup && (
                    <Badge variant="secondary" className="px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wider">
                        ĐÃ DÁN NHÃN ĐOẠN VĂN
                    </Badge>
                )}
            </div>

            {/* Main Content */}
            <div className="relative group">
                <div className="absolute -left-4 top-0 bottom-0 w-1 bg-primary/10 rounded-full group-hover:bg-primary/30 transition-colors" />
                <div
                    className="prose prose-lg dark:prose-invert max-w-none px-4 leading-relaxed text-foreground/90 select-none"
                    dangerouslySetInnerHTML={{ __html: content || "<i>Chưa có nội dung...</i>" }}
                />
            </div>

            {/* Options Section */}
            {!isGroup && normalizedOptions.length > 0 && (
                <div className="grid gap-4 mt-8">
                    {normalizedOptions.map((opt, i) => {
                        const isSelected = selectedValues.includes(opt.value)
                        const isCorrect = normalizedCorrect.includes(opt.value)
                        const status = checked
                            ? (isCorrect ? "correct" : (isSelected ? "wrong" : "idle"))
                            : (isSelected ? "selected" : "idle")

                        return (
                            <div
                                key={i}
                                className={cn(
                                    "flex items-center p-5 border-2 rounded-2xl transition-all duration-200 gap-5 cursor-pointer select-none",
                                    status === "idle" && "border-transparent bg-muted/30 hover:bg-muted/50 hover:border-primary/20",
                                    status === "selected" && "border-primary bg-primary/5 ring-4 ring-primary/5",
                                    status === "correct" && "border-green-600 bg-green-50 shadow-sm ring-4 ring-green-600/5",
                                    status === "wrong" && "border-destructive/50 bg-destructive/5 ring-4 ring-destructive/5"
                                )}
                                onClick={() => toggleOption(opt.value)}
                            >
                                <div className={cn(
                                    "size-12 rounded-xl border-2 flex items-center justify-center font-bold text-lg transition-all",
                                    status === "idle" && "border-muted-foreground/20 text-muted-foreground",
                                    status === "selected" && "bg-primary border-primary text-primary-foreground scale-110",
                                    status === "correct" && "bg-green-600 border-green-600 text-white scale-110",
                                    status === "wrong" && "bg-destructive border-destructive text-white scale-110"
                                )}>
                                    {opt.value}
                                </div>
                                <div className={cn(
                                    "flex-1 text-base font-semibold leading-snug",
                                    status === "selected" && "text-primary",
                                    status === "correct" && "text-green-700",
                                    status === "wrong" && "text-destructive"
                                )}>
                                    {opt.label}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Action Bar */}
            {supportsCheck && !isGroup && (
                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-dashed">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "size-2 rounded-full",
                            checked ? (selectedValues.every(v => normalizedCorrect.includes(v)) ? "bg-green-500 animate-pulse" : "bg-destructive") : "bg-primary/40"
                        )} />
                        <p className="text-sm font-medium text-muted-foreground italic">
                            {checked
                                ? (selectedValues.every(v => normalizedCorrect.includes(v)) && selectedValues.length === normalizedCorrect.length
                                    ? "Tuyệt vời! Bạn đã trả lời đúng."
                                    : "Rất tiếc, câu trả lời chưa chính xác.")
                                : "Chọn đáp án và kiểm tra kiến thức của mình."}
                        </p>
                    </div>
                    <Button size="lg" onClick={handleCheck} disabled={selectedValues.length === 0 || checked} className="rounded-xl px-8 shadow-lg shadow-primary/20">
                        Kiểm tra
                    </Button>
                </div>
            )}

            {/* Explanation */}
            {checked && explanation && (
                <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200/60 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline" className="bg-amber-100 text-amber-900 border-amber-300">Giải thích chi tiết</Badge>
                    </div>
                    <div
                        className="prose prose-sm dark:prose-invert max-w-none text-foreground/80 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: explanation }}
                    />
                </div>
            )}

            {/* Child Questions (for Group Parent) */}
            {isGroup && childrenQuestions && childrenQuestions.length > 0 && (
                <div className="space-y-10 pt-8 border-t-2 border-dashed">
                    <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xl flex items-center gap-3 text-foreground/80">
                            Danh sách câu hỏi con
                            <Badge className="bg-primary/10 text-primary border-none text-sm px-3">{childrenQuestions.length}</Badge>
                        </h4>
                    </div>
                    <div className="space-y-12">
                        {childrenQuestions.map((child, idx) => (
                            <div key={child.id} className="relative pl-8 border-l-4 border-muted/50 hover:border-primary/50 transition-colors pt-2 pb-6">
                                <div className="absolute -left-[14px] top-0 size-6 rounded-full bg-primary flex items-center justify-center text-[10px] font-black text-white shadow-md">
                                    {idx + 1}
                                </div>

                                <QuestionPreview
                                    content={child.content}
                                    questionType={child.questionType}
                                    options={child.options}
                                    correctAnswer={child.correctAnswer}
                                    explanation={child.explanation ?? undefined}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

function useMemoOptions(options: any) {
    if (!Array.isArray(options)) return []
    return options.map((opt, i) => {
        if (typeof opt === "string") return { value: String.fromCharCode(65 + i), label: opt }
        return {
            value: opt.value || String.fromCharCode(65 + i),
            label: opt.label || ""
        }
    })
}

function useMemoCorrect(correct: any) {
    if (correct == null) return []
    if (Array.isArray(correct)) return correct.map(v => typeof v === 'object' ? v.value : String(v))
    if (typeof correct === 'object' && correct.value) return [String(correct.value)]
    return [String(correct)]
}
