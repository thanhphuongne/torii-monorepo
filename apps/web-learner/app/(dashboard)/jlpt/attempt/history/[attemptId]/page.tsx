'use client'

import { MarkdownRenderer } from '@/components/common/markdown-renderer'
import { jlptMockApi } from '@/lib/api/services/jlpt-mock-api'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { PageLoading } from '@workspace/ui/components/page-loading'
import { Separator } from '@workspace/ui/components/separator'
import { toast } from '@workspace/ui/components/sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import { cn } from '@workspace/ui/lib/utils'
import { format } from 'date-fns'
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardCheck,
  Info,
  Trophy,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

type JlptAttemptAnswerItem = {
  templateQuestionId: string
  questionId: string
  section: {
    id: string
    orderIndex: number
    code: string
  }
  mondai: {
    id: string
    code: string
    titleVi: string
  } | null
  selectedOptionId: string | null
  isCorrect: boolean | null
  scoreAwarded: number
  review: {
    stemText: string
    contextText: string | null
    explanation: string | null
    options: {
      id: string
      key: string
      contentText: string
      isCorrect?: boolean
    }[]
    correctOptionId?: string
  } | null
}

type JlptAttemptDetail = {
  attempt: {
    id: string
    templateId: string
    level: string
    status: string
    startedAt: string | null
    submittedAt: string | null
  }
  scores: {
    languageRaw?: number
    readingRaw?: number
    listeningRaw?: number
    languageScaled?: number
    readingScaled?: number
    listeningScaled?: number
    totalScaled?: number
    passMock?: boolean
  }
  answers?: JlptAttemptAnswerItem[]
}

const SECTION_LABELS: Record<string, string> = {
  languageScaled: 'Kiến thức ngôn ngữ',
  readingScaled: 'Đọc hiểu',
  listeningScaled: 'Nghe hiểu',
}

function formatDateTime(value: string | null) {
  if (!value) return '—'
  return format(new Date(value), 'dd/MM/yyyy HH:mm')
}

function sectionTabLabel(code: string) {
  if (code === 'LANGUAGE_VOCAB') return 'Từ vựng/Kanji'
  if (code === 'LANGUAGE_GRAMMAR_READING') return 'Ngữ pháp/Đọc hiểu'
  if (code === 'LISTENING') return 'Nghe hiểu'
  return code
}

