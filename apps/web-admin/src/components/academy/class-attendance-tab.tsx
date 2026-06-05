import { useState, useMemo } from "react"
import { useParams } from "react-router-dom"
import { useAcademyLiveClass } from "@/lib/api/services/academy-live-classes"
import { useAcademyEnrollments } from "@/lib/api/services/academy-enrollments"
import { useAcademyLiveSessions, useJoinAcademyLiveSessionAsLecturer } from "@/lib/api/services/academy-live-sessions"
import { useAcademyClassAttendances, useCreateAcademyClassAttendance } from "@/lib/api/services/academy-class-attendances"
import { useAcademyLiveSchedules } from "@/lib/api/services/academy-live-schedules"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import { Calendar, Clock, CheckCircle2, XCircle, AlertCircle, Bookmark, ChevronRight, Settings2, CalendarSync, Video, Plus } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@workspace/ui/components/dialog"
import { format, isSameDay, isBefore, startOfDay } from "date-fns"
import { vi } from "date-fns/locale"
import { cn } from "@workspace/ui/lib/utils"
import { ClassScheduleSheet } from "@/components/academy/class-schedule-sheet"
import { ClassRescheduleRequestSheet } from "@/components/academy/class-reschedule-request-sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { useAuth } from "@/hooks/use-auth"
import { usePermissions } from "@/hooks/use-permissions"
import { useAcademyLiveScheduleRequests, useApproveAcademyLiveScheduleRequest, useRejectAcademyLiveScheduleRequest } from "@/lib/api/services/academy-live-schedule-requests"
import { toast } from "sonner"
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"

import type { AcademyEnrollment } from "@/lib/api/services/academy-enrollments"
import type { AcademyLiveScheduleSessionModel } from "@workspace/schemas"
import type { AcademyLiveClass } from "@/lib/api/services/academy-live-classes"
import type { AcademyLiveScheduleRequest } from "@/lib/api/services/academy-live-schedule-requests"

const WEEKDAY_MAP: Record<number, string> = {
    0: "Chủ Nhật",
    1: "Thứ Hai",
    2: "Thứ Ba",
    3: "Thứ Tư",
    4: "Thứ Năm",
    5: "Thứ Sáu",
    6: "Thứ Bảy",
}

interface ClassAttendanceTabProps {
    liveClassId?: string
    academyClass?: AcademyLiveClass
}

