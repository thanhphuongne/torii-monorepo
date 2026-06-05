import { useMemo, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'
import { commentApi, useCreateComment } from '@/lib/api/services/comments'
import type { CommentResponseDTO } from '@workspace/schemas'
import { Button } from '@workspace/ui/components/button'
import { Badge } from '@workspace/ui/components/badge'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Textarea } from '@workspace/ui/components/textarea'
import { toast } from '@workspace/ui/components/sonner'
import { MessageSquare, User, Filter } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@workspace/ui/components/select'
import { formatDate } from '@/lib/format-utils'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { useAcademyLiveClass } from '@/lib/api/services/academy-live-classes'
import { useAcademyVodPackage } from '@/lib/api/services/academy-vod-packages'

interface ClassDiscussionTabProps {
  liveClassId?: string
  vodPackageId?: string
  vodPackageData?: any
}

export function ClassDiscussionTab({
  liveClassId,
  vodPackageId,
  vodPackageData,
}: ClassDiscussionTabProps) {
  const { user, isAuthenticated } = useAuth()
  const createComment = useCreateComment()

  const [selectedTopic, setSelectedTopic] = useState<CommentResponseDTO | null>(null)
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null)
  const [replyDraftByTopic, setReplyDraftByTopic] = useState<Record<string, string>>({})

  const { data: academyClass } = useAcademyLiveClass(liveClassId || undefined)
  const { data: vodPackage } = useAcademyVodPackage(
    vodPackageData ? undefined : (vodPackageId || undefined),
  )
  const resolvedVodPackage = vodPackageData ?? vodPackage
  const curriculum = (academyClass as any)?.cohort?.courseProfile || (resolvedVodPackage as any)?.courseProfile

  const lessonOptions = useMemo(() => {
    const modules = (curriculum?.modules ?? []) as Array<any>
    const lessons = modules.flatMap((m) => m.lessons ?? [])
    return lessons as Array<{ id: string; title: string }>
  }, [curriculum])

  const isAssignedInstructor = useMemo(() => {
    const instructorId = (academyClass as any)?.instructorId || (resolvedVodPackage as any)?.instructorId
    return user?.id === instructorId
  }, [user?.id, academyClass, resolvedVodPackage])

  // Ở màn quản lý (lecture/admin), không cho tạo chủ đề hỏi mới, chỉ dùng để trả lời câu hỏi học viên.
  // UPDATE: Chỉ cho phép giảng viên phụ trách (assigned instructor) được phản hồi. Admin và staff chỉ xem.
  const canPost = isAssignedInstructor

  const [selectedLessonId, setSelectedLessonId] = useState<string>('all')

  const lessonQueries = useQueries({
    queries: lessonOptions.map((lesson) => ({
      queryKey: ['comments', 'discussion-timeline', liveClassId || vodPackageId, lesson.id],
      queryFn: () =>
        commentApi.findAll({
          discussionId: lesson.id,
          deliveryScopeId: liveClassId || vodPackageId,
          page: 1,
          limit: 100,
        }),
      enabled: !!(liveClassId || vodPackageId),
    })),
  })

  const isLoading = lessonQueries.some((q) => q.isLoading)
  const isError = lessonQueries.some((q) => q.isError)

  const topics = useMemo(() => {
    const byLesson = lessonQueries.flatMap((q, idx) => {
      const lesson = lessonOptions[idx]
      const data = (q.data?.data ?? []) as CommentResponseDTO[]
      return data.map((item) => ({
        ...item,
        __lessonId: lesson?.id,
        __lessonTitle: lesson?.title || 'Bài học',
      }))
    })

    const filtered =
      selectedLessonId === 'all'
        ? byLesson
        : byLesson.filter((t: any) => t.__lessonId === selectedLessonId)

    return filtered
      .sort(
        (a: any, b: any) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
      )
  }, [lessonQueries, lessonOptions, selectedLessonId])

  const refetchAll = async () => {
    await Promise.all(lessonQueries.map((q) => q.refetch()))
  }

  const onReply = async (topicId: string) => {
    if (!isAuthenticated || !user?.id) {
      toast.error('Vui lòng đăng nhập để trả lời')
      return
    }
    const text = (replyDraftByTopic[topicId] ?? '').trim()
    if (!text) {
      toast.error('Nội dung trả lời không được để trống')
      return
    }
    const discussionId =
      (selectedTopic as any)?.discussionId ||
      (selectedTopic as any)?.__lessonId ||
      (selectedLessonId !== 'all' ? selectedLessonId : '')
    if (!discussionId) {
      toast.error('Không xác định được bài học cho phản hồi này')
      return
    }

    try {
      await createComment.mutateAsync({
        discussionId,
        userId: user.id,
        parentId: topicId,
        content: text,
        deliveryScopeId: liveClassId || vodPackageId,
      } as any)
      setReplyDraftByTopic((prev) => ({ ...prev, [topicId]: '' }))
      setActiveReplyId(null)
      refetchAll()
    } catch (e: any) {
      toast.error(e?.message || 'Không thể gửi trả lời')
    }
  }

  const renderReplyTree = (reply: CommentResponseDTO, depth: number): any => {
    const canRecurse = depth < 3 && (reply.replies?.length ?? 0) > 0
    const isReplying = activeReplyId === reply.id

    return (
      <div key={reply.id} className={depth === 0 ? "" : "mt-3"}>
        <div className="space-y-2 rounded-md border bg-card p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <div className="flex size-6 items-center justify-center rounded-full bg-primary/10">
                <User className="size-3" />
              </div>
              <span>{reply.author?.displayName || "Học viên"}</span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              {formatDate(reply.createdAt)}
            </span>
          </div>

          <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {reply.content}
          </div>

          {canPost && (
            <div className="mt-1 flex items-center justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setActiveReplyId(isReplying ? null : reply.id)}
              >
                {isReplying ? "Hủy" : "Trả lời"}
              </Button>
            </div>
          )}
        </div>

        {isReplying && (
          <div className="mt-2 pl-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <Textarea
              value={replyDraftByTopic[reply.id] ?? ""}
              onChange={(e) =>
                setReplyDraftByTopic((prev) => ({
                  ...prev,
                  [reply.id]: e.target.value,
                }))
              }
              placeholder={`Trả lời ${reply.author?.displayName || "..."}`}
              className="min-h-[80px]"
            />
            <div className="mt-2 flex justify-end">
              <Button size="sm" onClick={() => onReply(reply.id)} disabled={createComment.isPending}>
                Gửi phản hồi
              </Button>
            </div>
          </div>
        )}

        {canRecurse && (
          <div className="mt-3 ml-4 border-l border-muted-foreground/10 pl-4">
            {reply.replies?.map((r: any) => renderReplyTree(r as any, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <MessageSquare className="size-5 text-primary" />
            Thảo luận lớp học
          </h3>
          <p className="text-sm text-muted-foreground">
            Hiển thị toàn bộ bình luận theo thời gian. Có thể lọc theo bài học khi cần.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-[320px]">
          <Select value={selectedLessonId} onValueChange={setSelectedLessonId}>
            <SelectTrigger className="w-full">
              <Filter className="mr-2 size-4 text-muted-foreground" />
              <SelectValue placeholder="Lọc theo bài học" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[400px]">
              <SelectItem value="all">Tất cả bài học</SelectItem>
              {(((curriculum?.modules ?? []) as Array<any>)
                .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
              ).map((m) => (
                <SelectGroup key={m.id}>
                  <SelectLabel className="bg-muted text-muted-foreground">{m.title}</SelectLabel>
                  {((m.lessons || []) as Array<any>)
                    .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
                    .map((l: any) => (
                      <SelectItem key={l.id} value={l.id} className="pl-6">
                        {l.title || l.id}
                      </SelectItem>
                    ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full" />
        </div>
      ) : isError ? (
        <div className="p-4 rounded-md border border-destructive/20 bg-destructive/5 text-destructive">
          Không thể tải thảo luận.
        </div>
      ) : topics.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground space-y-2 rounded-lg border border-dashed bg-muted/5">
          <MessageSquare className="h-10 w-10 mx-auto opacity-40" />
          <div className="font-semibold">Chưa có thảo luận nào.</div>
          <div className="text-sm">Khi học viên đặt câu hỏi, bạn có thể xem và trả lời tại đây.</div>
        </div>
      ) : (
        <div className="rounded-lg border bg-background">
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[min(28%,160px)] min-w-0">Học viên</TableHead>
                <TableHead className="w-[min(22%,180px)] min-w-0">Bài học</TableHead>
                <TableHead className="w-[120px]">Trạng thái</TableHead>
                <TableHead className="min-w-0">Nội dung</TableHead>
                <TableHead className="w-[120px]">Thời gian</TableHead>
                <TableHead className="w-[100px] text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topics.map((topic: any) => (
                <TableRow
                  key={topic.id}
                >
                  <TableCell className="min-w-0 max-w-[160px] align-top font-medium">
                    <span
                      className="block truncate"
                      title={topic.author?.displayName || "Học viên"}
                    >
                      {topic.author?.displayName || "Học viên"}
                    </span>
                  </TableCell>
                  <TableCell className="min-w-0 max-w-[180px] align-top">
                    <Badge
                      variant="outline"
                      className="min-w-0 max-w-full shrink text-[10px]"
                      title={(topic as any).__lessonTitle || "Bài học"}
                    >
                      <span className="min-w-0 truncate">
                        {(topic as any).__lessonTitle || "Bài học"}
                      </span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {topic.status === "ANSWERED" ? (
                      <Badge variant="success" className="text-[10px]">Đã trả lời</Badge>
                    ) : (
                      <Badge variant="warning" className="text-[10px]">Chờ phản hồi</Badge>
                    )}
                  </TableCell>
                  <TableCell className="break-all whitespace-normal text-muted-foreground">
                    {topic.content}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(topic.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedTopic(topic)}
                    >
                      {canPost ? "Phản hồi" : "Xem"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <DiscussionDetailsSheet
        topic={selectedTopic}
        open={!!selectedTopic}
        onOpenChange={(open) => !open && setSelectedTopic(null)}
        canPost={canPost}
        isAuthenticated={isAuthenticated}
        createCommentPending={createComment.isPending}
        replyDraftByTopic={replyDraftByTopic}
        setReplyDraftByTopic={setReplyDraftByTopic}
        onReply={onReply}
        renderReplyTree={renderReplyTree}
        currentUserDisplayName={user?.displayName}
      />
    </div>
  )
}

interface DiscussionDetailsSheetProps {
  topic: CommentResponseDTO | null
  open: boolean
  onOpenChange: (open: boolean) => void
  canPost: boolean
  isAuthenticated: boolean
  createCommentPending: boolean
  replyDraftByTopic: Record<string, string>
  setReplyDraftByTopic: (val: any) => void
  onReply: (id: string) => Promise<void>
  renderReplyTree: (reply: CommentResponseDTO, depth: number) => any
  currentUserDisplayName?: string
}

function DiscussionDetailsSheet({
  topic,
  open,
  onOpenChange,
  canPost,
  isAuthenticated,
  createCommentPending,
  replyDraftByTopic,
  setReplyDraftByTopic,
  onReply,
  renderReplyTree,
  currentUserDisplayName
}: DiscussionDetailsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[800px] flex flex-col h-full p-0 overflow-hidden">
        <SheetHeader className="p-5 border-b shrink-0 bg-muted/5">
          <SheetTitle>Chi tiết thảo luận</SheetTitle>
          <SheetDescription>
            {topic
              ? `Thảo luận từ ${topic.author?.displayName || "Học viên"} · ${formatDate(
                topic.createdAt,
              )}`
              : "Xem và phản hồi câu hỏi của học viên."}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0 bg-background">
          <div className="space-y-8 p-5">
            {topic && (
              <div className="space-y-8">
                {/* Câu hỏi gốc */}
                <div className="space-y-4 rounded-xl border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-full bg-primary/10">
                        {topic.author?.avatarUrl ? (
                          <img src={topic.author.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
                        ) : (
                          <User className="size-5 text-primary" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">
                          {topic.author?.displayName || "Học viên"}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {formatDate(topic.createdAt)}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant={topic.status === "ANSWERED" ? "success" : "warning"}
                      className="text-[10px]"
                    >
                      {topic.status === "ANSWERED" ? "ĐÃ TRẢ LỜI" : "CHỜ PHẢN HỒI"}
                    </Badge>
                  </div>
                  <div className="whitespace-pre-wrap rounded-lg bg-muted/40 p-3 text-sm leading-relaxed">
                    {topic.content}
                  </div>
                </div>

                {/* Danh sách phản hồi */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 border-b pb-2 text-sm font-medium">
                    <MessageSquare className="size-4 text-primary" />
                    <span>Phản hồi ({topic.replyCount ?? 0})</span>
                  </div>
                  <div className="ml-1 space-y-4 border-l border-muted-foreground/10 pl-4">
                    {(topic.replies?.length ?? 0) > 0 ? (
                      topic.replies.map((r: any) => renderReplyTree(r as any, 0))
                    ) : (
                      <div className="rounded-lg border border-dashed bg-muted/10 py-6 text-center">
                        <p className="text-xs italic text-muted-foreground">
                          Chưa có phản hồi nào cho thảo luận này.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {topic && canPost && (
          <div className="shrink-0 border-t bg-muted/5 p-4">
            <div className="space-y-3 rounded-xl border bg-background p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Trả lời thảo luận
                </span>
                {currentUserDisplayName && (
                  <span className="text-[11px] italic text-muted-foreground">
                    Trả lời với danh nghĩa {currentUserDisplayName}
                  </span>
                )}
              </div>
              <Textarea
                value={replyDraftByTopic[topic.id] ?? ''}
                onChange={(e) =>
                  setReplyDraftByTopic((prev: any) => ({
                    ...prev,
                    [topic.id]: e.target.value,
                  }))
                }
                placeholder="Viết phản hồi hoặc giải đáp thắc mắc của học viên..."
                className="min-h-[90px]"
              />
              <div className="flex justify-end">
                <Button
                  disabled={!isAuthenticated || createCommentPending}
                  onClick={() => onReply(topic.id)}
                  size="sm"
                  className="gap-1 text-xs"
                >
                  <MessageSquare className="size-3.5" />
                  Gửi phản hồi
                </Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
