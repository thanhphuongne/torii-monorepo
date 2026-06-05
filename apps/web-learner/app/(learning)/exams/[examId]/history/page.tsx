'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@workspace/ui/components/card'
import { Button } from '@workspace/ui/components/button'
import { Badge } from '@workspace/ui/components/badge'
import { PageLoading } from '@workspace/ui/components/page-loading'
import { ArrowLeft, History, Eye, Calendar, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { useAcademyExamAttempts as useExamSessions } from '@/lib/api/services/academy-exam-api'

export default function ExamHistoryPage() {
    const { examId } = useParams<{ examId: string }>()
    const router = useRouter()

    const { data: sessions = [], isLoading } = useExamSessions({
        examId,
        status: 'SUBMITTED'
    })

    if (isLoading) {
        return <PageLoading className="h-screen" />
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-12">
            {/* Header */}
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    <Link href={`/dashboard/exams/${examId}`}>
                        <Button variant="ghost" size="icon" className="rounded-xl size-10 bg-background/50 backdrop-blur-md border border-white/5 hover:bg-white/10 hover:text-primary transition-all">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                            <History className="size-8 text-primary" />
                            Attempt Logs
                        </h1>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 pl-1">
                            Historical performance data for Protocol {examId.substring(0, 8)}...
                        </p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="space-y-4">
                {sessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/10 rounded-[3rem] bg-white/5">
                        <div className="p-6 rounded-full bg-muted/10 mb-6">
                            <History className="size-10 text-muted-foreground/30" />
                        </div>
                        <h3 className="text-xl font-black uppercase tracking-tight italic text-muted-foreground/50">No Logs Found</h3>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30 mt-2">Initiate protocol to generate data.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {sessions.map((session: any) => {
                            const percentage = session.score !== undefined && session.maxScore !== undefined
                                ? Math.round((session.score / session.maxScore) * 100)
                                : null
                            const isPassed = percentage !== null && percentage >= 60 // Assuming 60% is pass
                            const timeTakenMinutes = session.timeTakenSeconds
                                ? Math.round(session.timeTakenSeconds / 60)
                                : null

                            return (
                                <Card key={session.id} className="group overflow-hidden border-white/5 bg-background/40 backdrop-blur-sm hover:bg-background/60 hover:border-primary/20 transition-all duration-300">
                                    <CardContent className="p-6">
                                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                            {/* Left: Score & Status */}
                                            <div className="flex items-center gap-6 w-full md:w-auto">
                                                <div className={`relative w-16 h-16 flex items-center justify-center rounded-2xl border ${isPassed ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-destructive/10 border-destructive/20 text-destructive"}`}>
                                                    <span className="text-xl font-black tracking-tighter">{percentage !== null ? `${percentage}%` : 'N/A'}</span>
                                                    {isPassed && <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/50" />}
                                                </div>

                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className={`rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest border-0 ${isPassed ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"}`}>
                                                            {isPassed ? "SUCCESS" : "FAILURE"}
                                                        </Badge>
                                                        <span className="text-[10px] font-bold text-muted-foreground/40">ID: {session.id.substring(0, 8)}...</span>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                                                        <div className="flex items-center gap-1.5">
                                                            <Calendar className="w-3.5 h-3.5" />
                                                            {session.submittedAt
                                                                ? format(new Date(session.submittedAt), 'dd MMM yyyy, HH:mm')
                                                                : session.startedAt
                                                                    ? format(new Date(session.startedAt), 'dd MMM yyyy, HH:mm')
                                                                    : 'N/A'}
                                                        </div>
                                                        {timeTakenMinutes !== null && (
                                                            <div className="flex items-center gap-1.5">
                                                                <Clock className="w-3.5 h-3.5" />
                                                                {timeTakenMinutes}m
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right: Actions */}
                                            <Button
                                                onClick={() => router.push(`/dashboard/exams/${examId}/review/${session.id}`)}
                                                className="w-full md:w-auto rounded-xl font-black uppercase tracking-widest text-[10px] h-10 bg-white/5 hover:bg-primary hover:text-primary-foreground border border-white/10 hover:border-primary/20 transition-all shadow-none hover:shadow-lg hover:shadow-primary/10"
                                            >
                                                Analyze Log <Eye className="ml-2 w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                    {/* Decorative bottom bar */}
                                    <div className={`h-1 w-full ${isPassed ? "bg-emerald-500/20" : "bg-destructive/20"}`} />
                                </Card>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
