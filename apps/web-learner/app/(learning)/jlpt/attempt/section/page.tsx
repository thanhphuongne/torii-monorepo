'use client'

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { MarkdownRenderer } from "@/components/common/markdown-renderer"
import { Button } from "@workspace/ui/components/button"
import { AlertCircle, Clock, Maximize2, Send, List, BookOpen, Volume2, Trophy, Activity } from "lucide-react"
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet"
import { Progress } from "@workspace/ui/components/progress"
import { Badge } from "@workspace/ui/components/badge"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { jlptMockApi, type JlptMockTemplate, type JlptMockTemplateQuestion } from "@/lib/api/services/jlpt-mock-api"
import { storageApi } from "@/lib/api/services/storage-api"
import { ListeningPlayer } from "@/components/learning/jlpt/listening-player"
import { toast } from "@workspace/ui/components/sonner"
import { cn } from "@workspace/ui/lib/utils"

type MondaiSection = {
  mondaiId: string | null
  mondaiCode?: string | null
  title: string
  description: string
  orderIndex: number
}

type QuestionOption = {
  id: string
  label: string
}

type QuestionBlock = {
  id: number
  sentence: React.ReactNode
  options: QuestionOption[]
  templateQuestionId: string
}

export default function JlptMockSectionPage() {
  const search = useSearchParams()
  const router = useRouter()
  const templateId = search.get("templateId")
  const attemptId = search.get("attemptId")
  const initialSectionOrder = Number(search.get("sectionOrder") ?? "1")
  const [currentSectionOrder, setCurrentSectionOrder] = useState<number>(initialSectionOrder)
  const level = (search.get("level") ?? "N3").toUpperCase()
  const [endsAtIsoState, setEndsAtIsoState] = useState<string | null>(() => search.get("endsAt"))

  const [template, setTemplate] = useState<JlptMockTemplate | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeMondaiId, setActiveMondaiId] = useState<string | null>(null)
  const [activeMondaiIndex, setActiveMondaiIndex] = useState<number>(0)
  const [activeMondaiCode, setActiveMondaiCode] = useState<string | null>(null)
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false)
  const [showConfirmNextSection, setShowConfirmNextSection] = useState(false)
  const [showConfirmExit, setShowConfirmExit] = useState(false)
  const [pendingNextSectionOrder, setPendingNextSectionOrder] = useState<number | null>(null)
  const [pendingNextEndsAtIso, setPendingNextEndsAtIso] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const [selectedOptionByTemplateQuestionId, setSelectedOptionByTemplateQuestionId] = useState<
    Record<string, string | undefined>
  >({})

  const [audioUrl, setAudioUrl] = useState<string | undefined>(undefined)
  const [questionImageUrls, setQuestionImageUrls] = useState<Record<string, string>>({})
  const [activeQuestionTemplateId, setActiveQuestionTemplateId] = useState<string | null>(null)

  const endsAtMs = endsAtIsoState ? Date.parse(endsAtIsoState) : null
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    if (endsAtMs == null || Number.isNaN(endsAtMs)) return
    const t = setInterval(() => {
      const now = Date.now()
      setNowMs(now)
      if (now >= endsAtMs) {
        clearInterval(t)
        handleAutoSubmit()
      }
    }, 1000)
    return () => clearInterval(t)
  }, [endsAtMs])

  const handleAutoSubmit = async () => {
    toast.info("Hết thời gian làm bài! Đang tự động nộp bài...")
    await confirmSubmit()
  }

  useEffect(() => {
    if (!templateId) return
      ; (async () => {
        try {
          setLoading(true)
          const tpl = await jlptMockApi.findTemplateById(templateId)
          setTemplate(tpl)
        } catch (e) {
          console.error(e)
          toast.error("Không tải được thông tin đề thi JLPT")
        } finally {
          setLoading(false)
        }
      })()
  }, [templateId])

  const currentSection = useMemo(
    () => template?.sections.find((s) => s.orderIndex === currentSectionOrder) ?? null,
    [template, currentSectionOrder],
  )

  const sectionQuestions: JlptMockTemplateQuestion[] = useMemo(
    () =>
      (template?.questions ?? []).filter(
        (q) => q.sectionId === currentSection?.id,
      ),
    [template, currentSection],
  )

  const sectionQuestionsSorted = useMemo(() => {
    const arr = [...sectionQuestions]
    arr.sort((a, b) => a.orderIndex - b.orderIndex)
    return arr
  }, [sectionQuestions])

  const questionIndexByTemplateQuestionId = useMemo(() => {
    const map = new Map<string, number>()
    sectionQuestionsSorted.forEach((q, idx) => {
      map.set(q.id, idx + 1)
    })
    return map
  }, [sectionQuestionsSorted])

  useEffect(() => {
    setActiveMondaiId(null)
    setActiveMondaiIndex(0)
    setActiveMondaiCode(null)
    setActiveQuestionTemplateId(null)
    setAudioUrl(undefined)
  }, [currentSectionOrder])

  const SECTION_ORDERS = useMemo(() => {
    return (template?.sections ?? []).map((s) => s.orderIndex).sort((a, b) => a - b)
  }, [template])
  const currentSectionIdx = SECTION_ORDERS.indexOf(currentSectionOrder)
  const PART_NUMBER = currentSectionIdx >= 0 ? currentSectionIdx + 1 : 1
  const PART_TOTAL = SECTION_ORDERS.length
  const isLastSection = PART_TOTAL > 0 && currentSectionIdx === PART_TOTAL - 1

  useEffect(() => {
    if (!sectionQuestions.length) return
    setSelectedOptionByTemplateQuestionId((prev) => {
      let changed = false
      const next = { ...prev }
      for (const q of sectionQuestions) {
        if (!(q.id in next)) {
          next[q.id] = undefined
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [sectionQuestions])

  const MONDAI_SECTIONS: MondaiSection[] = useMemo(() => {
    const mondaiFromApi: Array<{ id: string; code?: string | null; orderIndex: number; titleVi?: string | null; titleJa?: string | null }> =
      ((currentSection as any)?.mondai ?? []).map((m: any) => ({
        id: m.id,
        code: m.code ?? null,
        orderIndex: Number(m.orderIndex ?? 0),
        titleVi: m.titleVi ?? null,
        titleJa: m.titleJa ?? null,
      }))

    const counts = new Map<string | null, number>()
    for (const q of sectionQuestions) {
      const key = q.mondai?.code ?? null
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }

    if (mondaiFromApi.length > 0) {
      const sorted = mondaiFromApi.slice().sort((a, b) => a.orderIndex - b.orderIndex)
      return sorted.map((m, idx) => ({
        mondaiId: m.id,
        mondaiCode: m.code ?? null,
        title: `Mondai ${idx + 1}`,
        description: (() => {
          const label = (m.titleJa ?? m.titleVi ?? m.code ?? "").toString().trim()
          const count = counts.get(m.code ?? null) ?? 0
          const answered = sectionQuestions.filter(q => q.mondai?.code === m.code && selectedOptionByTemplateQuestionId[q.id]).length
          return label ? `${label} · ${answered}/${count}` : `${answered}/${count}`
        })(),
        orderIndex: idx,
      }))
    }

    const uniqCodes = Array.from(new Set(sectionQuestions.map((q) => q.mondai?.code ?? null)))
    return uniqCodes.map((code, idx) => ({
      mondaiId: sectionQuestions.find(q => q.mondai?.code === code)?.mondaiId ?? null,
      mondaiCode: code,
      title: `Mondai ${idx + 1}`,
      description: `0/${counts.get(code) ?? 0}`,
      orderIndex: idx,
    }))
  }, [sectionQuestions, selectedOptionByTemplateQuestionId])

  useEffect(() => {
    if (MONDAI_SECTIONS.length === 0) return
    const first = MONDAI_SECTIONS[0]
    if (first) {
      setActiveMondaiId(first.mondaiId)
      setActiveMondaiIndex(0)
      setActiveMondaiCode(first.mondaiCode ?? null)
    }
  }, [MONDAI_SECTIONS.length])

  const activeMondaiQuestions: JlptMockTemplateQuestion[] = useMemo(() => {
    return sectionQuestions.filter((q) => (q.mondai?.code ?? null) === activeMondaiCode)
  }, [sectionQuestions, activeMondaiCode])

  const QUESTION_BLOCKS: QuestionBlock[] = useMemo(
    () =>
      activeMondaiQuestions.map((q, idx) => ({
        id: questionIndexByTemplateQuestionId.get(q.id) ?? idx + 1,
        templateQuestionId: q.id,
        sentence: (
          <div className="space-y-2">
            {q.question.contextText && (
              <div className="text-sm text-muted-foreground font-medium">
                <MarkdownRenderer content={q.question.contextText} className="prose-p:my-0.5" />
              </div>
            )}
            <div className="text-lg sm:text-xl font-bold text-foreground">
              <MarkdownRenderer content={q.question.stemText} className="prose-p:my-0" />
            </div>
          </div>
        ),
        options: q.question.options.map((opt) => ({
          id: opt.id,
          label: opt.contentText,
        })),
      })),
    [activeMondaiQuestions, questionIndexByTemplateQuestionId],
  )

  const QUESTION_COUNT = sectionQuestionsSorted.length
  const ANSWERED_COUNT = Object.keys(selectedOptionByTemplateQuestionId).filter(k => sectionQuestions.some(sq => sq.id === k) && selectedOptionByTemplateQuestionId[k]).length
  const PROGRESS_VALUE = QUESTION_COUNT > 0 ? (ANSWERED_COUNT / QUESTION_COUNT) * 100 : 0

  const countdown = (() => {
    if (endsAtMs == null || Number.isNaN(endsAtMs)) return "-- : --"
    const diffMs = Math.max(0, endsAtMs - nowMs)
    const minutes = Math.floor(diffMs / 60_000)
    const seconds = Math.floor((diffMs % 60_000) / 1000)
    const mm = String(minutes).padStart(2, "0")
    const ss = String(seconds).padStart(2, "0")
    return `${mm}:${ss}`
  })()

  const activeMondaiObject = useMemo(() => {
    return ((currentSection as any)?.mondai ?? []).find((m: any) => m.id === activeMondaiId)
  }, [currentSection, activeMondaiId])

  const problemInstruction = [
    "のことばの読み方として最もよいものを、1・2・3・4から一つえらびなさい。",
    "のことばを漢字で書くとき、最もよいものを、1・2・3・4から一つえらびなさい。",
    "( )に入れるのに最もよいものを、1・2・3・4から一つえらびなさい。",
    "に意味が最も近いものを、1・2・3・4 từ一つえらびなさい。",
    "つぎのことばの使い方として最もよいものを、1・2・3・4 từ一つえらびなさい。",
  ]

  const activeProblemInstruction =
    activeMondaiObject?.instructionJa ||
    problemInstruction[activeMondaiIndex] ||
    problemInstruction[0]

  const confirmSubmit = async () => {
    setShowConfirmSubmit(false)
    if (!attemptId) {
      toast.error("Thiếu attemptId, không thể nộp bài")
      return
    }
    try {
      setLoading(true)
      const answers = sectionQuestions.map((q) => ({
        templateQuestionId: q.id,
        selectedOptionId: selectedOptionByTemplateQuestionId[q.id],
      }))
      await jlptMockApi.saveAnswers({ attemptId, answers })

      if (isLastSection) {
        await jlptMockApi.submitAttempt({ attemptId })
        toast.success("Đã nộp bài JLPT mock thành công!")
        router.push(`/jlpt/attempt/history/${attemptId}`)
        return
      }

      const next = await jlptMockApi.nextSection({ attemptId, currentSectionOrder })
      setEndsAtIsoState(null)
      setPendingNextSectionOrder(next.currentSectionOrder)
      setPendingNextEndsAtIso(next.endsAt ?? null)
      setShowConfirmNextSection(true)
      toast.success(`Đã hoàn thành phần ${PART_NUMBER}`)
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message ?? "Không thể nộp bài JLPT")
    } finally {
      setLoading(false)
    }
  }

  const confirmExit = () => router.push("/dashboard/jlpt-list-exam")
  const goBackToLevel = () => router.push(`/jlpt/${level.toLowerCase()}`)

  useEffect(() => {
    if (!attemptId || !sectionQuestionsSorted.length) return
      ; (async () => {
        try {
          const items = await jlptMockApi.getAttemptAnswers(attemptId)
          setSelectedOptionByTemplateQuestionId((prev) => {
            const next = { ...prev }
            for (const a of items) {
              if (!questionIndexByTemplateQuestionId.has(a.templateQuestionId)) continue
              next[a.templateQuestionId] = a.selectedOptionId ?? undefined
            }
            return next
          })
          const lastAnswered = items
            .filter((a) => a.selectedOptionId && questionIndexByTemplateQuestionId.has(a.templateQuestionId))
            .sort((a, b) => new Date(b.answeredAt).getTime() - new Date(a.answeredAt).getTime())[0]
          if (lastAnswered?.templateQuestionId) setActiveQuestionTemplateId(lastAnswered.templateQuestionId)
          else if (sectionQuestionsSorted[0]?.id) setActiveQuestionTemplateId(sectionQuestionsSorted[0].id)

          if (currentSection?.isListening) {
            const firstListenQ = sectionQuestionsSorted.find(q => q.question.audioAssetId)
            if (firstListenQ?.question.audioAssetId) {
              const { signedUrl } = await storageApi.getSignedUrl({ fileId: firstListenQ.question.audioAssetId })
              setAudioUrl(signedUrl)
            }
          }

          const questionsWithImages = sectionQuestionsSorted.filter(q => q.question.imageAssetId)
          for (const q of questionsWithImages) {
            if (q.question.imageAssetId) {
              const { signedUrl } = await storageApi.getSignedUrl({ fileId: q.question.imageAssetId })
              setQuestionImageUrls(prev => ({ ...prev, [q.id]: signedUrl }))
            }
          }
        } catch (e) {
          console.error(e)
        }
      })()
  }, [attemptId, sectionQuestionsSorted.length, currentSection?.isListening])

  const handleSelectOption = async (templateQuestionId: string, optionId: string) => {
    if (!attemptId) return
    setSelectedOptionByTemplateQuestionId((prev) => ({ ...prev, [templateQuestionId]: optionId }))
    setActiveQuestionTemplateId(templateQuestionId)
    try {
      await jlptMockApi.saveAnswers({ attemptId, answers: [{ templateQuestionId, selectedOptionId: optionId }] })
    } catch (e: any) {
      console.error(e)
    }
  }

  const renderSidebarContent = () => (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-background">
      <div className="p-5 space-y-8 pb-32">
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
            <BookOpen className="size-4" />
            <span>Cấu trúc phần thi</span>
          </div>
          <div className="space-y-1">
            {MONDAI_SECTIONS.map((m, index) => (
              <Button
                key={`${m.mondaiId ?? "null"}-${index}`}
                variant={(m.mondaiId ?? null) === activeMondaiId ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start text-left h-auto py-3 px-4 rounded-xl",
                  (m.mondaiId ?? null) === activeMondaiId && "shadow-sm"
                )}
                onClick={() => {
                  setActiveMondaiId(m.mondaiId)
                  setActiveMondaiIndex(index)
                  setActiveMondaiCode(m.mondaiCode ?? null)
                  setIsSidebarOpen(false)
                }}
              >
                <div className="flex flex-col items-start gap-0.5">
                  <span className="font-bold text-sm">{m.title}</span>
                  <span className={cn(
                    "text-[10px] font-medium",
                    (m.mondaiId ?? null) === activeMondaiId ? "opacity-90" : "text-muted-foreground"
                  )}>
                    {m.description}
                  </span>
                </div>
              </Button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <List className="size-4" />
              <span>Câu hỏi</span>
            </div>
            <Badge variant="secondary" className="font-bold text-[10px]">{ANSWERED_COUNT}/{QUESTION_COUNT}</Badge>
          </div>
          <div className="grid grid-cols-5 gap-1.5 px-1">
            {sectionQuestionsSorted.map((q, idx) => {
              const num = idx + 1
              const isActive = q.id === activeQuestionTemplateId
              const isAnswered = selectedOptionByTemplateQuestionId[q.id] != null
              return (
                <Button
                  key={q.id}
                  variant={isActive ? "default" : "outline"}
                  size="icon"
                  className={cn(
                    "size-9 rounded-lg text-xs font-bold transition-all",
                    isActive ? "shadow-md ring-2 ring-primary ring-offset-2" : isAnswered ? "bg-primary/5 border-primary/20 text-primary" : "text-muted-foreground border-border/50"
                  )}
                  onClick={() => {
                    setActiveQuestionTemplateId(q.id)
                    const targetMondaiCode = q.mondai?.code ?? null
                    const mondaiItem = MONDAI_SECTIONS.find((m) => (m.mondaiCode ?? null) === targetMondaiCode)
                    if (mondaiItem) {
                      setActiveMondaiId(mondaiItem.mondaiId)
                      setActiveMondaiIndex(mondaiItem.orderIndex)
                      setActiveMondaiCode(mondaiItem.mondaiCode ?? null)
                    }
                    setIsSidebarOpen(false)
                  }}
                >
                  {num}
                </Button>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 flex flex-col bg-background overflow-hidden">
      <header className="shrink-0 bg-background border-b px-3 py-2 sm:px-4 sm:py-3 z-50">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden size-9 sm:size-10">
                  <List className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-80 gap-0">
                <SheetHeader className="p-6 border-b">
                  <SheetTitle className="text-xl font-bold flex items-center gap-2">
                    <Trophy className="size-5 text-primary" />
                    <span>Đề thi thử JLPT</span>
                  </SheetTitle>
                </SheetHeader>
                {renderSidebarContent()}
              </SheetContent>
            </Sheet>

            <Badge variant="secondary" className="h-7 px-2 text-[10px] font-bold">
              {level}
            </Badge>

            <div className="hidden lg:flex min-w-0 flex-col">
              <h1 className="truncate font-semibold text-sm leading-none text-foreground">
                {currentSection?.code === "LANGUAGE_VOCAB" && "Kiến thức (Từ vựng/Kanji)"}
                {currentSection?.code === "LANGUAGE_GRAMMAR_READING" && "Ngữ pháp/Đọc hiểu"}
                {currentSection?.code === "LISTENING" && "Nghe hiểu"}
                {!currentSection && "Phần thi JLPT"}
              </h1>
              <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                Phần {PART_NUMBER}/{PART_TOTAL}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              className="h-9 px-3 sm:px-4 font-bold"
              onClick={() => setShowConfirmSubmit(true)}
              disabled={loading || sectionQuestionsSorted.length === 0}
            >
              <Send className="size-3.5 mr-2 hidden sm:inline" />
              <span>{isLastSection ? "Nộp bài" : "Tiếp theo"}</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground"
              onClick={() => setShowConfirmExit(true)}
              disabled={loading}
            >
              <Maximize2 className="size-4" />
            </Button>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2 sm:hidden">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-foreground">
              {currentSection?.code === "LANGUAGE_VOCAB" && "Kiến thức (Từ vựng/Kanji)"}
              {currentSection?.code === "LANGUAGE_GRAMMAR_READING" && "Ngữ pháp/Đọc hiểu"}
              {currentSection?.code === "LISTENING" && "Nghe hiểu"}
              {!currentSection && "Phần thi JLPT"}
            </div>
            <div className="text-xs font-medium text-muted-foreground">
              Phần {PART_NUMBER}/{PART_TOTAL}
            </div>
          </div>

          <div className="flex items-center gap-2 bg-muted px-2.5 py-1 rounded-md border shrink-0">
            <Clock className="size-3.5 text-primary" />
            <span className="text-sm font-bold tabular-nums text-foreground">{countdown}</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="hidden md:flex w-72 lg:w-80 border-r bg-background flex-col shrink-0 min-h-0">
          {renderSidebarContent()}
        </aside>

        <main className="flex-1 overflow-y-auto bg-background">
          <div className="mx-auto w-full max-w-3xl px-4 py-4 sm:px-6 sm:py-8 space-y-8 pb-24">

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground px-1">
                <span>Tiến độ</span>
                <span>{ANSWERED_COUNT}/{QUESTION_COUNT} câu</span>
              </div>
              <Progress value={PROGRESS_VALUE} className="h-2" />
            </div>

            {currentSection?.isListening && (
              <Card className="mb-4">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="size-8 rounded-full bg-muted flex items-center justify-center text-primary">
                      <Volume2 className="size-4" />
                    </div>
                    <h3 className="font-bold text-base">Nghe hiểu</h3>
                  </div>
                  <ListeningPlayer audioUrl={audioUrl} autoPlay />
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[11px] font-semibold py-0 px-2 h-6 text-muted-foreground">Hướng dẫn</Badge>
              </div>
              <p className="text-base leading-relaxed text-foreground">
                {`問題${activeMondaiIndex + 1} ＿＿＿ ${activeProblemInstruction}`}
              </p>
            </div>

            <div className="space-y-8">
              {QUESTION_BLOCKS.map((q) => (
                <div key={q.id} className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 size-8 rounded-md bg-muted text-foreground flex items-center justify-center font-semibold text-sm">
                      {q.id}
                    </div>
                    <div className="flex-1 pt-0.5">
                      {q.sentence}
                    </div>
                  </div>

                  {activeMondaiQuestions.find(amq => amq.id === q.templateQuestionId)?.question.imageAssetId && (
                    <div className="sm:ml-12 rounded-xl overflow-hidden border border-border bg-white p-1">
                      <img
                        src={questionImageUrls[q.templateQuestionId]}
                        alt="Question context"
                        className="max-w-full h-auto object-contain mx-auto rounded-lg"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:ml-12">
                    {q.options.map((opt, index) => (
                      <button
                        key={opt.id}
                        type="button"
                        className={cn(
                          "flex items-center gap-4 w-full h-auto py-4 px-5 rounded-md border text-left transition-colors",
                          selectedOptionByTemplateQuestionId[q.templateQuestionId] === opt.id
                            ? "border-primary bg-primary/5"
                            : "border-border bg-background hover:bg-muted"
                        )}
                        onClick={() => handleSelectOption(q.templateQuestionId, opt.id)}
                      >
                        <span className={cn(
                          "shrink-0 size-6 rounded-md flex items-center justify-center font-bold text-[11px] border",
                          selectedOptionByTemplateQuestionId[q.templateQuestionId] === opt.id
                            ? "bg-primary text-white border-primary"
                            : "bg-muted text-muted-foreground border-transparent"
                        )}>
                          {index + 1}
                        </span>
                        <span className="text-base flex-1">
                          <MarkdownRenderer content={opt.label} inline />
                        </span>
                      </button>
                    ))}
                  </div>
                  <Separator className="sm:ml-12 opacity-50" />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      <AlertDialog open={showConfirmSubmit} onOpenChange={setShowConfirmSubmit}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <div className="mx-auto size-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <Send className="size-8 text-primary" />
            </div>
            <AlertDialogTitle className="text-center text-xl font-bold">
              {isLastSection ? "Xác nhận nộp bài toàn bộ?" : `Nộp phần thi ${PART_NUMBER}?`}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm font-medium">
              Bạn đã hoàn thành các câu hỏi trong phần này. {isLastSection ? "Toàn bộ bài thi sẽ được gửi đi để chấm điểm." : "Bạn sẽ được chuyển sang phần thi tiếp theo."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-3 pt-4">
            <AlertDialogCancel className="flex-1 h-12 font-bold mt-0">Quay lại</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmSubmit}
              disabled={loading}
              className="flex-1 h-12 font-bold"
            >
              Nộp ngay
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showConfirmNextSection} onOpenChange={setShowConfirmNextSection}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <div className="mx-auto size-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <Activity className="size-8 text-primary" />
            </div>
            <AlertDialogTitle className="text-center text-xl font-bold">Chuyển sang phần thi mới</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm font-medium">
              Bạn đã nộp thành công phần thi vừa rồi. Bạn sẵn sàng chuyển sang phần thi tiếp theo ngay bây giờ chứ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid grid-cols-2 gap-3 pt-4 px-6 pb-6">
            <Button
              variant="outline"
              className="h-12 font-bold"
              onClick={() => {
                setShowConfirmNextSection(false)
                goBackToLevel()
              }}
            >
              Để sau
            </Button>
            <Button
              onClick={() => {
                setShowConfirmNextSection(false)
                if (pendingNextSectionOrder == null) return
                setCurrentSectionOrder(pendingNextSectionOrder)
                setEndsAtIsoState(pendingNextEndsAtIso)
              }}
              disabled={loading || pendingNextSectionOrder == null}
              className="h-12 font-bold"
            >
              Bắt đầu
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showConfirmExit} onOpenChange={setShowConfirmExit}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <div className="mx-auto size-16 bg-destructive/10 rounded-2xl flex items-center justify-center mb-4 text-destructive">
              <AlertCircle className="size-8" />
            </div>
            <AlertDialogTitle className="text-center text-xl font-bold">Thoát bài thi này?</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm font-medium">
              Tiến trình làm bài của bạn sẽ được lưu lại (nhưng thời gian dự kiến vẫn có thể tiếp tục trôi tùy theo thiết lập đề thi).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-3 pt-4">
            <AlertDialogCancel className="flex-1 h-12 font-bold mt-0">Quay lại</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowConfirmExit(false)
                confirmExit()
              }}
              disabled={loading}
              className="flex-1 h-12 font-bold"
            >
              Thoát ra
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
