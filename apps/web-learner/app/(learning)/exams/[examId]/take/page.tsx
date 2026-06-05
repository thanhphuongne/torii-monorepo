'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from "@workspace/ui/components/button"
import { Sheet, SheetContent, SheetTrigger } from "@workspace/ui/components/sheet"
import { Menu, X } from "lucide-react"

import { ExamTimer } from "@/components/exams/take/exam-timer"
import { QuestionArea, Question } from "@/components/exams/take/question-area"
import { QuestionNavigator } from "@/components/exams/take/question-navigator"
import { academyExamsApi } from "@/lib/api/services/academy-exam-api"
import { useAppSelector } from "@/hooks/hooks"
import { RootState } from "@/store/store"
import { PageLoading } from "@workspace/ui/components/page-loading"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { toast } from "@workspace/ui/components/sonner"
import { Empty, EmptyContent, EmptyMedia, EmptyTitle } from '@workspace/ui/components/empty';
import { AlertCircle } from "lucide-react"

// Transform API question to component Question format
function transformQuestion(apiQuestion: any): Question {
    const options = (() => {
        const raw = apiQuestion.options
        if (!raw) return []

        // Backend format: [{ optionKey: "A" | "B" | ..., content: string, ... }]
        if (Array.isArray(raw)) {
            if (
                raw.length > 0 &&
                raw[0] &&
                typeof raw[0] === "object" &&
                ("optionKey" in raw[0] || ("content" in raw[0] && "optionKey" in raw[0]))
            ) {
                return raw.map((item: any, index: number) => {
                    const id =
                        item?.optionKey != null
                            ? String(item.optionKey)
                            : item?.id != null
                              ? String(item.id)
                              : String.fromCharCode(65 + index)
                    const label =
                        item?.content != null
                            ? String(item.content)
                            : item?.label != null
                              ? String(item.label)
                              : item?.value != null
                                ? String(item.value)
                                : `Lựa chọn ${id}`
                    return { id, label }
                })
            }

            // New format from admin: [{ value: "A", label: "..." }]
            return raw.map((item: any, index: number) => {
                if (typeof item === "string") {
                    const fallback = String.fromCharCode(65 + index)
                    return { id: fallback, label: item }
                }
                if (item && typeof item === "object") {
                    const id = String(item.value ?? String.fromCharCode(65 + index))
                    const label = String(item.label ?? `Lựa chọn ${id}`)
                    return { id, label }
                }
                const fallback = String.fromCharCode(65 + index)
                return { id: fallback, label: `Lựa chọn ${fallback}` }
            })
        }

        // Legacy format: { A: "..." }
        if (typeof raw === "object") {
            return Object.entries(raw).map(([key, value]) => ({
                id: key,
                label: String(value),
            }))
        }

        return []
    })()

    const categoryType = String(apiQuestion.categoryType ?? apiQuestion.category ?? "").toUpperCase()
    const mediaUrl = apiQuestion.mediaUrl as string | undefined
    const looksLikeAudio =
        !!mediaUrl && /\.(mp3|wav|m4a|aac|ogg)(\?|#|$)/i.test(mediaUrl)
    const isListening =
        categoryType === "LISTENING" || (!!mediaUrl && looksLikeAudio && categoryType !== "READING")
    const type: Question["type"] =
        isListening
            ? "listening"
            : categoryType === "READING"
              ? "reading"
              : "single"

    return {
        id: apiQuestion.id,
        content: apiQuestion.stem ?? apiQuestion.content ?? "",
        type,
        audioUrl: type === "listening" ? mediaUrl : undefined,
        imageUrl: type !== "listening" ? mediaUrl : undefined,
        readingPassage: apiQuestion.readingPassage,
        options,
    }
}

export default function TakeExamPage() {
    const router = useRouter()
    const { examId } = useParams<{ examId: string }>()
    const searchParams = useSearchParams()
    const userId = useAppSelector((state: RootState) => state.auth.user?.id)
    const enrollmentId = searchParams.get('enrollmentId') ?? undefined
    const classAssessmentId = searchParams.get('classAssessmentId') ?? undefined

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [sessionId, setSessionId] = useState<string | null>(null)
    const [examTitle, setExamTitle] = useState('')
    const [questions, setQuestions] = useState<Question[]>([])
    const [timeLimit, setTimeLimit] = useState(0) // seconds
    const [timeRemaining, setTimeRemaining] = useState(0) // seconds - current time left
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [flags, setFlags] = useState<Set<string>>(new Set())
    const [currentSection, setCurrentSection] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showConfirmSubmit, setShowConfirmSubmit] = useState(false)

    // Auto-save refs
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
    const lastSaveRef = useRef<Record<string, string>>({})
    const lastFlagsRef = useRef<Set<string>>(new Set())

    // Load exam on mount
    useEffect(() => {
        async function loadExam() {
            if (!userId) return;
            if (!enrollmentId) {
                setError('Thiếu mã ghi danh (enrollment). Hãy mở bài quiz từ trang học của khóa.')
                setLoading(false)
                return
            }
            try {
                setLoading(true)

                // 1. Start or resume attempt
                const attempt = await academyExamsApi.startAttempt({
                    examId,
                    userId,
                    enrollmentId,
                    assessmentId: classAssessmentId,
                })
                setSessionId(attempt.id)

                // 2. Fetch full exam details (for questions/titles)
                const exam = await academyExamsApi.findById(examId)
                setExamTitle(exam.title)

                const originalTimeLimit = (exam.totalTimeLimitMinutes || 0) * 60
                setTimeLimit(originalTimeLimit)

                // Khớp Prisma: exam.questions + sections[].questions (không có exam.examQuestions ở API)
                const ex: any = exam
                const fromSections =
                    ex.sections?.flatMap((s: any) => s.questions || s.examQuestions || []) ?? []
                const topLevel = ex.questions ?? ex.examQuestions ?? []
                const rows = fromSections.length > 0 ? fromSections : topLevel
                const apiQuestions = rows
                    .map((eq: any) => (eq?.question != null ? eq.question : eq))
                    .filter(Boolean)

                const transformedQuestions = apiQuestions.map(transformQuestion)
                setQuestions(transformedQuestions)

                // 3. Load resume state from attempt.metadata or attempt.draftAnswers
                const savedState = attempt.draftAnswers as any
                if (savedState) {
                    if (savedState.answers) setAnswers(savedState.answers)
                    if (savedState.flaggedQuestions) setFlags(new Set(savedState.flaggedQuestions))
                    if (savedState.currentQuestionIndex) setCurrentQuestionIndex(savedState.currentQuestionIndex)
                }

                // 4. Handle time remaining
                if (attempt.deadlineAt) {
                    const deadline = new Date(attempt.deadlineAt).getTime()
                    const now = new Date().getTime()
                    const remaining = Math.max(0, Math.floor((deadline - now) / 1000))
                    setTimeRemaining(remaining)
                } else {
                    setTimeRemaining(originalTimeLimit)
                }

            } catch (err: any) {
                setError(err.message || 'Không thể tải bài kiểm tra')
                console.error('Error loading exam:', err)
            } finally {
                setLoading(false)
            }
        }

        if (examId && userId) {
            loadExam()
        }
    }, [examId, userId, enrollmentId, classAssessmentId])

    // Auto-save function
    const autoSave = useCallback(async () => {
        if (!sessionId || isSubmitting) return

        const hasChanges =
            JSON.stringify(answers) !== JSON.stringify(lastSaveRef.current) ||
            JSON.stringify(Array.from(flags).sort()) !== JSON.stringify(Array.from(lastFlagsRef.current).sort())

        if (!hasChanges) return

        try {
            const draftAnswers = {
                answers,
                flaggedQuestions: Array.from(flags),
                currentQuestionIndex,
                lastSavedAt: new Date().toISOString()
            }

            await academyExamsApi.saveAnswers({
                attemptId: sessionId,
                draftAnswers
            })

            lastSaveRef.current = { ...answers }
            lastFlagsRef.current = new Set(flags)
        } catch (err) {
            console.error('Auto-save failed:', err)
        }
    }, [sessionId, answers, flags, currentQuestionIndex, isSubmitting])

    // Auto-save on answer/flag change (debounced)
    useEffect(() => {
        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current)
        }

        autoSaveTimerRef.current = setTimeout(() => {
            autoSave()
        }, 2000)

        return () => {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current)
            }
        }
    }, [answers, flags, currentQuestionIndex, autoSave])

    // Save on unmount
    useEffect(() => {
        return () => {
            if (sessionId && !isSubmitting && Object.keys(answers).length > 0) {
                const draftAnswers = {
                    answers,
                    flaggedQuestions: Array.from(flags),
                    currentQuestionIndex,
                    lastSavedAt: new Date().toISOString()
                }
                academyExamsApi.saveAnswers({
                    attemptId: sessionId,
                    draftAnswers
                }).catch(console.error)
            }
        }
    }, [sessionId, answers, flags, currentQuestionIndex, isSubmitting])

    const handleAnswer = (qId: string, optId: string) => {
        setAnswers(prev => ({ ...prev, [qId]: optId }))
    }

    const handleFlag = (qId: string) => {
        const newFlags = new Set(flags)
        if (newFlags.has(qId)) {
            newFlags.delete(qId)
        } else {
            newFlags.add(qId)
        }
        setFlags(newFlags)
    }

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1)
        } else {
            handleSubmit()
        }
    }

    const handlePrev = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1)
        }
    }

    const handleSubmit = () => {
        if (!sessionId || isSubmitting) return
        setShowConfirmSubmit(true)
    }

    const confirmSubmit = async () => {
        if (!sessionId || isSubmitting) return
        setShowConfirmSubmit(false)

        try {
            setIsSubmitting(true)
            toast.loading("Đang nộp bài...", { id: "submit-exam" })

            // Final save before submit
            const draftAnswers = {
                answers,
                flaggedQuestions: Array.from(flags),
                currentQuestionIndex,
                lastSavedAt: new Date().toISOString()
            }
            await academyExamsApi.saveAnswers({
                attemptId: sessionId,
                draftAnswers
            })

            // Submit exam
            await academyExamsApi.submitAttempt({ attemptId: sessionId })
            toast.success("Nộp bài thành công!", { id: "submit-exam" })
            router.push(`/dashboard/exams/${examId}/review/${sessionId}`)
        } catch (err: any) {
            setIsSubmitting(false)
            toast.error('Lỗi khi nộp bài: ' + (err.message || 'Không rõ nguyên nhân'), { id: "submit-exam" })
            console.error('Error submitting exam:', err)
        }
    }

    const handleTimeUp = async () => {
        if (!sessionId || isSubmitting) return

        try {
            setIsSubmitting(true)
            const draftAnswers = {
                answers,
                flaggedQuestions: Array.from(flags),
                currentQuestionIndex,
                lastSavedAt: new Date().toISOString()
            }

            try {
                await academyExamsApi.saveAnswers({
                    attemptId: sessionId,
                    draftAnswers
                })
            } catch (saveErr: any) {
                console.warn('Failed to save before auto-submit:', saveErr)
            }

            // Submit exam
            await academyExamsApi.submitAttempt({ attemptId: sessionId })
            toast.success('Hết giờ! Bài thi đã được nộp tự động.', { duration: 5000 })
            router.push(`/dashboard/exams/${examId}/review/${sessionId}`)
        } catch (err: any) {
            setIsSubmitting(false)
            console.error('Error auto-submitting exam:', err)
            router.push(`/dashboard/exams/${examId}/review/${sessionId}`)
        }
    }

    // Update timeRemaining from timer
    const handleTimeUpdate = useCallback((seconds: number) => {
        setTimeRemaining(seconds)
    }, [])

    if (loading) {
        return <PageLoading className="h-screen" />
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen bg-background">
                <div className="text-center">
                    <p className="text-destructive mb-4 font-bold uppercase tracking-widest text-[10px]">Lỗi: {error}</p>
                    <Button onClick={() => router.push('/dashboard/exams')} variant="outline">Quay lại</Button>
                </div>
            </div>
        )
    }

    if (questions.length === 0) {
        return (
            <div className="flex items-center justify-center h-screen bg-background">
                <Empty>
                    <EmptyContent>
                        <EmptyTitle>Không có câu hỏi nào</EmptyTitle>
                        <Button onClick={() => router.push('/exams')}>Quay lại</Button>
                    </EmptyContent>
                </Empty>
            </div>
        )
    }

    const currentQuestion = questions[currentQuestionIndex]
    const answeredCount = Object.keys(answers).length
    const totalCount = questions.length
    const flaggedCount = flags.size
    const progressPercentage = Math.round((answeredCount / totalCount) * 100)

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background">
            {/* Header */}
            <header className="bg-card border-b border-border px-4 sm:px-6 py-3 flex items-center justify-between gap-4 shrink-0 z-20">
                <div className="flex items-center gap-3">
                    <Link
                        href="/dashboard/exams"
                        className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </Link>
                    <div className="flex flex-col">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            Bài kiểm tra
                        </p>
                        <p className="text-sm md:text-base font-bold text-foreground line-clamp-1">
                            {examTitle}
                        </p>
                    </div>
                </div>

                {timeLimit > 0 && (
                    <ExamTimer
                        durationMinutes={Math.ceil(timeLimit / 60)}
                        initialSeconds={typeof timeRemaining === "number" ? timeRemaining : timeLimit}
                        onTimeUp={handleTimeUp}
                        onTimeUpdate={handleTimeUpdate}
                    />
                )}

                <Button
                    onClick={handleSubmit}
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary/10"
                    disabled={isSubmitting}
                >
                    Nộp bài
                </Button>
            </header>

            {/* Main Layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* Mobile Navigator Drawer */}
                <div className="lg:hidden absolute bottom-4 right-4 z-50">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button size="icon" className="h-12 w-12 rounded-full shadow-lg bg-foreground text-background">
                                <Menu className="w-6 h-6" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-full sm:max-w-[320px] p-0">
                            <div className="h-full flex flex-col rounded-2xl border bg-card overflow-hidden">
                                <QuestionNavigator
                                    questions={questions}
                                    currentIndex={currentQuestionIndex}
                                    answers={answers}
                                    flags={flags}
                                    onSelect={setCurrentQuestionIndex}
                                />
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>

                {/* Desktop Sidebar */}
                <aside className="hidden lg:block w-[280px] shrink-0 px-4 py-4 bg-muted">
                    <div className="h-full flex flex-col rounded-2xl border bg-card overflow-hidden">
                        <QuestionNavigator
                            questions={questions}
                            currentIndex={currentQuestionIndex}
                            answers={answers}
                            flags={flags}
                            onSelect={setCurrentQuestionIndex}
                        />
                    </div>
                </aside>

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto bg-muted px-4 py-6 md:p-8 relative">
                    <div className="max-w-4xl mx-auto pb-24">
                        {currentQuestion && (
                            <QuestionArea
                                question={currentQuestion}
                                selectedOption={answers[currentQuestion.id]}
                                isFlagged={flags.has(currentQuestion.id)}
                                onAnswer={handleAnswer}
                                onFlag={handleFlag}
                                onNext={handleNext}
                                onPrev={handlePrev}
                                isFirst={currentQuestionIndex === 0}
                                isLast={currentQuestionIndex === questions.length - 1}
                            />
                        )}
                    </div>
                </main>
            </div>

            {/* Confirmation Dialog */}
            <AlertDialog open={showConfirmSubmit} onOpenChange={setShowConfirmSubmit}>
                <AlertDialogContent className="max-w-[440px] p-0 overflow-hidden border-none bg-transparent shadow-none">
                    <div className="bg-background border-2 border-border/50 rounded-[2.5rem] overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)]">
                        {/* Decorative Background */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -z-10" />
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -z-10" />

                        <div className="p-8 sm:p-10 text-center space-y-8 relative z-10">
                            {/* Icon with Gradient Background */}
                            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-[2rem] flex items-center justify-center relative group">
                                <AlertCircle className="w-10 h-10 text-primary animate-pulse" />
                                <div className="absolute inset-0 rounded-[2rem] border-2 border-primary/20 scale-110 group-hover:scale-125 transition-transform duration-500 opacity-50" />
                            </div>

                            <div className="space-y-3">
                                <AlertDialogTitle className="text-3xl font-black tracking-tight text-foreground">
                                    Nộp bài kiểm tra
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-muted-foreground text-sm font-medium leading-relaxed max-w-[280px] mx-auto uppercase tracking-widest text-[10px]">
                                    Hành động này không thể hoàn tác. Bạn có chắc chắn muốn kết thúc bài thi?
                                </AlertDialogDescription>
                            </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="bg-muted/50 rounded-2xl p-4 border border-border/50 flex flex-col items-center text-center">
                                            <p className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground mb-1">Đã trả lời</p>
                                            <p className="text-2xl font-black text-foreground">
                                                {answeredCount}<span className="text-muted-foreground/40 font-bold ml-1 text-base">/ {totalCount}</span>
                                            </p>
                                            <div className="mt-2 w-full h-1 bg-muted rounded-full overflow-hidden">
                                                <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${progressPercentage}%` }} />
                                            </div>
                                        </div>
                                        <div className="bg-muted/50 rounded-2xl p-4 border border-border/50 flex flex-col items-center text-center">
                                            <p className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground mb-1">Đang đánh dấu</p>
                                            <p className="text-2xl font-black text-orange-500">{flaggedCount}</p>
                                            <p className="text-[10px] font-bold text-muted-foreground mt-1">Cần xem lại</p>
                                        </div>
                                    </div>

                            {/* Warning Message */}
                            {answeredCount < totalCount && (
                                <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                                    <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
                                    <p className="text-[10px] font-bold text-orange-600 text-left leading-tight">
                                        Bạn vẫn còn {totalCount - answeredCount} câu hỏi chưa trả lời. Hãy cân nhắc trước khi nộp nhé!
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <AlertDialogCancel className="h-14 rounded-2xl font-black uppercase tracking-widest text-[11px] border-2 border-border hover:bg-muted transition-all active:scale-95 shadow-sm">
                                    Quay lại
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={confirmSubmit}
                                    className="h-14 rounded-2xl font-black uppercase tracking-widest text-[11px] bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/20 transition-all active:scale-95"
                                >
                                    Nộp bài ngay
                                </AlertDialogAction>
                            </div>
                        </div>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
