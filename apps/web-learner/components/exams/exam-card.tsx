'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardFooter } from '@workspace/ui/components/card'
import { Button } from '@workspace/ui/components/button'
import { Badge } from '@workspace/ui/components/badge'
import { Clock, FileText, ArrowRight, RotateCcw } from 'lucide-react'
import { cn } from '@workspace/ui/lib/utils'
import { Separator } from '@workspace/ui/components/separator'

interface ExamCardProps {
    id: string
    title: string
    level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1'
    type: 'Full Test' | 'Mini Test'
    duration: number
    totalQuestions: number
    status: 'new' | 'in-progress' | 'completed'
    score?: number
    maxScore?: number
    progress?: number
    sessionId?: string
}

export function ExamCard({
    id,
    title,
    level,
    type,
    duration,
    totalQuestions,
    status,
    score,
    maxScore = 180,
    progress = 0,
    sessionId,
}: ExamCardProps) {
    const router = useRouter()
    const passed = (score || 0) >= maxScore * 0.6

    return (
        <Card className="flex flex-col h-full hover:border-primary/40 transition-colors">
            <CardContent className="flex-1 p-5 space-y-4">
                {/* Badges */}
                <div className="flex items-center gap-2">
                    <Badge>{level}</Badge>
                    <Badge variant="secondary">
                        {type === 'Full Test' ? 'Bài thi thực tế' : 'Đề thi rút gọn'}
                    </Badge>
                </div>

                {/* Title & Meta */}
                <div className="space-y-2">
                    <h3 className="font-semibold leading-snug line-clamp-2">
                        {title}
                    </h3>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> {duration} phút
                        </span>
                        <span className="flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5" /> {totalQuestions} câu
                        </span>
                    </div>
                </div>

                {/* Progress */}
                {status === 'in-progress' && (
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Tiến độ</span>
                            <span className="font-medium text-primary">{progress}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                )}

                {/* Score */}
                {status === 'completed' && (
                    <div className="rounded-lg bg-muted/50 p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground mb-1">Kết quả</p>
                            <p className={cn('text-2xl font-bold', passed ? 'text-primary' : 'text-destructive')}>
                                {score} <span className="text-sm font-normal text-muted-foreground">/ {maxScore}</span>
                            </p>
                        </div>
                        <Badge variant="secondary" className={cn(passed ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive')}>
                            {passed ? 'ĐẠT' : 'KHÔNG ĐẠT'}
                        </Badge>
                    </div>
                )}
            </CardContent>

            <Separator />

            <CardFooter className="p-4">
                {status === 'new' && (
                    <Button className="w-full" onClick={() => router.push(`/exams/${id}/take`)}>
                        Vào thi thử <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                )}
                {status === 'in-progress' && (
                    <Button variant="secondary" className="w-full" onClick={() => router.push(`/exams/${id}/take`)}>
                        Tiếp tục thi <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                )}
                {status === 'completed' && (
                    <div className="flex gap-2 w-full">
                        <Button variant="outline" className="flex-1" onClick={() => sessionId && router.push(`/exams/${id}/review?sessionId=${sessionId}`)}>
                            Xem lại
                        </Button>
                        <Button variant="outline" className="flex-1" onClick={() => router.push(`/exams/${id}/take`)}>
                            <RotateCcw className="mr-2 w-4 h-4" /> Làm lại
                        </Button>
                    </div>
                )}
            </CardFooter>
        </Card>
    )
}
