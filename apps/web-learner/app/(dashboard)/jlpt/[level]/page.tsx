"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, FileText, AlertCircle, ChevronRight, Clock, Activity, History } from "lucide-react"
import { jlptMockApi, useJlptMockTemplates } from "@/lib/api/services/jlpt-mock-api"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { toast } from "@workspace/ui/components/sonner"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { PageLoading } from "@workspace/ui/components/page-loading"
import { cn } from "@workspace/ui/lib/utils"

const LEVEL_ACCENT: Record<string, { chip: string }> = {
  N1: {
    chip: "border-rose-500/25 bg-rose-500/10 text-rose-800 dark:text-rose-200",
  },
  N2: {
    chip: "border-orange-500/25 bg-orange-500/10 text-orange-800 dark:text-orange-200",
  },
  N3: {
    chip: "border-amber-500/25 bg-amber-500/10 text-amber-900 dark:text-amber-200",
  },
  N4: {
    chip: "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
  },
  N5: {
    chip: "border-sky-500/25 bg-sky-500/10 text-sky-800 dark:text-sky-200",
  },
}

export default function JlptLevelExamPage() {
  const params = useParams<{ level: string }>()
  const levelCode = (params.level || "n3").toUpperCase()
  const router = useRouter()

  const { data: templates = [], isLoading } = useJlptMockTemplates(levelCode)

  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null)
  const [showConfirmStart, setShowConfirmStart] = useState(false)
  const [starting, setStarting] = useState(false)

  const pendingExam = pendingTemplateId ? templates.find((x) => x.id === pendingTemplateId) : null
  const accent = LEVEL_ACCENT[levelCode] ?? {
    chip: "border-primary/25 bg-primary/10 text-foreground",
  }

  const confirmStart = async () => {
    if (!pendingTemplateId) return
    try {
      setStarting(true)
      const attempt = await jlptMockApi.startAttempt({ templateId: pendingTemplateId })
      const endsAtQuery = attempt.endsAt ? `&endsAt=${encodeURIComponent(attempt.endsAt)}` : ""
      router.push(
        `/jlpt/attempt/section?templateId=${pendingTemplateId}&attemptId=${attempt.id}&sectionOrder=1&level=${levelCode}${endsAtQuery}`,
      )
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message ?? "Không thể bắt đầu đề JLPT")
    } finally {
      setStarting(false)
      setShowConfirmStart(false)
    }
  }

  if (isLoading) return <PageLoading className="h-screen" />

  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 space-y-6 sm:max-w-none sm:space-y-8">
      <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0 space-y-3">
          <Button
            variant="ghost"
            className="h-9 w-full justify-start gap-2 rounded-lg border px-3 sm:w-fit"
            asChild
          >
            <Link href="/dashboard/jlpt-list-exam">
              <ArrowLeft className="size-4" />
              Quay lại danh sách đề
            </Link>
          </Button>
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                className={cn("rounded-lg px-2 text-xs font-bold", accent.chip)}
                variant="outline"
              >
                JLPT {levelCode}
              </Badge>
              <div className="flex items-center gap-1.5 rounded-lg border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                <FileText className="size-3 text-primary" />
                <span>{templates.length} đề</span>
              </div>
            </div>
            <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
              Đề thi thử JLPT {levelCode}
            </h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Chọn một đề để bắt đầu. Thời gian được tính khi bạn xác nhận vào phòng thi.
            </p>
          </div>
        </div>
        <Button
          asChild
          variant="outline"
          className="h-10 w-full shrink-0 gap-2 border-violet-500/35 bg-violet-500/10 font-semibold text-violet-800 hover:bg-violet-500/15 dark:text-violet-200 sm:h-9 sm:w-auto"
        >
          <Link href="/jlpt/attempt/history">
            <History className="size-4" />
            Lịch sử làm bài
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        {templates.length === 0 ? (
          <div className="col-span-full py-24 bg-muted border border-dashed rounded-xl flex flex-col items-center gap-3">
            <Activity className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">Hiện chưa có đề thi mới cho cấp độ {levelCode}.</p>
          </div>
        ) : (
          templates.map((exam) => (
            <button
              key={exam.id}
              type="button"
              disabled={starting}
              onClick={() => {
                setPendingTemplateId(exam.id)
                setShowConfirmStart(true)
              }}
              className={cn(
                "group flex w-full flex-col items-stretch rounded-lg border bg-card px-3 py-3 text-left text-sm transition hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:px-4 sm:py-3.5",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <FileText className="size-3 text-primary" />
                    <span className="truncate">{exam.code}</span>
                  </div>
                  <h2 className="truncate text-sm font-semibold leading-snug text-foreground sm:text-[15px]">
                    {exam.title}
                  </h2>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold tabular-nums",
                    accent.chip,
                  )}
                >
                  JLPT {levelCode}
                </Badge>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-medium text-muted-foreground sm:text-xs">
                <span className="inline-flex items-center gap-1 rounded-md bg-muted/80 px-2 py-0.5">
                  <Clock className="size-3 text-primary" />
                  {exam.totalDurationMinutes ? `${exam.totalDurationMinutes} phút` : "Thời lượng —"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5">
                  <Activity className="size-3 text-primary" />
                  Full mock
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                <span>Bắt đầu làm bài</span>
                <ChevronRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>
          ))
        )}
      </div>

      <AlertDialog open={showConfirmStart} onOpenChange={setShowConfirmStart}>
        <AlertDialogContent className="max-w-md p-6">
          <AlertDialogHeader className="space-y-4">
            <div className="mx-auto size-16 bg-primary/10 rounded-2xl flex items-center justify-center border">
                <AlertCircle className="size-8 text-primary" />
            </div>
            <div className="space-y-2 text-center">
                <AlertDialogTitle className="text-xl font-bold">Vào phòng thi thử?</AlertDialogTitle>
                <AlertDialogDescription className="text-sm font-medium leading-relaxed px-4 text-muted-foreground">
                    Bạn đã sẵn sàng cho kỳ thi <span className="text-foreground font-bold">{pendingExam?.title}</span>? 
                    <br/> Thời gian làm bài sẽ được tính ngay sau khi bạn xác nhận.
                </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-2 pt-6">
            <AlertDialogCancel className="w-full h-10 rounded-lg font-bold order-2 sm:order-1 sm:flex-1">Quay lại</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmStart}
              disabled={starting || !pendingTemplateId}
              className="w-full h-10 rounded-lg font-bold order-1 sm:order-2 sm:flex-1"
            >
              Vào phòng thi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
