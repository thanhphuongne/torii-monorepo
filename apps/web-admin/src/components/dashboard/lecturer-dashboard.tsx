import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@workspace/ui/components/empty"
import {
    Video,
    BookOpen,
    Calendar,
    ChevronRight,
    ChevronLeft,
    Clock,
    PenLine,
    Users,
} from "lucide-react"
import { StatsCard } from "./stats-card"
import { useAuth } from "@/hooks/use-auth"
import { useAcademyLiveClasses, type AcademyLiveClass } from "@/lib/api/services/academy-live-classes"
import {
    useJoinAcademyLiveSessionAsLecturer,
    academyLiveSessionsApi,
} from "@/lib/api/services/academy-live-sessions"
import { useLecturerDashboard } from "@/lib/api/services/dashboard"
import { useQueries } from "@tanstack/react-query"
import {
    format,
    startOfWeek,
    addDays,
    isSameDay,
    isToday,
    addWeeks,
    differenceInWeeks,
    parseISO,
} from "date-fns"
import { vi } from "date-fns/locale"
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover"
import { Calendar as CalendarUI } from "@workspace/ui/components/calendar"
import { cn } from "@workspace/ui/lib/utils"
import { toast } from "sonner"
import type { AcademyLiveScheduleSessionModel } from "@workspace/schemas"
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"

const MEET_URL = import.meta.env.VITE_MEET_URL || "https://meet.torii.sbs"

type SessionWithClass = AcademyLiveScheduleSessionModel & {
    className?: string
    classCode?: string
}

function getSessionClassId(session: SessionWithClass): string | undefined {
    return session.liveClassId
}

function sessionToDate(s: SessionWithClass): Date {
    const raw = s.sessionDate
    const d = typeof raw === "string" ? new Date(raw) : raw
    return Number.isNaN(d.getTime()) ? new Date() : d
}

function sessionsForDayLecturer(sessions: SessionWithClass[], day: Date) {
    return sessions
        .filter((s) => isSameDay(sessionToDate(s), day))
        .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""))
}

