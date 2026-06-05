'use client'

import { useState } from 'react'
import { useAppSelector } from '@/hooks/hooks'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { commentApi } from '@/lib/api/services/comment-api'
import { CommentTargetType } from '@workspace/schemas'
import { CommentSection } from '@/components/blog/comment-section'
import { Plus, MessageCircle, MoreHorizontal } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { Textarea } from '@workspace/ui/components/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@workspace/ui/components/avatar'
import { Badge } from '@workspace/ui/components/badge'
import { CardTitle, CardDescription } from '@workspace/ui/components/card'
import { toast } from '@workspace/ui/components/sonner'
import { Spinner } from '@workspace/ui/components/spinner'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Separator } from '@workspace/ui/components/separator'
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

interface LessonDiscussionProps {
    deliveryScopeId: string
    moduleId?: string
    lessonId: string
}

function useDiscussions(lessonId: string, deliveryScopeId: string) {
    return useQuery({
        queryKey: ['discussions', lessonId, deliveryScopeId],
        queryFn: () =>
            commentApi.findAll({
                discussionId: lessonId,
                deliveryScopeId,
                limit: 100,
                page: 1,
            }),
        enabled: !!lessonId
    })
}

function useCreateDiscussion() {
    const queryClient = useQueryClient()
    const { user } = useAppSelector(state => state.auth)

    return useMutation({
        mutationFn: (data: { content: string, deliveryScopeId: string, moduleId?: string, lessonId: string, category: string }) => {
            return commentApi.create({
                entityId: data.lessonId,
                targetType: CommentTargetType.DISCUSSION,
                discussionId: data.lessonId,
                deliveryScopeId: data.deliveryScopeId,
                userId: user?.id || '',
                content: data.content,
            })
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['discussions', variables.lessonId, variables.deliveryScopeId] })
        }
    })
}

function useUpdateDiscussion() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, content }: { id: string, content: string }) => commentApi.update(id, { content }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['discussions'] })
        }
    })
}

function useDeleteDiscussion() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => commentApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['discussions'] })
        }
    })
}