export default function JlptAttemptHistoryDetailPage() {
  const { attemptId } = useParams<{ attemptId: string }>()

  const [data, setData] = useState<JlptAttemptDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [expandedAnswers, setExpandedAnswers] = useState<Record<string, boolean>>({})

  const toggleExpand = (id: string) => {
    setExpandedAnswers((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  useEffect(() => {
    if (!attemptId) return

      ; (async () => {
        try {
          setErrorMessage(null)
          setLoading(true)
          const res = await jlptMockApi.getAttemptById(attemptId)
          setData(res as unknown as JlptAttemptDetail)
        } catch (e: any) {
          console.error(e)
          setErrorMessage(e?.message ?? 'Không tải được kết quả bài thi')
          toast.error(e?.message ?? 'Không tải được kết quả bài thi')
        } finally {
          setLoading(false)
        }
      })()
  }, [attemptId])

  const groupedSections = useMemo(() => {
    if (!data?.answers) return []

    const grouped: Record<
      string,
      {
        id: string
        code: string
        orderIndex: number
        answers: JlptAttemptAnswerItem[]
      }
    > = {}

    data.answers.forEach((ans) => {
      const sectionId = ans.section?.id
      if (!sectionId) return

      if (!grouped[sectionId]) {
        grouped[sectionId] = {
          ...ans.section,
          answers: [],
        }
      }

      grouped[sectionId]!.answers.push(ans)
    })

    return Object.values(grouped).sort((a, b) => a.orderIndex - b.orderIndex)
  }, [data?.answers])

  if (!attemptId) return null
  if (loading) return <PageLoading className="h-screen" />

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:max-w-none sm:space-y-6 sm:px-6">
        <div className="space-y-3">
          <Button variant="ghost" className="h-9 w-full justify-start gap-2 rounded-lg border px-3 sm:w-fit" asChild>
            <Link href="/jlpt/attempt/history">
              <ArrowLeft className="size-4" />
              Quay lại lịch sử
            </Link>
          </Button>
          <h1 className="text-xl font-semibold">Không tải được kết quả</h1>
        </div>
        <p className="text-sm text-muted-foreground">{errorMessage ?? 'Không có dữ liệu.'}</p>
        <Button asChild variant="outline" className="w-full sm:w-fit">
          <Link href="/jlpt/attempt/history">Quay lại lịch sử</Link>
        </Button>
      </div>
    )
  }

  const { attempt, scores } = data

  const sectionRows = [
    { key: 'languageScaled', label: SECTION_LABELS.languageScaled, value: scores?.languageScaled },
    { key: 'readingScaled', label: SECTION_LABELS.readingScaled, value: scores?.readingScaled },
    { key: 'listeningScaled', label: SECTION_LABELS.listeningScaled, value: scores?.listeningScaled },
  ]

  const totalScaled = scores?.totalScaled ?? '—'

  return (
    <div className="w-full space-y-6 px-0 py-8 sm:mx-auto sm:max-w-6xl sm:px-6">
      <header className="space-y-4 border-b border-border pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-3">
            <Button variant="ghost" className="h-9 w-full justify-start gap-2 rounded-lg border px-3 sm:w-fit" asChild>
              <Link href="/jlpt/attempt/history">
                <ArrowLeft className="size-4" />
                Quay lại lịch sử
              </Link>
            </Button>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-md text-[11px] font-medium">
                  Kết quả JLPT
                </Badge>
                <span className="text-sm text-muted-foreground">Cấp độ {attempt.level}</span>
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Chi tiết bài làm</h1>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Xem lại chi tiết kết quả, đáp án và giải thích cho bài thi thử JLPT của bạn.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            {typeof scores?.passMock === 'boolean' && (
              <Badge
                className={cn(
                  'rounded-md border-none px-3 py-1 text-[11px] font-semibold',
                  scores.passMock
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'bg-destructive/10 text-destructive',
                )}
              >
                {scores.passMock ? 'Đạt' : 'Chưa đạt'}
              </Badge>
            )}
            <p className="text-sm text-muted-foreground">Nộp bài lúc {formatDateTime(attempt.submittedAt)}</p>
          </div>
        </div>
      </header>

      <section className="grid gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1.45fr)_300px]">
        <div className="overflow-hidden rounded-2xl border border-border/50 bg-card p-4 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ClipboardCheck className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Tổng quan điểm số</h2>
              <p className="text-sm text-muted-foreground">Điểm đã được quy đổi theo scaled score.</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
            {sectionRows.map((row) => (
              <div key={row.key} className="flex min-w-0 flex-col rounded-2xl bg-muted/20 px-2.5 py-3 sm:px-5 sm:py-4">
                <p className="truncate text-[9.5px] font-bold uppercase tracking-tight text-muted-foreground sm:text-[11px] sm:tracking-[0.18em]">
                  {row.label}
                </p>
                <div className="mt-1 flex-1 text-xl font-bold tracking-tight sm:mt-2 sm:text-3xl">{row.value ?? '—'}</div>
                <p className="mt-1 text-[9.5px] text-muted-foreground sm:text-xs">Tối đa 60</p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-2xl bg-primary/5 px-3 py-3 sm:px-4 sm:py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Trophy className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold sm:text-base">Tổng điểm</p>
                  <p className="truncate text-[10px] text-muted-foreground">Chuẩn JLPT mock</p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-2xl font-bold tracking-tight text-primary sm:text-4xl">
                  {totalScaled}
                </div>
                <p className="text-[9px] text-muted-foreground sm:text-xs">/ 180 điểm</p>
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex size-9 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <Calendar className="size-4" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Ngày nộp bài</p>
                  <p className="mt-1 text-sm font-medium">{formatDateTime(attempt.submittedAt)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-muted text-[10px] font-semibold text-muted-foreground">
                  ID
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="truncate text-[11px] uppercase tracking-[0.16em] text-muted-foreground sm:tracking-[0.18em]">Mã lần thi</p>
                  <p className="mt-1 truncate font-mono text-xs text-foreground/80 sm:text-sm">
                    {attemptId.toString().toUpperCase()}
                  </p>
                </div>
              </div>
            </div>

            <Separator className="my-5" />

            <div className="space-y-3">
              <Button className="w-full rounded-xl font-semibold" asChild>
                <Link href="/dashboard/jlpt-list-exam">
                  Thi thử đề mới
                  <ChevronRight className="ml-1 size-4" />
                </Link>
              </Button>
              <Button variant="outline" className="w-full rounded-xl" asChild>
                <Link href="/jlpt/attempt/history">Xem lại lịch sử</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-2xl bg-primary/5 px-5 py-5">
            <div className="flex items-center gap-2 text-primary">
              <Info className="size-4" />
              <p className="text-sm font-medium">Lưu ý về điểm số</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Kết quả đã được chuẩn hóa theo hình thức thi JLPT thật. Hãy dùng đây như mốc tham khảo cho kỳ thi chính thức.
            </p>
          </div>
        </aside>
      </section>

      {groupedSections.length > 0 && (
        <section className="space-y-5">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Chi tiết bài làm</h2>
            <p className="text-sm text-muted-foreground">
              Xem lại từng phần thi và đáp án theo một bố cục gọn hơn.
            </p>
          </div>

          <Tabs defaultValue={groupedSections[0]?.id ?? ''} className="space-y-5">
            <div className="overflow-x-auto pb-1">
              <TabsList className="h-auto w-max gap-1 rounded-2xl border border-border/50 bg-muted/30 p-1">
                {groupedSections.map((sec) => (
                  <TabsTrigger
                    key={sec.id}
                    value={sec.id}
                    className="rounded-xl px-4 py-2 text-xs font-medium data-[state=active]:bg-background data-[state=active]:text-primary"
                  >
                    {sectionTabLabel(sec.code)}
                    <Badge variant="outline" className="ml-2 h-5 rounded-md px-1.5 text-[10px]">
                      {sec.answers.length}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {groupedSections.map((sec) => (
              <TabsContent key={sec.id} value={sec.id} className="space-y-3 outline-none">
                {sec.answers.map((ans, idx) => {
                  if (!ans.review) return null

                  const isCorrect = ans.isCorrect
                  const isExpanded = !!expandedAnswers[ans.templateQuestionId]

                  return (
                    <div
                      key={ans.templateQuestionId}
                      className={cn(
                        'overflow-hidden rounded-2xl border bg-card transition-colors',
                        isCorrect ? 'border-emerald-500/20' : 'border-destructive/20',
                      )}
                    >
                      <button
                        className="flex w-full items-start gap-4 px-4 py-4 text-left transition-colors hover:bg-muted/30 sm:px-5"
                        onClick={() => toggleExpand(ans.templateQuestionId)}
                      >
                        <div
                          className={cn(
                            'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl text-xs font-semibold',
                            isCorrect
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                              : 'bg-destructive/10 text-destructive',
                          )}
                        >
                          {idx + 1}
                        </div>

                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {ans.mondai && (
                              <Badge variant="outline" className="rounded-md text-[10px]">
                                {ans.mondai.code}
                              </Badge>
                            )}
                            {isCorrect ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                                <CheckCircle2 className="size-3.5" />
                                Đúng
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                                <XCircle className="size-3.5" />
                                Sai
                              </span>
                            )}
                          </div>

                          <div className="line-clamp-2 text-sm font-medium leading-6 text-foreground">
                            <MarkdownRenderer content={ans.review.stemText} inline />
                          </div>
                        </div>

                        {isExpanded ? (
                          <ChevronUp className="mt-1 size-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="mt-1 size-4 shrink-0 text-muted-foreground" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="space-y-5 px-4 pb-5 sm:px-5">
                          <Separator />

                          {ans.review.contextText && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">Ngữ cảnh</p>
                              <div className="rounded-xl bg-muted/30 px-4 py-3 text-sm leading-6 text-foreground">
                                <MarkdownRenderer content={ans.review.contextText} />
                              </div>
                            </div>
                          )}

                          <div className="space-y-3">
                            <p className="text-xs font-medium text-muted-foreground">Lựa chọn</p>
                            <div className="grid gap-3 sm:grid-cols-2">
                              {ans.review.options.map((opt, oIdx) => {
                                const isSelected = ans.selectedOptionId === opt.id
                                const isCorrectOption = opt.isCorrect === true || ans.review?.correctOptionId === opt.id

                                return (
                                  <div
                                    key={opt.id}
                                    className={cn(
                                      'flex items-center gap-3 rounded-xl border px-3 py-3 text-sm',
                                      isSelected && isCorrectOption && 'border-emerald-500 bg-emerald-500/5',
                                      isSelected && !isCorrectOption && 'border-destructive bg-destructive/5',
                                      !isSelected && isCorrectOption && 'border-emerald-500 bg-emerald-500/5',
                                      !isSelected && !isCorrectOption && 'border-border bg-background',
                                    )}
                                  >
                                    <div
                                      className={cn(
                                        'flex size-6 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold',
                                        isSelected && isCorrectOption && 'bg-emerald-500 text-white',
                                        isSelected && !isCorrectOption && 'bg-destructive text-white',
                                        !isSelected && isCorrectOption && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
                                        !isSelected && !isCorrectOption && 'bg-muted text-muted-foreground',
                                      )}
                                    >
                                      {oIdx + 1}
                                    </div>
                                    <div className="flex-1">
                                      <MarkdownRenderer content={opt.contentText} inline />
                                    </div>
                                    {isSelected && <span className="text-[10px] text-muted-foreground">Bạn chọn</span>}
                                  </div>
                                )
                              })}
                            </div>
                          </div>

                          {ans.review.explanation && (
                            <div className="space-y-2">
                              <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                <Info className="size-3.5" />
                                Giải thích
                              </p>
                              <div className="rounded-xl bg-primary/5 px-4 py-3 text-sm leading-6 text-foreground">
                                <MarkdownRenderer content={ans.review.explanation} />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </TabsContent>
            ))}
          </Tabs>
        </section>
      )}
    </div>
  )
}
