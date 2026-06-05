'use client'

import * as React from 'react'
import {
    canJoinLiveSessionNow,
    getLiveSessionUiState,
    liveSessionApi,
    useMySchedule,
} from '@/lib/api/services/academy-live-session-api'
import { LiveSessionResponseDTO } from '@workspace/schemas'
import { format, startOfWeek, addDays, isSameDay, isToday, addWeeks, isFuture, addMinutes } from 'date-fns'
import { vi } from 'date-fns/locale'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@workspace/ui/components/select'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Spinner } from '@workspace/ui/components/spinner'
import { Empty, EmptyContent, EmptyDescription, EmptyMedia, EmptyTitle } from '@workspace/ui/components/empty'
import { cn } from '@workspace/ui/lib/utils'
import { toast } from '@workspace/ui/components/sonner'
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog'
import { Calendar, BookOpen, Clock } from 'lucide-react'
import Link from 'next/link'

const MEET_URL =
    typeof process !== 'undefined'
        ? process.env.NEXT_PUBLIC_MEET_URL || 'https://meet.torii.com'
        : 'https://meet.torii.com'

type ScheduleSession = LiveSessionResponseDTO & {
    courseTitle: string
    courseThumbnail: string | null
    attendanceStatus?: LiveSessionResponseDTO['attendanceStatus']
}

function attendanceBadgeLabel(status: LiveSessionResponseDTO['attendanceStatus']) {
    if (status === 'PRESENT') return 'Đã điểm danh: có mặt'
    if (status === 'ABSENT') return 'Đã điểm danh: vắng'
    if (status === 'LATE') return 'Đã điểm danh: muộn'
    if (status === 'EXCUSED') return 'Đã điểm danh: có phép'
    return 'Chưa có điểm danh'
}

function sessionsForDay(sessions: ScheduleSession[], day: Date) {
    return sessions.filter((s) => isSameDay(new Date(s.scheduledAt), day))
}