export function LessonDiscussion({ deliveryScopeId, moduleId, lessonId }: LessonDiscussionProps) {
    const { isAuthenticated, user } = useAppSelector(state => state.auth)
    const { data: discussions, isLoading } = useDiscussions(lessonId, deliveryScopeId)
    const createDiscussion = useCreateDiscussion()
    const updateDiscussion = useUpdateDiscussion()
    const deleteDiscussion = useDeleteDiscussion()

    const [isCreating, setIsCreating] = useState(false)
    const [content, setContent] = useState('')
    const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null)
    const [editingTopicId, setEditingTopicId] = useState<string | null>(null)
    const [editContent, setEditContent] = useState('')
    const EDIT_TIME_LIMIT_MS = 10 * 60 * 1000

    const handleCreateTopic = async () => {
        if (!content.trim() || !isAuthenticated) return;
        try {
            await createDiscussion.mutateAsync({ content: content.trim(), deliveryScopeId, moduleId, lessonId, category: 'QUESTION' })
            setContent(''); setIsCreating(false);
            toast.success('Đã gửi câu hỏi.')
        } catch (error: any) {
            toast.error('Gửi câu hỏi thất bại.')
        }
    }

    const handleUpdateTopic = async (id: string) => {
        if (!editContent.trim()) return;
        try {
            await updateDiscussion.mutateAsync({ id, content: editContent.trim() })
            setEditingTopicId(null); setEditContent('');
            toast.success('Cập nhật thành công.')
        } catch (error: any) {
            toast.error('Lỗi khi cập nhật.')
        }
    }

    const handleDeleteTopic = async (id: string) => {
        try {
            await deleteDiscussion.mutateAsync(id)
            toast.success('Đã xóa thảo luận.')
        } catch (error: any) {
            toast.error('Lỗi khi xóa.')
        }
    }

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <Spinner className="size-6 text-primary" />
            <p className="text-sm text-muted-foreground">Đang tải thảo luận...</p>
        </div>
    )

    const topics = discussions?.data || []

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <CardTitle className="font-normal">Thảo luận</CardTitle>
                        <Badge variant="secondary" className="font-normal">
                            {topics.length}
                        </Badge>
                    </div>
                    {!isCreating && (
                        <Button onClick={() => setIsCreating(true)} size="sm" className="font-normal">
                            <Plus className="size-4" />
                            Đặt câu hỏi
                        </Button>
                    )}
                </div>
                <CardDescription className="font-normal">
                    Hỏi đáp về bài học này.
                </CardDescription>

                {isCreating && (
                    <div className="space-y-3">
                        <Textarea
                            placeholder={isAuthenticated ? "Nhập câu hỏi của bạn..." : "Bạn cần đăng nhập để đặt câu hỏi."}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="min-h-28"
                            disabled={!isAuthenticated}
                            autoFocus
                        />
                        <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" onClick={() => { setIsCreating(false); setContent(''); }} className="font-normal">
                                Hủy
                            </Button>
                            <Button
                                onClick={handleCreateTopic}
                                disabled={!isAuthenticated || createDiscussion.isPending || !content.trim()}
                                className="font-normal"
                            >
                                Gửi
                            </Button>
                        </div>
                    </div>
                )}
                <Separator />
            </div>

            <div className="space-y-4">
                {topics.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                        Chưa có thảo luận nào. Bạn có thể là người đầu tiên đặt câu hỏi.
                    </p>
                ) : (
                    topics.map((topic, index) => {
                        const isExpanded = expandedTopicId === topic.id
                        const canEdit = user?.id === topic.author?.id
                        const canEditWithinWindow = canEdit && !!topic.createdAt && (Date.now() - new Date(topic.createdAt).getTime() <= EDIT_TIME_LIMIT_MS)
                        const authorName = topic.author?.displayName || 'Người dùng'
                        const createdAtLabel = topic.createdAt
                            ? formatDistanceToNow(new Date(topic.createdAt), { addSuffix: true, locale: vi })
                            : ''

                        return (
                            <div key={topic.id} className="space-y-4">
                                <div className="flex items-start gap-3">
                                        <Avatar className="size-9 shrink-0">
                                            <AvatarImage src={topic.author?.avatarUrl || undefined} />
                                            <AvatarFallback className="font-normal">
                                                {(authorName[0] || 'U').toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1 space-y-2">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-normal truncate">{authorName}</p>
                                                    {createdAtLabel ? (
                                                        <p className="text-xs text-muted-foreground font-normal">
                                                            {createdAtLabel}
                                                        </p>
                                                    ) : null}
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {topic.status === 'ANSWERED' ? (
                                                        <Badge variant="secondary" className="font-normal">
                                                            Đã trả lời
                                                        </Badge>
                                                    ) : null}
                                                    {canEdit ? (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="size-8 rounded-full"
                                                                    aria-label="Tùy chọn bình luận"
                                                                >
                                                                    <MoreHorizontal className="size-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-40">
                                                                <DropdownMenuItem
                                                                    disabled={!canEditWithinWindow}
                                                                    onClick={() => {
                                                                        if (!canEditWithinWindow) {
                                                                            toast.error('Chỉ có thể sửa trong vòng 10 phút sau khi bình luận.')
                                                                            return
                                                                        }
                                                                        if (editingTopicId === topic.id) {
                                                                            setEditingTopicId(null)
                                                                            setEditContent('')
                                                                            return
                                                                        }
                                                                        setEditingTopicId(topic.id)
                                                                        setEditContent(topic.content || '')
                                                                        setExpandedTopicId(topic.id)
                                                                    }}
                                                                >
                                                                    Sửa
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                                                                    onClick={() => {
                                                                        if (confirm('Xác nhận xóa thảo luận này?')) handleDeleteTopic(topic.id)
                                                                    }}
                                                                >
                                                                    Xóa
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    ) : null}
                                                </div>
                                            </div>

                                            {editingTopicId === topic.id ? (
                                                <div className="space-y-2">
                                                    <Textarea
                                                        value={editContent}
                                                        onChange={(e) => setEditContent(e.target.value)}
                                                        className="min-h-24"
                                                        autoFocus
                                                    />
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            variant="outline"
                                                            className="font-normal"
                                                            onClick={() => { setEditingTopicId(null); setEditContent('') }}
                                                        >
                                                            Hủy
                                                        </Button>
                                                        <Button
                                                            className="font-normal"
                                                            onClick={() => handleUpdateTopic(topic.id)}
                                                            disabled={updateDiscussion.isPending || !editContent.trim()}
                                                        >
                                                            Lưu
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-sm font-normal whitespace-pre-wrap">
                                                    {topic.content}
                                                </p>
                                            )}

                                            <Separator />

                                            <Collapsible open={isExpanded} onOpenChange={(open) => setExpandedTopicId(open ? topic.id : null)}>
                                                <div className="flex items-center justify-between">
                                                    <CollapsibleTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="font-normal">
                                                            <MessageCircle className="size-4" />
                                                            {isExpanded ? 'Thu gọn' : `Xem phản hồi (${topic.replies?.length || 0})`}
                                                        </Button>
                                                    </CollapsibleTrigger>
                                                </div>
                                                <CollapsibleContent className="pt-4">
                                                    <CommentSection discussionId={topic.id} deliveryScopeId={deliveryScopeId} />
                                                </CollapsibleContent>
                                            </Collapsible>
                                        </div>
                                </div>
                                {index < topics.length - 1 ? <Separator /> : null}
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
