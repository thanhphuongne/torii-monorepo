'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { ArrowLeft, FileText, CheckCircle2, XCircle, Clock, Award } from 'lucide-react'
import { PageLoading } from '@workspace/ui/components/page-loading'
import { useAcademyExamAttempt } from '@/lib/api/services/academy-exam-api'
import { format } from 'date-fns'
import { MarkdownRenderer } from '@/components/common/markdown-renderer'

export default function ExamReviewPage() {
    const { examId, sessionId } = useParams<{ examId: string, sessionId: string }>()
    const router = useRouter()
    const [showAnswers, setShowAnswers] = useState(false)

    const { data: reviewData, isLoading, error } = useAcademyExamAttempt(sessionId)

    if (isLoading) {
        return <PageLoading className="h-screen" />
    }

    if (error || !reviewData) {
        return (
            <div className="space-y-8 animate-in fade-in duration-700">
                <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-4">
                        <Link href={`/dashboard/exams`}>
                            <Button variant="ghost" size="icon" className="rounded-xl size-10 bg-background/50 backdrop-blur-md border border-white/5 hover:bg-white/10 hover:text-primary transition-all">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center space-y-6 py-20 border border-dashed border-white/10 rounded-[3rem] bg-white/5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Không tìm thấy dữ liệu kết quả</p>
                    <Button onClick={() => router.push(`/dashboard/exams/${examId}`)} className="rounded-xl px-8 uppercase font-black tracking-widest">
                        Quay lại trang bài thi
                    </Button>
                </div>
            </div>
        )
    }

    const percentage = (reviewData.percentage !== undefined && reviewData.percentage !== null)
        ? Math.round(reviewData.percentage)
        : null
    const isPassed = reviewData.isPassed ?? (percentage !== null && percentage >= 60)
    const details = reviewData.details || []

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-12">
            {/* Header */}
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    <Link href={`/dashboard/exams`}>
                        <Button variant="ghost" size="icon" className="rounded-xl size-10 bg-background/50 backdrop-blur-md border border-white/5 hover:bg-white/10 hover:text-primary transition-all">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                            Kết quả bài thi
                        </h1>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                            {reviewData.quizTitle || 'Báo cáo bài thi'} | Phiên làm bài {sessionId.substring(0, 8)}...
                        </p>
                    </div>
                </div>
            </div>

            {/* Summary Card */}
            <Card className="bg-background/40 backdrop-blur-xl border-white/5 shadow-2xl rounded-[2rem] overflow-hidden">
                <CardContent className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="flex flex-col items-center justify-center gap-2">
                            <div className={`size-16 rounded-full flex items-center justify-center ${isPassed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
                                {percentage !== null ? (
                                    <span className="text-2xl font-black">{percentage}%</span>
                                ) : (
                                    <span className="text-2xl font-black">N/A</span>
                                )}
                            </div>
                            <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">Điểm số</div>
                        </div>

                        <div className="flex flex-col items-center justify-center gap-2">
                            <div className="size-16 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                                <span className="text-2xl font-black">
                                    {reviewData.score !== undefined ? reviewData.score : 'N/A'}
                                </span>
                            </div>
                            <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">Số câu đúng</div>
                            {reviewData.maxScore !== undefined && (
                                <div className="text-[8px] text-muted-foreground/40">trên {reviewData.maxScore}</div>
                            )}
                        </div>

                        <div className="flex flex-col items-center justify-center gap-2">
                            <div className="size-16 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
                                <Clock className="size-8" />
                            </div>
                            <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">Thời gian làm</div>
                            {reviewData.timeTakenSeconds != null && (
                                <div className="text-[8px] text-muted-foreground/40">
                                    {Math.round(reviewData.timeTakenSeconds / 60)} phút
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col items-center justify-center gap-2">
                            <div className={`size-16 rounded-full flex items-center justify-center ${isPassed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
                                {isPassed ? <Award className="size-8" /> : <XCircle className="size-8" />}
                            </div>
                            <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">Trạng thái</div>
                            <Badge variant={isPassed ? 'default' : 'destructive'} className="text-[8px] font-black uppercase">
                                {isPassed ? 'ĐẠT' : 'KHÔNG ĐẠT'}
                            </Badge>
                        </div>
                    </div>

                    {reviewData.submittedAt && (
                        <div className="mt-6 pt-6 border-t border-white/5 flex flex-col items-center gap-4">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                                Ngày nộp bài: {format(new Date(reviewData.submittedAt), 'dd/MM/yyyy, HH:mm')}
                            </p>
                            <Button 
                                onClick={() => setShowAnswers(!showAnswers)}
                                variant="outline"
                                className="rounded-xl px-10 border-primary text-primary hover:bg-primary/5 uppercase font-black tracking-widest text-[11px] h-12 shadow-lg shadow-primary/10 transition-all active:scale-95"
                            >
                                {showAnswers ? 'Ẩn đáp án chi tiết' : 'Xem đáp án & giải thích'}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Questions Review */}
            {showAnswers && details.length > 0 && (
                <Card className="bg-background/40 backdrop-blur-xl border-white/5 shadow-2xl rounded-[2rem] overflow-hidden">
                    <CardHeader className="border-b border-white/5 p-6">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 italic flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Chi tiết bài làm ({details.length} câu)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-white/5">
                            {details.map((detail: any, index: number) => (
                                <div key={detail.id || index} className="p-6 space-y-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-black text-muted-foreground/40">#{index + 1}</span>
                                                {detail.isCorrect ? (
                                                    <Badge variant="default" className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-0 text-[8px] font-black uppercase tracking-wider gap-1">
                                                        <CheckCircle2 className="size-3" />
                                                        Đúng
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="destructive" className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-0 text-[8px] font-black uppercase tracking-wider gap-1">
                                                        <XCircle className="size-3" />
                                                        Sai
                                                    </Badge>
                                                )}
                                                <span className="text-[9px] font-bold text-muted-foreground/60">
                                                    {detail.pointsEarned} / {detail.pointsEarned + (detail.isCorrect ? 0 : 1)} điểm
                                                </span>
                                            </div>
                                            <div className="text-base font-medium text-foreground leading-relaxed">
                                                <MarkdownRenderer content={detail.questionText} className="prose-p:my-0" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3 pl-4 border-l-2 border-white/5">
                                        {detail.options && typeof detail.options === 'object' && (
                                            <div className="space-y-2">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Các lựa chọn:</p>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    {Object.entries(detail.options).map(([key, value]: [string, any]) => (
                                                        <div
                                                            key={key}
                                                            className={`p-2 rounded-lg text-sm ${detail.userAnswer === key
                                                                ? detail.isCorrect
                                                                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500'
                                                                    : 'bg-destructive/10 border border-destructive/20 text-destructive'
                                                                : detail.correctAnswer === key && !detail.isCorrect
                                                                    ? 'bg-blue-500/10 border border-blue-500/20 text-blue-500'
                                                                    : 'bg-white/5 border border-white/5 text-muted-foreground'
                                                                }`}
                                                        >
                                                            <span className="font-bold mr-2">{key}:</span>
                                                            <MarkdownRenderer content={value} inline />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Câu trả lời của bạn:</p>
                                            <p className={`text-sm font-medium ${detail.isCorrect ? 'text-emerald-500' : 'text-destructive'}`}>
                                                {detail.userAnswer || 'Chưa có câu trả lời'}
                                            </p>
                                        </div>

                                        {detail.correctAnswer !== undefined && (
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Đáp án đúng:</p>
                                                <p className="text-sm font-medium text-blue-500">
                                                    {detail.correctAnswer}
                                                </p>
                                            </div>
                                        )}

                                        {detail.explanation && (
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Giải thích:</p>
                                                <div className="text-sm text-muted-foreground leading-relaxed">
                                                    <MarkdownRenderer content={detail.explanation} className="prose-p:my-0 prose-sm" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Actions */}
            <div className="flex gap-4">
                <Button
                    onClick={() => router.push(`/dashboard/exams`)}
                    className="rounded-xl px-8 uppercase font-black tracking-widest"
                >
                    Quay lại trang bài thi
                </Button>
                <Button
                    variant="outline"
                    onClick={() => router.push(`/exams/${examId}/history`)}
                    className="rounded-xl px-8 uppercase font-black tracking-widest"
                >
                    Xem tất cả lịch sử
                </Button>
            </div>
        </div>
    )
}
