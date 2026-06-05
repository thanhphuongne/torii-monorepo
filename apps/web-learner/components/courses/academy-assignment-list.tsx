'use client'

import { useRouter } from 'next/navigation'
import {
    FileText,
    Clock,
    CheckCircle2,
    AlertCircle,
    ChevronRight,
    Trophy,
} from 'lucide-react'
import { Spinner } from '@workspace/ui/components/spinner'
import { 
    useAcademyClassAssignments, 
    useMyAssignmentSubmissions, 
} from '@/lib/api/services/academy-assignment-api'
import { format } from 'date-fns'
import { cn } from '@workspace/ui/lib/utils'
import { Button } from '@workspace/ui/components/button'

interface AcademyAssignmentListProps {
    liveClassId: string
    className?: string
}

export function AcademyAssignmentList({
    liveClassId,
    className,
}: AcademyAssignmentListProps) {
    const router = useRouter()
    const { data: assignments, isLoading: isLoadingAssignments } = useAcademyClassAssignments(liveClassId)
    const { data: mySubmissions, isLoading: isLoadingSubmissions } = useMyAssignmentSubmissions(liveClassId)

    const isLoading = isLoadingAssignments || isLoadingSubmissions

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Spinner className="size-8 text-primary" />
                <p className="text-sm font-medium text-muted-foreground">Đang tải danh sách bài tập...</p>
            </div>
        )
    }

    const getSubmissionStatus = (assignmentId: string) => {
        const submission = mySubmissions?.find(s => s.assignmentTemplateId === assignmentId)
        if (!submission) return { label: 'Chưa nộp', color: 'bg-zinc-100 text-zinc-500', icon: AlertCircle }
        
        switch (submission.status?.toUpperCase()) {
            case 'GRADED':
                return { label: `Đã chấm: ${submission.grade ?? submission.score ?? '?'}`, color: 'bg-emerald-100 text-emerald-700', icon: Trophy }
            case 'SUBMITTED':
                return { label: 'Đã nộp', color: 'bg-blue-100 text-blue-700', icon: CheckCircle2 }
            default:
                return { label: 'Đang xử lý', color: 'bg-amber-100 text-amber-700', icon: Clock }
        }
    }

    return (
        <div className={cn("space-y-4 animate-in fade-in duration-500", className)}>
            {assignments && assignments.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full min-w-[760px] border-collapse">
                        <thead>
                            <tr className="bg-muted/40">
                                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Bài tập</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Hạn nộp</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Trạng thái</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {assignments.map((assignment) => {
                                const status = getSubmissionStatus(assignment.assignmentId)
                                const Icon = status.icon
                                const isExpired = assignment.deadline && new Date(assignment.deadline) < new Date()
                                const title = assignment.titleOverride || assignment.assignment?.title || 'Bài tập'

                                return (
                                    <tr key={assignment.id} className="border-t border-border hover:bg-muted/20">
                                        <td className="px-4 py-3 align-top">
                                            <div className="flex items-start gap-2">
                                                <FileText className="mt-0.5 size-4 shrink-0 text-primary" />
                                                <div className="space-y-1">
                                                    <p className="text-sm font-semibold">{title}</p>
                                                    <p className="text-xs text-muted-foreground">Mã: {assignment.id.slice(0, 8)}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 align-top">
                                            <p className={cn("text-sm", isExpired && "text-destructive")}>
                                                {assignment.deadline ? format(new Date(assignment.deadline), 'dd/MM/yyyy HH:mm') : 'Không có hạn'}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3 align-top">
                                            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", status.color)}>
                                                <Icon className="size-3.5" />
                                                {status.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right align-top">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => router.push(`/dashboard/my-courses/${liveClassId}/assignments/${assignment.id}`)}
                                                className="h-8"
                                            >
                                                Chi tiết
                                                <ChevronRight className="ml-1 size-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-20 border border-dashed rounded-3xl bg-muted/20 space-y-3">
                    <div className="size-12 rounded-2xl bg-muted flex items-center justify-center mx-auto opacity-20">
                        <FileText className="size-8" />
                    </div>
                    <p className="text-sm font-bold text-muted-foreground/60">Chưa có bài tập nào được giao cho lớp này.</p>
                </div>
            )}
        </div>
    )
}