export function ClassAttendanceTab({ liveClassId: propLiveClassId, academyClass: propAcademyClass }: ClassAttendanceTabProps) {
    const params = useParams()
    const liveClassId = propLiveClassId || params.liveClassId || ""

    // Dynamic date range for sessions (past 6 months to future 1 year)
    const now = new Date()
    const fromDate = new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString().split("T")[0]
    const toDate = new Date(now.getFullYear(), now.getMonth() + 12, 1).toISOString().split("T")[0]

    useAuth()
    const { canAny, hasWildcard } = usePermissions()
    const isLecturer =
        canAny(["lms.assessment.grade"]) &&
        !canAny([
            "lms.catalog.update",
            "lms.catalog.approve",
            "lms.delivery.approve",
            "lms.commerce.update",
            "lms.commerce.approve",
            "ops.user.manage",
            "ops.order.manage",
            "ops.coupon.manage",
        ]) &&
        !hasWildcard
    const isStaffOrAdmin = hasWildcard || canAny([
        "lms.delivery.approve",
        "lms.catalog.update",
        "lms.commerce.update",
        "ops.user.manage",
    ])

    const { data: fetchedClass } = useAcademyLiveClass(propAcademyClass ? undefined : liveClassId)
    const academyClass = propAcademyClass || fetchedClass

    const { data: enrollmentsData = [] } = useAcademyEnrollments({ liveClassId, page: 1, limit: 100 })
    const { data: sessions = [] } = useAcademyLiveSessions({
        liveClassId,
        from: fromDate,
        to: toDate
    })
    const { data: attendanceData } = useAcademyClassAttendances({
        page: 1,
        limit: 100,
        liveClassId: liveClassId || undefined,
    })
    const { data: schedules = [] } = useAcademyLiveSchedules({ liveClassId })
    const { data: allRequests = [] } = useAcademyLiveScheduleRequests({ liveClassId })
    const requests = allRequests.filter(r => r.liveClassId === liveClassId || r.session?.liveClassId === liveClassId)

    const enrollments = enrollmentsData as AcademyEnrollment[]
    const attendances = attendanceData?.items || []
    const createAttendanceMutation = useCreateAcademyClassAttendance()
    const approveRequestMutation = useApproveAcademyLiveScheduleRequest()
    const rejectRequestMutation = useRejectAcademyLiveScheduleRequest()

    const [selectedSessionId, setSelectedSessionId] = useState<string>("")
    const [joinTarget, setJoinTarget] = useState<AcademyLiveScheduleSessionModel | null>(null)
    const [scheduleSheetOpen, setScheduleSheetOpen] = useState(false)
    const [rescheduleSheetOpen, setRescheduleSheetOpen] = useState(false)
    const [selectedSessionForReschedule, setSelectedSessionForReschedule] = useState<AcademyLiveScheduleSessionModel | null>(null)
    const [selectedLearner, setSelectedLearner] = useState<AcademyEnrollment | null>(null)

    // Compute attendance summary for selected learner
    const learnerSummary = useMemo(() => {
        if (!selectedLearner) return null
        const userId = selectedLearner.userId
        const totalSessions = sessions.length
        const completedSessions = sessions.filter((s: any) => s.status === "COMPLETED")
        const userAttendances = attendances.filter((a: any) => a.userId === userId)

        const presentCount = userAttendances.filter((a: any) => a.status === "PRESENT").length
        const lateCount = userAttendances.filter((a: any) => a.status === "LATE").length
        const absentCount = userAttendances.filter((a: any) => a.status === "ABSENT").length
        const excusedCount = userAttendances.filter((a: any) => a.status === "EXCUSED").length
        const recordedCount = presentCount + lateCount + absentCount + excusedCount
        const notRecordedCount = completedSessions.length - recordedCount
        const attendanceRate = completedSessions.length > 0
            ? Math.round((presentCount + lateCount) / completedSessions.length * 100)
            : 0

        return {
            totalSessions,
            completedSessions: completedSessions.length,
            presentCount,
            lateCount,
            absentCount,
            excusedCount,
            notRecordedCount: Math.max(0, notRecordedCount),
            attendanceRate,
        }
    }, [selectedLearner, sessions, attendances])

    const activeEnrollments = enrollments.filter((en) => en.status === "ACTIVE")
    const hasSchedules = schedules && schedules.length > 0

    const joinMutation = useJoinAcademyLiveSessionAsLecturer()

    const formatDateLabel = (dateStr: string) => {
        try {
            return format(new Date(dateStr), "EEEE, dd/MM/yyyy", { locale: vi })
        } catch (e) {
            return dateStr
        }
    }

    const getStatusIcon = (status?: string) => {
        switch (status) {
            case "PRESENT": return <CheckCircle2 className="h-5 w-5 text-emerald-500 shadow-sm" />
            case "ABSENT": return <XCircle className="h-5 w-5 text-destructive shadow-sm" />
            case "LATE": return <Clock className="h-5 w-5 text-amber-500 shadow-sm" />
            case "EXCUSED": return <Bookmark className="h-5 w-5 text-blue-500 shadow-sm" />
            default: return <div className="h-5 w-5 rounded-full border-2 border-dashed border-muted-foreground/30" />
        }
    }

    const handleStatusChange = (userId: string, sessionId: string, status: string) => {
        createAttendanceMutation.mutate({
            sessionId,
            userId,
            status: status as any
        }, {
            onError: (error: any) => toast.error(error.userMessage || "Lỗi khi điểm danh")
        })
    }

    const handleApproveRequest = (id: string) => {
        approveRequestMutation.mutate({ id, input: { reviewNote: "Ghi chú duyệt tự động" } }, {
            onSuccess: () => toast.success("Đã phê duyệt yêu cầu"),
            onError: (error: any) => toast.error(error.userMessage || "Lỗi khi phê duyệt yêu cầu")
        })
    }

    const handleRejectRequest = (id: string) => {
        rejectRequestMutation.mutate({ id, input: { reviewNote: "Yêu cầu bị từ chối" } }, {
            onSuccess: () => toast.success("Đã từ chối yêu cầu"),
            onError: (error: any) => toast.error(error.userMessage || "Lỗi khi từ chối yêu cầu")
        })
    }

    const getRequestStatusBadge = (status: string) => {
        switch (status) {
            case "PENDING": return <Badge variant="warning">Chờ duyệt</Badge>
            case "APPROVED": return <Badge variant="success">Đã duyệt</Badge>
            case "REJECTED": return <Badge variant="destructive">Từ chối</Badge>
            case "CANCELLED": return <Badge variant="secondary">Đã hủy</Badge>
            default: return <Badge variant="outline">{status}</Badge>
        }
    }

    const MEET_URL = import.meta.env.VITE_MEET_URL || "https://meet.torii.sbs"

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

    return (
        <div className="space-y-6">
            {/* Learner Attendance Summary Dialog */}
            <Dialog open={!!selectedLearner} onOpenChange={(open) => !open && setSelectedLearner(null)}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0 text-primary font-semibold text-sm">
                                {(selectedLearner as any)?.user?.displayName?.charAt(0) || "H"}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-base font-semibold truncate">
                                    {(selectedLearner as any)?.user?.displayName || "Học viên"}
                                </span>
                                <span className="text-xs text-muted-foreground font-normal">
                                    Thống kê điểm danh trong lớp {academyClass?.code}
                                </span>
                            </div>
                        </DialogTitle>
                    </DialogHeader>

                    {learnerSummary && (
                        <div className="space-y-5 pt-2">
                            {/* Attendance rate bar */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-baseline">
                                    <span className="text-sm font-medium text-muted-foreground">Tỷ lệ tham gia</span>
                                    <span className="text-2xl font-bold tabular-nums text-primary">{learnerSummary.attendanceRate}%</span>
                                </div>
                                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                                        style={{ width: `${learnerSummary.attendanceRate}%` }}
                                    />
                                </div>
                                <p className="text-[10px] text-muted-foreground">
                                    {learnerSummary.completedSessions} / {learnerSummary.totalSessions} buổi đã diễn ra
                                </p>
                            </div>

                            {/* Stats grid */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="rounded-xl border bg-emerald-50/50 dark:bg-emerald-950/20 p-3 text-center space-y-1 border-emerald-200/50">
                                    <CheckCircle2 className="h-5 w-5 mx-auto text-emerald-500" />
                                    <p className="text-xl font-bold tabular-nums text-emerald-600">{learnerSummary.presentCount}</p>
                                    <p className="text-[10px] font-medium text-emerald-600/80">Có mặt</p>
                                </div>
                                <div className="rounded-xl border bg-amber-50/50 dark:bg-amber-950/20 p-3 text-center space-y-1 border-amber-200/50">
                                    <Clock className="h-5 w-5 mx-auto text-amber-500" />
                                    <p className="text-xl font-bold tabular-nums text-amber-600">{learnerSummary.lateCount}</p>
                                    <p className="text-[10px] font-medium text-amber-600/80">Đi muộn</p>
                                </div>
                                <div className="rounded-xl border bg-red-50/50 dark:bg-red-950/20 p-3 text-center space-y-1 border-red-200/50">
                                    <XCircle className="h-5 w-5 mx-auto text-red-500" />
                                    <p className="text-xl font-bold tabular-nums text-red-600">{learnerSummary.absentCount}</p>
                                    <p className="text-[10px] font-medium text-red-600/80">Vắng mặt</p>
                                </div>
                                <div className="rounded-xl border bg-blue-50/50 dark:bg-blue-950/20 p-3 text-center space-y-1 border-blue-200/50">
                                    <Bookmark className="h-5 w-5 mx-auto text-blue-500" />
                                    <p className="text-xl font-bold tabular-nums text-blue-600">{learnerSummary.excusedCount}</p>
                                    <p className="text-[10px] font-medium text-blue-600/80">Có phép</p>
                                </div>
                                <div className="rounded-xl border bg-muted/30 p-3 text-center space-y-1">
                                    <AlertCircle className="h-5 w-5 mx-auto text-muted-foreground/60" />
                                    <p className="text-xl font-bold tabular-nums text-muted-foreground">{learnerSummary.notRecordedCount}</p>
                                    <p className="text-[10px] font-medium text-muted-foreground/80">Chưa điểm danh</p>
                                </div>
                                <div className="rounded-xl border bg-primary/5 p-3 text-center space-y-1 border-primary/20">
                                    <Calendar className="h-5 w-5 mx-auto text-primary/60" />
                                    <p className="text-xl font-bold tabular-nums text-primary">{learnerSummary.totalSessions}</p>
                                    <p className="text-[10px] font-medium text-primary/80">Tổng buổi</p>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
            <AlertDialog open={!!joinTarget} onOpenChange={(open) => !open && setJoinTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Mở phòng dạy trực tuyến?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-2 text-sm text-muted-foreground">
                                <p>
                                    Bạn sắp vào phòng meeting cho buổi học của lớp{" "}
                                    <span className="font-medium text-foreground">
                                        {academyClass?.name || academyClass?.code || "Buổi học"}
                                    </span>
                                    {academyClass?.code ? (
                                        <>
                                            {" "}
                                            (<span className="font-mono">{academyClass.code}</span>)
                                        </>
                                    ) : null}
                                    .
                                </p>
                                {joinTarget && (
                                    <p className="tabular-nums">
                                        {formatDateLabel(String(joinTarget.sessionDate))} · {joinTarget.startTime}–{joinTarget.endTime}
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
            <ClassScheduleSheet
                open={scheduleSheetOpen}
                onOpenChange={setScheduleSheetOpen}
                liveClassId={liveClassId}
            />

            {selectedSessionForReschedule && (
                <ClassRescheduleRequestSheet
                    open={rescheduleSheetOpen}
                    onOpenChange={setRescheduleSheetOpen}
                    session={selectedSessionForReschedule}
                />
            )}

            <Tabs defaultValue="sessions" className="w-full">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <TabsList className="mb-6 overflow-x-auto whitespace-nowrap">
                        <TabsTrigger value="sessions" className="gap-2">
                            <Calendar className="size-4" />
                            Buổi học & Điểm danh
                        </TabsTrigger>
                        <TabsTrigger value="requests" className="gap-2">
                            <CalendarSync className="size-4" />
                            Yêu cầu dời lịch nghỉ
                        </TabsTrigger>
                        {isStaffOrAdmin && (
                            <TabsTrigger value="schedule" className="gap-2">
                                <Settings2 className="size-4" />
                                Thiết lập lịch học
                            </TabsTrigger>
                        )}
                    </TabsList>

                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-[10px] px-2.5 py-0.5 bg-background border-primary/30 text-primary uppercase tracking-tighter shadow-sm">
                            {academyClass?.code}
                        </Badge>
                        <Badge variant="secondary" className="flex items-center gap-1.5 px-2.5 py-0.5 font-medium bg-primary/10 text-primary border-primary/20 border">
                            <Video className="size-3" />
                            {academyClass?.mode}
                        </Badge>
                    </div>
                </div>

                <TabsContent value="sessions" className="space-y-6 focus-visible:outline-none focus-visible:ring-0">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="md:col-span-1 shadow-md overflow-hidden flex flex-col max-h-[750px] border-primary/5">
                            <CardHeader className="pb-3 border-b bg-muted/20 shrink-0 px-4">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2 bg-primary/10 rounded-xl shadow-inner border border-primary/20">
                                            <Calendar className="size-4 text-primary" />
                                        </div>
                                        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                            Danh sách buổi học
                                        </CardTitle>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] bg-primary/5 border-primary/20 text-primary font-medium">{sessions.length} buổi</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 flex-1 overflow-hidden">
                                <ScrollArea className="h-[650px]">
                                    <div className="divide-y divide-muted/50">
                                        {sessions.map((s: any) => (
                                            <div
                                                key={s.id}
                                                className={cn(
                                                    "w-full text-left p-4 hover:bg-primary/[0.02] transition-all flex items-center justify-between group relative border-l-4 border-transparent cursor-pointer",
                                                    selectedSessionId === s.id && "bg-primary/[0.04] border-primary"
                                                )}
                                                onClick={() => setSelectedSessionId(s.id)}
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-col gap-2">
                                                        <span className={cn(
                                                            "font-medium text-sm tracking-tight leading-none",
                                                            selectedSessionId === s.id ? "text-primary" : "text-foreground"
                                                        )}>
                                                            {formatDateLabel(s.sessionDate)}
                                                        </span>
                                                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium bg-muted/40 w-fit px-2.5 py-1 rounded-full border border-muted/30">
                                                            <Clock className="h-3 w-3 text-primary opacity-60" /> {s.startTime} - {s.endTime}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5 ml-2">
                                                    {isLecturer && (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-8 w-8 text-primary hover:text-primary bg-background border-primary/40 hover:bg-primary/10 rounded-full"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setJoinTarget(s)
                                                            }}
                                                            title="Vào phòng dạy"
                                                        >
                                                            <Video className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    {isLecturer && !isBefore(new Date(s.sessionDate), startOfDay(new Date())) && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all text-primary hover:bg-primary/20 hover:scale-110 active:scale-95 rounded-full"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setSelectedSessionForReschedule(s)
                                                                setRescheduleSheetOpen(true)
                                                            }}
                                                            title="Yêu cầu dời lịch / Nghỉ"
                                                        >
                                                            <CalendarSync className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    <ChevronRight className={cn(
                                                        "h-4 w-4 text-muted-foreground/20 transition-all group-hover:translate-x-1",
                                                        selectedSessionId === s.id && "text-primary opacity-100"
                                                    )} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        <Card className="md:col-span-2 shadow-sm flex flex-col overflow-hidden leading-relaxed">
                            <CardHeader className="pb-3 border-b bg-muted/30 shrink-0 px-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <CardTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
                                            <div className="p-1.5 bg-emerald-100 rounded-md">
                                                <CheckCircle2 className="size-4 text-emerald-600" />
                                            </div>
                                            Ghi nhận điểm danh
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            {!selectedSessionId
                                                ? "Vui lòng chọn một buổi học từ danh sách bên trái để thực hiện ghi nhận."
                                                : `Phiên học đang ghi nhận cho ${activeEnrollments.length} học viên chính thức.`}
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 flex-1 overflow-hidden">
                                {!selectedSessionId ? (
                                    <div className="py-40 text-center text-muted-foreground flex flex-col items-center gap-6 bg-muted/5">
                                        <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center shadow-inner">
                                            <Calendar className="h-10 w-10 opacity-20" />
                                        </div>
                                        <div className="space-y-1 max-w-[280px]">
                                            <p className="font-medium text-foreground">Chưa chọn buổi học</p>
                                            <p className="text-xs italic leading-relaxed">Hãy chọn một ngày học từ danh sách để xem danh sách học viên và thực hiện điểm danh.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <ScrollArea className="h-[650px]">
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader className="bg-muted/50 sticky top-0 z-10">
                                                    <TableRow>
                                                        <TableHead className="pl-6 py-4 text-xs font-semibold uppercase tracking-wide">Học viên</TableHead>
                                                        <TableHead className="w-[200px] py-4 text-xs font-semibold uppercase tracking-wide">Ghi nhận trạng thái</TableHead>
                                                        <TableHead className="w-[80px] pr-6 py-4 text-center text-xs font-semibold uppercase tracking-wide">Kết quả</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {activeEnrollments.length ? (
                                                        activeEnrollments.map((en: any) => {
                                                            const selectedSession = sessions.find((s: any) => s.id === selectedSessionId)
                                                            const isTodaySession = selectedSession ? isSameDay(new Date(selectedSession.sessionDate), new Date()) : false
                                                            const canMarkAttendance = isStaffOrAdmin || isTodaySession

                                                            const attendance = attendances.find((a: any) => a.userId === en.userId && a.sessionId === selectedSessionId)
                                                            return (
                                                                <TableRow key={en.id} className="group hover:bg-muted/10 transition-colors border-b last:border-0">
                                                                    <TableCell className="pl-6 py-4">
                                                                        <div
                                                                            className="flex items-center gap-3 cursor-pointer group/learner rounded-lg -m-1 p-1 hover:bg-primary/5 transition-colors"
                                                                            onClick={() => setSelectedLearner(en)}
                                                                            title="Xem thống kê điểm danh"
                                                                        >
                                                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0 overflow-hidden text-primary font-semibold shadow-sm text-sm group-hover/learner:ring-2 group-hover/learner:ring-primary/30 transition-all">
                                                                                {en.user?.displayName?.charAt(0) || en.user?.username?.charAt(0) || "H"}
                                                                            </div>
                                                                            <div className="flex flex-col min-w-0">
                                                                                <span className="font-medium text-sm text-foreground truncate group-hover/learner:text-primary transition-colors">{en.user?.displayName || en.user?.username || "Học viên"}</span>
                                                                                <span className="text-[10px] text-muted-foreground font-mono bg-muted/50 px-1 rounded w-fit">ID: {en.userId.substring(0, 8)}</span>
                                                                            </div>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="py-4">
                                                                        <Select
                                                                            value={attendance?.status || ""}
                                                                            onValueChange={(val) => handleStatusChange(en.userId, selectedSessionId, val)}
                                                                            disabled={createAttendanceMutation.isPending || !canMarkAttendance}
                                                                        >
                                                                            <SelectTrigger className={cn(
                                                                                "h-9 w-full shadow-sm hover:border-primary/50 transition-colors",
                                                                                !attendance?.status && "text-muted-foreground italic border-dashed bg-muted/20",
                                                                                !canMarkAttendance && "bg-muted/50 cursor-not-allowed opacity-70"
                                                                            )}>
                                                                                <SelectValue placeholder="Chưa điểm danh" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value="PRESENT" className="text-emerald-600 focus:text-emerald-700 font-medium">Có mặt</SelectItem>
                                                                                <SelectItem value="ABSENT" className="text-destructive focus:text-destructive font-medium">Vắng mặt</SelectItem>
                                                                                <SelectItem value="LATE" className="text-amber-600 focus:text-amber-700 font-medium">Đi muộn</SelectItem>
                                                                                <SelectItem value="EXCUSED" className="text-blue-600 focus:text-blue-700 font-medium">Có phép</SelectItem>
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </TableCell>
                                                                    <TableCell className="pr-6 py-4 text-center">
                                                                        <div className="flex justify-center scale-110 drop-shadow-sm">
                                                                            {getStatusIcon(attendance?.status)}
                                                                        </div>
                                                                    </TableCell>
                                                                </TableRow>
                                                            )
                                                        })
                                                    ) : (
                                                        <TableRow>
                                                            <TableCell colSpan={3} className="text-center py-20 text-muted-foreground italic bg-muted/5">
                                                                Lớp học hiện tại chưa có học viên nào hoạt động.
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </ScrollArea>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="requests" className="space-y-6 focus-visible:outline-none focus-visible:ring-0">
                    <Card className="shadow-md border-primary/5 overflow-hidden">
                        <CardHeader className="bg-muted/20 border-b p-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <CalendarSync className="size-5 text-primary" />
                                </div>
                                <div className="space-y-1">
                                    <CardTitle className="text-lg font-semibold">Danh sách yêu cầu dời lịch</CardTitle>
                                    <CardDescription>Theo dõi và xử lý các yêu cầu dời lịch học từ giảng viên.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="pl-6">Buổi học gốc</TableHead>
                                        <TableHead>Loại yêu cầu</TableHead>
                                        <TableHead>Đề xuất thay đổi</TableHead>
                                        <TableHead>Trạng thái</TableHead>
                                        <TableHead className="pr-6 text-right">Thao tác</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {requests.length > 0 ? (
                                        requests.map((req: AcademyLiveScheduleRequest) => (
                                            <TableRow key={req.id} className="hover:bg-muted/5 transition-colors">
                                                <TableCell className="pl-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-sm">{req.session ? formatDateLabel(req.session.sessionDate) : "—"}</span>
                                                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">{req.session?.startTime} - {req.session?.endTime}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="default" className="text-[10px] font-medium">
                                                        Dời lịch
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-sm text-primary">{req.proposedDate ? format(new Date(req.proposedDate), "dd/MM/yyyy") : "—"}</span>
                                                        <span className="text-[10px] text-primary/70 font-semibold">{req.proposedStartTime} - {req.proposedEndTime}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {getRequestStatusBadge(req.status)}
                                                </TableCell>
                                                <TableCell className="pr-6 text-right">
                                                    {isStaffOrAdmin && req.status === 'PENDING' ? (
                                                        <div className="flex justify-end gap-2">
                                                            <Button size="sm" variant="outline" className="h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 font-medium" onClick={() => handleApproveRequest(req.id)}>Duyệt</Button>
                                                            <Button size="sm" variant="outline" className="h-8 text-destructive hover:bg-destructive/5 font-medium" onClick={() => handleRejectRequest(req.id)}>Từ chối</Button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] text-muted-foreground italic">
                                                            {req.status === 'PENDING' ? 'Chờ xử lý' : 'Đã xử lý'}
                                                        </span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="py-20 text-center text-muted-foreground italic bg-muted/5">
                                                Hiện tại chưa có yêu cầu nào được gửi.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="schedule" className="space-y-6 focus-visible:outline-none focus-visible:ring-0">
                    <Card className="shadow-sm overflow-hidden">
                        <CardHeader className="border-b p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Calendar className="size-5 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-base font-semibold">Thời khóa biểu định kỳ</CardTitle>
                                    <CardDescription className="text-xs">
                                        Lịch học lặp lại theo tuần (nguồn dữ liệu tạo buổi học).
                                    </CardDescription>
                                </div>
                            </div>
                            <Button size="sm" variant="outline" className="gap-2" onClick={() => setScheduleSheetOpen(true)}>
                                <Settings2 className="size-4" />
                                Thiết lập lịch học
                            </Button>
                        </CardHeader>

                        <CardContent className="p-6">
                            {hasSchedules ? (
                                <div className="space-y-3">
                                    {[...schedules]
                                        .sort((a: any, b: any) => a.weekday - b.weekday)
                                        .map((s: any) => (
                                            <div
                                                key={s.id}
                                                className="flex items-center justify-between gap-4 border rounded-lg px-4 py-3 bg-muted/5"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Badge variant="secondary" className="font-medium">
                                                        {WEEKDAY_MAP[s.weekday]}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                                                    <Clock className="size-4" />
                                                    {s.startTime} - {s.endTime}
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            ) : (
                                <div className="py-14 text-center flex flex-col items-center gap-4">
                                    <div className="size-12 rounded-full bg-muted/50 flex items-center justify-center">
                                        <Clock className="size-6 text-muted-foreground opacity-30" />
                                    </div>
                                    <div className="space-y-1 max-w-[520px]">
                                        <p className="font-bold">Chưa có lịch học định kỳ</p>
                                        <p className="text-sm text-muted-foreground">
                                            Thiết lập lịch tuần để hệ thống tự động sinh danh sách buổi học.
                                        </p>
                                    </div>
                                    <Button size="sm" className="mt-2 gap-2" onClick={() => setScheduleSheetOpen(true)}>
                                        <Plus className="size-4" />
                                        Bắt đầu thiết lập
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="text-sm text-muted-foreground leading-relaxed">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="size-4 mt-0.5 text-amber-600" />
                            <span>
                                Thay đổi tại đây sẽ ảnh hưởng đến chuỗi buổi học được sinh ra tự động.
                                Nếu chỉ cần điều chỉnh <strong>một buổi</strong>, hãy dùng “Dời lịch” ở danh sách buổi học.
                            </span>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