function LecturerTimetableSessionCard({
                                          session,
                                          onRequestJoin,
                                          joining,
                                      }: {
    session: SessionWithClass
    onRequestJoin: (s: SessionWithClass) => void
    joining: boolean
}) {
    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => onRequestJoin(session)}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onRequestJoin(session)
                }
            }}
            className="flex cursor-pointer gap-3 rounded-xl border border-border/60 bg-card p-2.5 text-left shadow-sm transition-colors hover:bg-muted/25"
        >
            <div className="flex shrink-0 flex-col items-center gap-0.5 border-r border-border/60 py-0.5 pr-3">
                <span className="text-[11px] font-black tabular-nums leading-none">{session.startTime}</span>
                <div className="min-h-[10px] w-px flex-1 bg-border" />
                <span className="text-[11px] font-black tabular-nums leading-none">{session.endTime}</span>
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                        type="button"
                        size="sm"
                        variant="default"
                        className="h-7 rounded-md px-2.5 text-[10px] font-black uppercase tracking-wide"
                        onClick={(e) => {
                            e.stopPropagation()
                            onRequestJoin(session)
                        }}
                        disabled={joining}
                    >
                        <Video className="mr-1 size-3" />
                        Vào phòng
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[10px]"
                        asChild
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Link to={`/academy/live-classes/${getSessionClassId(session)}/schedule`}>Lớp</Link>
                    </Button>
                </div>
                <div>
                    <p className="text-[13px] font-bold leading-snug text-foreground">{session.className || session.classCode || "Buổi học"}</p>
                    <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <BookOpen className="size-3 shrink-0" />
                        <span className="truncate font-mono">{session.classCode || "—"}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function LecturerDashboard() {
    const { user } = useAuth()
    const instructorId = user?.id as string | undefined

    const now = new Date()
    const fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0]
    const toDate = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString().split("T")[0]

    const { data: lecDash, isLoading: lecDashLoading } = useLecturerDashboard({
        enabled: !!instructorId,
    })

    const { data: classes = [] } = useAcademyLiveClasses({
        instructorId: instructorId as any,
    })

    const liveClassIds = useMemo(() => {
        // Chỉ lấy những lớp đang tuyển sinh hoặc đang diễn ra
        return classes
            .filter((c) => ["OPENING", "IN_PROGRESS"].includes(c.status))
            .map((c) => c.id)
    }, [classes])

    const classMap = useMemo(() => {
        const m: Record<string, AcademyLiveClass> = {}
        classes.forEach((c) => { m[c.id] = c })
        return m
    }, [classes])

    const sessionQueries = useQueries({
        queries: liveClassIds.slice(0, 15).map((liveClassId) => ({
            queryKey: ["academy-live-sessions", liveClassId, fromDate, toDate],
            queryFn: () => academyLiveSessionsApi.findAll({ liveClassId, from: fromDate, to: toDate }),
            enabled: !!liveClassId && !!instructorId,
        })),
    })

    const allSessions = useMemo(() => {
        const results: SessionWithClass[] = []
        sessionQueries.forEach((q, idx) => {
            if (q.data && Array.isArray(q.data) && liveClassIds[idx]) {
                const cls = classMap[liveClassIds[idx]]
                q.data.forEach((s: AcademyLiveScheduleSessionModel) => {
                    results.push({
                        ...s,
                        className: cls?.name,
                        classCode: cls?.code,
                    })
                })
            }
        })
        return results
    }, [sessionQueries, liveClassIds, classMap])

    const upcomingSessions = useMemo(() => {
        const today = now.toISOString().split("T")[0]
        return allSessions
            .filter((s) => {
                const d = typeof s.sessionDate === "string" ? s.sessionDate : (s.sessionDate as Date).toISOString().split("T")[0]
                return d >= today
            })
            .sort((a, b) => {
                const dA = typeof a.sessionDate === "string" ? a.sessionDate : (a.sessionDate as Date).toISOString().split("T")[0]
                const dB = typeof b.sessionDate === "string" ? b.sessionDate : (b.sessionDate as Date).toISOString().split("T")[0]
                if (dA !== dB) return dA.localeCompare(dB)
                return (a.startTime || "").localeCompare(b.startTime || "")
            })
    }, [allSessions, now])

    const timetableSessions = useMemo(() => {
        return [...allSessions].sort((a, b) => {
            const dA = typeof a.sessionDate === "string" ? a.sessionDate : (a.sessionDate as Date).toISOString().split("T")[0]
            const dB = typeof b.sessionDate === "string" ? b.sessionDate : (b.sessionDate as Date).toISOString().split("T")[0]
            if (dA !== dB) return dA.localeCompare(dB)
            return (a.startTime || "").localeCompare(b.startTime || "")
        })
    }, [allSessions])

    const [weekOffset, setWeekOffset] = useState(0)
    const [joinTarget, setJoinTarget] = useState<SessionWithClass | null>(null)

    const weekStart = useMemo(
        () => startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 }),
        [weekOffset]
    )
    const days = useMemo(
        () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
        [weekStart]
    )
    const weekEnd = addDays(weekStart, 6)

    const weekSessions = useMemo(() => {
        return timetableSessions.filter((s) => {
            const d = sessionToDate(s)
            return days.some((day) => isSameDay(d, day))
        })
    }, [timetableSessions, days])

    const sessionsLoading = sessionQueries.some((q) => q.isLoading)
    const joinMutation = useJoinAcademyLiveSessionAsLecturer()
    const nextSession = upcomingSessions[0]

    const handleJoinSession = async (sessionId: string) => {
        try {
            const data = await joinMutation.mutateAsync(sessionId)
            if (data?.token) {
                window.open(`${MEET_URL}?access_token=${data.token}`, "_blank", "noopener,noreferrer")
                setJoinTarget(null)
            } else {
                toast.error("Không lấy được token để vào phòng học.")
            }
        } catch (err: any) {
            toast.error(err?.userMessage || "Không thể vào phòng học.")
        }
    }

    const formatDateLabel = (dateStr: string | Date) => {
        try {
            const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr
            return format(d, "EEE, dd/MM", { locale: vi })
        } catch {
            return String(dateStr)
        }
    }

    const formatSubmittedAt = (iso: string) => {
        try {
            return format(parseISO(iso), "dd/MM/yyyy HH:mm", { locale: vi })
        } catch {
            return iso
        }
    }

    return (
        <div className="mx-auto w-full min-w-0 max-w-7xl space-y-5 sm:space-y-6">
            <AlertDialog open={!!joinTarget} onOpenChange={(open) => !open && setJoinTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Mở phòng dạy trực tuyến?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-2 text-sm text-muted-foreground">
                                <p>
                                    Bạn sắp vào phòng meeting cho lớp{" "}
                                    <span className="font-medium text-foreground">
                                        {joinTarget?.className || joinTarget?.classCode || "buổi học"}
                                    </span>
                                    {joinTarget?.classCode ? (
                                        <>
                                            {" "}
                                            (<span className="font-mono">{joinTarget.classCode}</span>)
                                        </>
                                    ) : null}
                                    .
                                </p>
                                {joinTarget && (
                                    <p className="tabular-nums">
                                        {formatDateLabel(joinTarget.sessionDate)} · {joinTarget.startTime}–{joinTarget.endTime}
                                    </p>
                                )}
                                <p>Tiếp tục để mở tab phòng học.</p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel type="button">Hủy</AlertDialogCancel>
                        <Button
                            type="button"
                            disabled={!joinTarget || joinMutation.isPending}
                            onClick={() => joinTarget && void handleJoinSession(joinTarget.id)}
                        >
                            {joinMutation.isPending ? "Đang mở…" : "Vào phòng"}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {nextSession && (
                <Card>
                    <CardHeader>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <Badge variant="secondary" className="mb-2">
                                    Buổi học sắp tới
                                </Badge>
                                <CardTitle>{nextSession.className || nextSession.classCode || "Buổi học"}</CardTitle>
                                <CardDescription>
                                    {formatDateLabel(nextSession.sessionDate)} • {nextSession.startTime}–{nextSession.endTime}
                                    {nextSession.classCode && ` • ${nextSession.classCode}`}
                                </CardDescription>
                            </div>
                            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
                                <Button className="w-full sm:w-auto" onClick={() => setJoinTarget(nextSession)} disabled={joinMutation.isPending}>
                                    <Video className="size-4 mr-2" />
                                    Vào phòng học
                                </Button>
                                <Button variant="outline" className="w-full sm:w-auto" asChild>
                                    <Link to={`/academy/live-classes/${getSessionClassId(nextSession)}/schedule`}>
                                        Lịch & Điểm danh
                                        <ChevronRight className="size-4 ml-1" />
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                </Card>
            )}

            <div>
                <h2 className="text-base font-semibold tracking-tight">Tóm tắt nhanh</h2>
                <p className="text-xs text-muted-foreground">
                    Số liệu từ lịch lớp (client) và từ hệ thống (bài nộp chờ chấm, buổi hôm nay, học viên).
                </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-6">
                <StatsCard
                    title="Bài chờ chấm"
                    value={lecDashLoading ? "—" : (lecDash?.stats.pendingSubmissionsToGrade ?? 0)}
                    sub="Đã nộp, chưa có điểm"
                    icon={PenLine}
                    tone="warning"
                    highlight={(lecDash?.stats.pendingSubmissionsToGrade ?? 0) > 0}
                />
                <StatsCard
                    title="Buổi dạy hôm nay"
                    value={lecDashLoading ? "—" : (lecDash?.stats.todaySessions ?? 0)}
                    sub="Đã lên lịch/điều chỉnh, có phòng"
                    icon={Calendar}
                    tone="info"
                />
                <StatsCard
                    title="Học viên (lớp tôi)"
                    value={lecDashLoading ? "—" : (lecDash?.stats.studentsInMyClasses ?? 0)}
                    sub="Học viên đang học"
                    icon={Users}
                    tone="primary"
                />
                <StatsCard
                    title="Lớp đang mở"
                    value={lecDashLoading ? "—" : (lecDash?.stats.activeLiveClasses ?? 0)}
                    sub="Mở tuyển + Đang vận hành"
                    icon={BookOpen}
                    tone="success"
                />
            </div>

            {(lecDash?.pendingSubmissionsPreview?.length ?? 0) > 0 ? (
                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Bài nộp cần chấm</CardTitle>
                        <CardDescription className="text-xs">
                            Bài tập lớp trực tiếp/tự học do bạn phụ trách — mở trang chấm điểm
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {lecDash!.pendingSubmissionsPreview.map((row) => (
                            <div
                                key={row.submissionId}
                                className="flex flex-col gap-2 rounded-lg border border-border/60 bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="min-w-0 space-y-0.5">
                                    <p className="truncate text-sm font-semibold text-foreground">{row.assignmentTitle}</p>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {row.contextLabel} · {row.studentDisplayName}
                                    </p>
                                    <p className="text-[11px] tabular-nums text-muted-foreground">
                                        Nộp: {formatSubmittedAt(row.submittedAt)}
                                    </p>
                                </div>
                                {row.liveClassId ? (
                                    <Button variant="outline" size="sm" className="shrink-0" asChild>
                                        <Link
                                            to={`/academy/live-classes/${row.liveClassId}/assignments/${row.liveClassAssignmentId}/submissions`}
                                        >
                                            Chấm bài
                                            <ChevronRight className="ml-1 size-4" />
                                        </Link>
                                    </Button>
                                ) : (
                                    <Button variant="outline" size="sm" className="shrink-0" asChild>
                                        <Link to="/academy/live-classes">Mở lớp / gói tự học</Link>
                                    </Button>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            ) : null}

            <Card className="border-border/60 shadow-sm">
                <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <CardTitle>Thời khóa biểu</CardTitle>
                        <CardDescription>
                            Lịch dạy theo tuần · Tuần {format(weekStart, "dd/MM/yyyy")} – {format(weekEnd, "dd/MM/yyyy")}
                        </CardDescription>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5 rounded-xl border border-border/50 bg-muted/40 p-0.5">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg"
                            onClick={() => setWeekOffset((o) => o - 1)}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 gap-1.5 rounded-lg px-2 text-xs font-bold"
                                >
                                    <Calendar className="h-3.5 w-3.5 text-primary" />
                                    <span className="tabular-nums">
                                        {format(weekStart, "dd/MM")} – {format(weekEnd, "dd/MM")}
                                    </span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto rounded-2xl border-border/40 p-0 shadow-2xl" align="end">
                                <CalendarUI
                                    mode="single"
                                    selected={weekStart}
                                    onSelect={(date) => {
                                        if (date) {
                                            const offset = differenceInWeeks(
                                                startOfWeek(date, { weekStartsOn: 1 }),
                                                startOfWeek(new Date(), { weekStartsOn: 1 })
                                            )
                                            setWeekOffset(offset)
                                        }
                                    }}
                                    initialFocus
                                    locale={vi}
                                    className="p-3"
                                />
                            </PopoverContent>
                        </Popover>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 rounded-lg px-2 text-[10px] font-bold uppercase tracking-wide"
                            onClick={() => setWeekOffset(0)}
                        >
                            Hiện tại
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg"
                            onClick={() => setWeekOffset((o) => o + 1)}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {sessionsLoading ? (
                        <div className="space-y-2">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Skeleton key={i} className="h-12 w-full rounded-xl" />
                            ))}
                        </div>
                    ) : timetableSessions.length === 0 ? (
                        <Empty>
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <Calendar className="size-4" />
                                </EmptyMedia>
                                <EmptyTitle>Chưa có lịch dạy</EmptyTitle>
                                <EmptyDescription>Chưa có buổi học nào trong khoảng thời gian này.</EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <Button variant="outline" asChild>
                                    <Link to="/academy/live-classes">Xem Lớp của tôi</Link>
                                </Button>
                            </EmptyContent>
                        </Empty>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-[11px] font-semibold text-muted-foreground">
                                <Clock className="mr-1 inline size-3 align-text-bottom" />
                                Lịch dạy trong tuần hiện tại
                            </p>
                            <div className="space-y-3">
                                {days.map((day) => {
                                    const daySessions = sessionsForDayLecturer(weekSessions, day)
                                    if (daySessions.length === 0) return null
                                    const todayDay = isToday(day)
                                    return (
                                        <div
                                            key={format(day, "yyyy-MM-dd")}
                                            className={cn(
                                                "rounded-xl border border-border/60 bg-card p-3 shadow-sm sm:p-4",
                                                todayDay && "border-primary/40 bg-primary/[0.03]"
                                            )}
                                        >
                                            <div className="mb-3 flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-black tabular-nums text-foreground">
                                                        {format(day, "EEEE, dd/MM", { locale: vi })}
                                                    </p>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        {daySessions.length} buổi dạy
                                                    </p>
                                                </div>
                                                {todayDay && (
                                                    <Badge variant="secondary" className="text-[10px] font-bold">
                                                        Hôm nay
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                {daySessions.map((s) => (
                                                    <LecturerTimetableSessionCard
                                                        key={s.id}
                                                        session={s}
                                                        onRequestJoin={setJoinTarget}
                                                        joining={joinMutation.isPending}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })}
                                {weekSessions.length === 0 && (
                                    <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-4 text-center text-sm text-muted-foreground">
                                        Tuần này chưa có buổi dạy nào.
                                    </div>
                                )}
                            </div>

                            <Button variant="outline" size="sm" className="w-full" asChild>
                                <Link to="/academy/live-classes">Quản lý tất cả lớp</Link>
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