function CompactSessionCard({
    session,
    onRequestJoin,
    joiningId,
    now,
}: {
    session: ScheduleSession
    onRequestJoin: (s: ScheduleSession) => void
    joiningId: string | null
    now: Date
}) {
    const uiState = getLiveSessionUiState(session, now)
    const isLive = uiState === 'live'
    const canJoin = canJoinLiveSessionNow(session, now)
    const isEnded = uiState === 'ended'
    const start = new Date(session.scheduledAt)
    const end = addMinutes(start, session.duration ?? 90)

    return (
        <div
            role={canJoin ? 'button' : undefined}
            tabIndex={canJoin ? 0 : undefined}
            onClick={() => {
                if (canJoin) onRequestJoin(session)
            }}
            onKeyDown={(e) => {
                if (canJoin && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault()
                    onRequestJoin(session)
                }
            }}
            className={cn(
                'flex gap-3 rounded-xl border p-2.5 text-left shadow-sm transition-colors',
                canJoin && 'cursor-pointer',
                isLive
                    ? 'border-destructive/35 bg-destructive/[0.06]'
                    : isEnded
                        ? 'border-border/60 bg-white/90 opacity-80 dark:bg-zinc-900/90'
                        : 'border-border/60 bg-white hover:bg-zinc-50/90 dark:bg-zinc-900 dark:hover:bg-zinc-800/90'
            )}
        >
            <div className="flex shrink-0 flex-col items-center gap-0.5 border-r border-border/60 py-0.5 pr-3">
                <span className="text-[11px] font-bold tabular-nums leading-none">{format(start, 'HH:mm')}</span>
                <div className="min-h-[10px] w-px flex-1 bg-border" />
                <span className="text-[11px] font-bold tabular-nums leading-none">{format(end, 'HH:mm')}</span>
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                    {isLive && (
                        <Badge variant="destructive" className="h-5 px-1.5 text-[9px] font-bold">
                            Đang học
                        </Badge>
                    )}
                    {!isEnded && !isLive && isFuture(start) && (
                        <Badge variant="secondary" className="h-5 px-1.5 text-[9px] font-bold">
                            Sắp tới
                        </Badge>
                    )}
                    {isEnded && (
                        <Badge variant="outline" className="h-5 px-1.5 text-[9px] text-muted-foreground">
                            Đã xong
                        </Badge>
                    )}
                    {isEnded && (
                        <Badge
                            variant="secondary"
                            className="h-5 max-w-[140px] truncate px-1.5 text-[8px] font-bold"
                            title={attendanceBadgeLabel(session.attendanceStatus ?? null)}
                        >
                            {attendanceBadgeLabel(session.attendanceStatus ?? null)}
                        </Badge>
                    )}
                    {canJoin && (
                        <Button
                            size="sm"
                            variant="default"
                            className="h-7 rounded-md px-2.5 text-[10px] font-bold uppercase tracking-wide"
                            onClick={(e) => {
                                e.stopPropagation()
                                onRequestJoin(session)
                            }}
                            disabled={!!joiningId}
                        >
                            {joiningId === session.id ? <Spinner className="size-3" /> : isLive ? 'Vào lớp' : 'Vào phòng'}
                        </Button>
                    )}
                </div>
                <div>
                    <p
                        className={cn(
                            'text-[13px] font-bold leading-snug',
                            isLive ? 'text-destructive' : 'text-emerald-700 dark:text-emerald-400'
                        )}
                    >
                        {session.title}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <BookOpen className="size-3 shrink-0" />
                        <span className="truncate">{session.courseTitle}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function SchedulePage() {
    const { data: allSessions = [], isLoading } = useMySchedule()
    const [weekOffset, setWeekOffset] = React.useState(0)
    const [joiningId, setJoiningId] = React.useState<string | null>(null)
    const [joinConfirmSession, setJoinConfirmSession] = React.useState<ScheduleSession | null>(null)
    const [now, setNow] = React.useState(() => new Date())

    React.useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 30 * 1000)
        return () => clearInterval(timer)
    }, [])

    const today = new Date()
    const weekBase = startOfWeek(today, { weekStartsOn: 1 })
    const weekStart = addWeeks(weekBase, weekOffset)
    const weekEnd = addDays(weekStart, 6)
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

    const weekSessions = allSessions.filter((s) => {
        const d = new Date(s.scheduledAt)
        return d >= weekStart && d < addDays(weekEnd, 1)
    })

    const handleJoin = async (sessionId: string) => {
        try {
            setJoiningId(sessionId)
            const joinData = await liveSessionApi.joinSession(sessionId)
            window.open(`${MEET_URL}?access_token=${joinData.token}`, '_blank', 'noopener,noreferrer')
            toast.success('Đang mở phòng học...')
            setJoinConfirmSession(null)
        } catch (err: unknown) {
            const msg =
                err && typeof err === 'object' && 'response' in err
                    ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                    : undefined
            toast.error(msg || 'Không thể vào phòng học')
        } finally {
            setJoiningId(null)
        }
    }

    // Build YEAR/WEEK options similar to the screenshot (weekStartsOn=Mon).
    const weekOptions = React.useMemo(() => {
        const offsets = Array.from({ length: 53 }, (_, i) => i - 26) // ~ +/- 26 weeks
        return offsets.map((offset) => {
            const ws = addWeeks(weekBase, offset)
            const we = addDays(ws, 6)
            return {
                offset,
                year: ws.getFullYear(),
                label: `${format(ws, 'dd/MM')} to ${format(we, 'dd/MM')}`,
            }
        })
    }, [weekBase])

    const yearOptions = React.useMemo(() => {
        const set = new Set<number>()
        for (const w of weekOptions) set.add(w.year)
        return Array.from(set).sort((a, b) => a - b)
    }, [weekOptions])

    const selectedYear = weekStart.getFullYear()
    const visibleWeekOptions = weekOptions.filter((o) => o.year === selectedYear)

    return (
        <div className="animate-in fade-in space-y-4 duration-500">
            <AlertDialog
                open={!!joinConfirmSession}
                onOpenChange={(open) => {
                    if (!open) setJoinConfirmSession(null)
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Vào phòng học trực tuyến?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-2 text-sm text-muted-foreground">
                                <p>
                                    Bạn sắp mở phòng meeting cho buổi{' '}
                                    <span className="font-medium text-foreground">{joinConfirmSession?.title}</span> —{' '}
                                    <span className="font-medium text-foreground">{joinConfirmSession?.courseTitle}</span>.
                                </p>
                                <p>Tiếp tục để mở tab phòng học (LiveKit).</p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <Button
                            type="button"
                            disabled={!joinConfirmSession || !!joiningId}
                            onClick={() => {
                                if (joinConfirmSession) void handleJoin(joinConfirmSession.id)
                            }}
                        >
                            {joiningId ? 'Đang mở…' : 'Vào phòng'}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-white p-4 shadow-sm dark:border-border/40 dark:bg-zinc-950 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-3">
                    <div className="min-w-0 space-y-0.5">
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Thời khóa biểu</h1>
                        <p className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                            <Calendar className="size-3.5 shrink-0 text-muted-foreground" />
                            <span className="min-w-0 break-words">
                                Tuần {format(weekStart, 'dd/MM/yyyy')} – {format(weekEnd, 'dd/MM/yyyy')}
                            </span>
                        </p>
                    </div>

                    {/* Mobile: mỗi select một hàng, full width; desktop: cạnh nhau */}
                    <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row sm:flex-wrap sm:items-end sm:gap-6">
                        <div className="flex w-full flex-col gap-1 sm:w-auto sm:min-w-[120px]">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                Năm
                            </div>
                            <Select
                                value={String(selectedYear)}
                                onValueChange={(v) => {
                                    const targetYear = parseInt(v, 10)
                                    const closest = weekOptions
                                        .filter((o) => o.year === targetYear)
                                        .sort((a, b) => Math.abs(a.offset - weekOffset) - Math.abs(b.offset - weekOffset))[0]
                                    if (closest) setWeekOffset(closest.offset)
                                }}
                            >
                                <SelectTrigger className="h-9 w-full sm:min-w-[120px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {yearOptions.map((y) => (
                                        <SelectItem key={y} value={String(y)}>
                                            {y}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex w-full flex-col gap-1 sm:w-auto sm:min-w-[220px]">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                Tuần
                            </div>
                            <Select
                                value={String(weekOffset)}
                                onValueChange={(v) => setWeekOffset(parseInt(v, 10))}
                            >
                                <SelectTrigger className="h-9 w-full sm:min-w-[220px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {visibleWeekOptions.map((w) => (
                                        <SelectItem key={w.offset} value={String(w.offset)}>
                                            {w.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-2xl border border-border/50 bg-white shadow-sm dark:bg-zinc-950">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                    <span className="text-sm font-medium text-muted-foreground">Đang tải lịch…</span>
                </div>
            ) : allSessions.length === 0 ? (
                <div className="rounded-2xl border border-border/50 bg-white p-10 text-center shadow-sm dark:bg-zinc-950">
                    <Empty>
                        <EmptyMedia>
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/60">
                                <Calendar className="size-7 text-muted-foreground/40" />
                            </div>
                        </EmptyMedia>
                        <EmptyContent>
                            <EmptyTitle>Chưa có lịch học</EmptyTitle>
                            <EmptyDescription className="mx-auto max-w-sm">
                                Bạn chưa đăng ký lớp trực tiếp hoặc chưa có buổi học được lên lịch.
                            </EmptyDescription>
                        </EmptyContent>
                    </Empty>
                    <Button asChild className="mt-6 rounded-full px-8" variant="default">
                        <Link href="/dashboard/available-courses?type=live">Khám phá khóa học</Link>
                    </Button>
                </div>
            ) : (
                <div className="space-y-3 rounded-2xl border border-border/50 bg-white p-4 shadow-sm dark:bg-zinc-950 sm:p-5">
                    <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-2">
                        <Clock className="size-3.5" />
                        Lịch học theo ngày trong tuần.
                    </p>
                    <div className="space-y-3">
                        {days.map((day) => {
                            const daySessions = sessionsForDay(weekSessions as any, day).sort(
                                (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
                            )
                            if (daySessions.length === 0) return null

                            return (
                                <div
                                    key={format(day, 'yyyy-MM-dd')}
                                    className={cn(
                                        'rounded-xl border border-border/60 bg-card p-3 shadow-sm sm:p-4',
                                        isToday(day) && 'border-primary/40 bg-primary/[0.03]'
                                    )}
                                >
                                    <div className="mb-3 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-bold tabular-nums text-foreground">
                                                {format(day, 'EEEE, dd/MM', { locale: vi })}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground">{daySessions.length} buổi học</p>
                                        </div>
                                        {isToday(day) && (
                                            <Badge variant="secondary" className="text-[10px] font-bold">
                                                Hôm nay
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        {daySessions.map((session) => (
                                            <CompactSessionCard
                                                key={session.id}
                                                session={session}
                                                now={now}
                                                joiningId={joiningId}
                                                onRequestJoin={setJoinConfirmSession}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )
                        })}

                        {weekSessions.length === 0 && (
                            <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-4 text-center text-sm text-muted-foreground">
                                Tuần này chưa có buổi học nào.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
