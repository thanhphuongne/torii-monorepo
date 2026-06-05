'use client'

import { useState, useEffect } from 'react'
import { useAppSelector } from '@/hooks/hooks'
import { commentApi } from '@/lib/api/services/comment-api'
import { CommentTargetType, type CommentResponseDTO } from '@workspace/schemas'
import {
    MessageSquare,
    User,
    Heart,
    Reply,
    Shield,
    MoreVertical,
    Pencil,
    Trash2,
    Edit,
    Trash,
    Send
} from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { Textarea } from '@workspace/ui/components/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@workspace/ui/components/avatar'
import { Badge } from '@workspace/ui/components/badge'
import { toast } from '@workspace/ui/components/sonner'
import { Spinner } from '@workspace/ui/components/spinner'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@workspace/ui/components/dropdown-menu'
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
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { cn } from '@workspace/ui/lib/utils'
import { formatNumber } from '@/utils/format-utils'
import { Separator } from '@workspace/ui/components/separator'
import Link from 'next/link'

interface CommentInputProps {
    user: any
    onSubmit: (text: string) => Promise<void>
    placeholder?: string
    autoFocus?: boolean
    initialValue?: string
    submitLabel?: string
    onCancel?: () => void
}

interface CommentSectionProps {
    blogId?: string
    feedId?: string
    discussionId?: string
    deliveryScopeId?: string
    onCommentCountChange?: (delta: number) => void
}

export function CommentSection({ blogId, feedId, discussionId, deliveryScopeId, onCommentCountChange }: CommentSectionProps) {
    const { isAuthenticated, user } = useAppSelector(state => state.auth)
    const [comments, setComments] = useState<CommentResponseDTO[]>([])
    const [loading, setLoading] = useState(true)
    const [replyTo, setReplyTo] = useState<string | null>(null)
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

    const fetchComments = async () => {
        try {
            setLoading(true)
            if (!blogId && !feedId && !discussionId) return

            const response = await commentApi.findAll({
                page: 1,
                limit: 100,
                ...(blogId ? { blogId } : feedId ? { feedId } : { discussionId, deliveryScopeId }),
            })

            const flatComments: CommentResponseDTO[] = []

            const flatten = (items: any[]) => {
                items.forEach(item => {
                    flatComments.push(item)
                    if (item.replies && Array.isArray(item.replies)) {
                        flatten(item.replies)
                    }
                })
            }

            if (response.data) {
                flatten(response.data)
            }

            setComments(flatComments)
        } catch (error: any) {
            console.error('Failed to fetch comments:', error)
            toast.error('Không thể tải bình luận')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (blogId || feedId || discussionId) {
            fetchComments()
        }
    }, [blogId, feedId, discussionId, deliveryScopeId])

    const handleSubmitComment = async (content: string, parentId?: string) => {
        if (!content.trim()) return

        if (!isAuthenticated || !user?.id) {
            toast.error('Vui lòng đăng nhập để bình luận')
            return
        }

        try {
            const targetPayload = blogId
                ? { entityId: blogId, targetType: CommentTargetType.BLOG, blogId }
                : feedId
                    ? { entityId: feedId, targetType: CommentTargetType.FEED, feedId }
                    : { entityId: discussionId!, targetType: CommentTargetType.DISCUSSION, discussionId: discussionId!, deliveryScopeId }

            const newComment = await commentApi.create({
                ...targetPayload,
                userId: user.id,
                content: content.trim(),
                parentId: parentId || (discussionId || undefined),
            })

            setReplyTo(null)
            setComments(prev => [...prev, newComment])
            onCommentCountChange?.(1)

            toast.success(parentId ? 'Đã trả lời bình luận' : 'Đã gửi bình luận')
        } catch (error: any) {
            console.error('Failed to post comment:', error)
            toast.error('Không thể gửi bình luận')
            // Rethrow để CommentInput biết submit thất bại và không xoá nội dung người dùng
            throw error
        }
    }

    const handleLikeComment = async (commentId: string) => {
        if (!isAuthenticated || !user?.id) {
            toast.error('Thích bình luận yêu cầu đăng nhập')
            return
        }

        // Optimistic update
        setComments(prev => prev.map(c => {
            if (c.id === commentId) {
                const isLiked = !c.isLiked
                return {
                    ...c,
                    isLiked,
                    likeCount: isLiked ? (c.likeCount || 0) + 1 : Math.max((c.likeCount || 0) - 1, 0)
                }
            }
            return c
        }))

        try {
            const result = await commentApi.toggleLike(commentId)
            setComments(prev => prev.map(c => {
                if (c.id === commentId) {
                    return {
                        ...c,
                        isLiked: result.isLiked,
                        likeCount: result.likeCount
                    }
                }
                return c
            }))
        } catch (error: any) {
            console.error('Failed to like comment:', error)
            // Revert
            setComments(prev => prev.map(c => {
                if (c.id === commentId) {
                    const isLiked = !c.isLiked
                    return {
                        ...c,
                        isLiked,
                        likeCount: isLiked ? (c.likeCount || 0) + 1 : Math.max((c.likeCount || 0) - 1, 0)
                    }
                }
                return c
            }))
            toast.error('Lỗi khi thích bình luận')
        }
    }

    const handleUpdateComment = async (commentId: string, content: string) => {
        try {
            const updatedComment = await commentApi.update(commentId, { content })
            setComments(prev => prev.map(c => c.id === commentId ? { ...c, content: updatedComment.content } : c))
            toast.success('Đã cập nhật')
        } catch (error: any) {
            console.error('Failed to update comment:', error)
            toast.error('Lỗi khi cập nhật')
        }
    }

    const handleDeleteComment = async (commentId: string) => {
        try {
            await commentApi.delete(commentId)
            setComments(prev => prev.filter(c => c.id !== commentId))
            setDeleteConfirmId(null)
            onCommentCountChange?.(-1)
            toast.success('Đã xóa')
        } catch (error: any) {
            console.error('Failed to delete comment:', error)
            toast.error('Lỗi khi xóa bình luận')
        }
    }

    const rootComments = discussionId
        ? comments.filter(c => c.parentId === discussionId)
        : comments.filter(c => !c.parentId)

    const getReplies = (parentId: string) => comments.filter(c => c.parentId === parentId)

    return (
        <section className="space-y-10">
            {/* Thread Header */}
            {!discussionId && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="size-4 text-muted-foreground/60" />
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Phản hồi</h3>
                        <Badge variant="outline" className="rounded-full px-2 py-0 border-border/60 text-[9px] h-4">
                            {formatNumber(comments.length - 1)}
                        </Badge>
                    </div>
                </div>
            )}

        
            {/* List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="py-20 flex flex-col items-center gap-6">
                        <Spinner className="size-5 text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/30 animate-pulse">Đang đồng bộ ý kiến...</span>
                    </div>
                ) : rootComments.length > 0 ? (
                    rootComments.map((comment, index) => (
                        <div key={comment.id}>
                            <CommentItem
                                comment={comment}
                                replies={getReplies(comment.id)}
                                allComments={comments}
                                isAuthenticated={isAuthenticated}
                                onReplyClick={(id) => setReplyTo(id === replyTo ? null : id)}
                                replyingToId={replyTo}
                                onReplySubmit={handleSubmitComment}
                                onLikeComment={handleLikeComment}
                                user={user}
                                onUpdateComment={handleUpdateComment}
                                onDeleteComment={handleDeleteComment}
                                onRequestDelete={setDeleteConfirmId}
                                canLike={!!blogId || !!feedId || !!discussionId}
                            />
                            {index < rootComments.length - 1 && <div className="h-px bg-border/10 mx-6 my-4" />}
                        </div>
                    ))
                ) : (
                    <div className="py-24 text-center space-y-8 rounded-[3rem] bg-muted/10 border border-dashed border-border/20">
                        <User className="size-10 text-muted-foreground/10 mx-auto" />
                        <div className="space-y-2">
                            <p className="text-xl font-black tracking-tight">Vùng im lặng</p>
                            <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest leading-relaxed">Hãy là người thắp sáng cuộc thảo luận này.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Main Input Area */}
            <div className="pt-12">
                <CommentInput
                    user={user}
                    onSubmit={(text) => handleSubmitComment(text)}
                    placeholder="Tham gia thảo luận..."
                />
            </div>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
                <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-10">
                    <AlertDialogHeader className="space-y-4">
                        <AlertDialogTitle className="text-2xl font-black tracking-tight">XÓA VĨNH VIỄN?</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium text-muted-foreground leading-relaxed italic">
                            Lời nói đã thốt ra không thể rút lại, nhưng bình luận này thì có thể biến mất mãi mãi. Bạn chắc chứ?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-8 gap-4">
                        <AlertDialogCancel className="rounded-full font-black text-[10px] uppercase tracking-widest border-none hover:bg-muted">Giữ lại</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteConfirmId && handleDeleteComment(deleteConfirmId)}
                            className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 font-black text-[10px] uppercase tracking-widest px-10 h-10"
                        >
                            Xác nhận xóa
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </section>
    )
}

function CommentItem({
    comment,
    replies,
    allComments,
    isAuthenticated,
    onReplyClick,
    replyingToId,
    onReplySubmit,
    onLikeComment,
    user,
    onUpdateComment,
    onDeleteComment,
    onRequestDelete,
    canLike = true,
    depth = 0
}: {
    comment: CommentResponseDTO,
    replies: CommentResponseDTO[],
    allComments: CommentResponseDTO[],
    isAuthenticated: boolean,
    onReplyClick: (id: string) => void,
    replyingToId: string | null,
    onReplySubmit: (content: string, parentId: string) => Promise<void>,
    onLikeComment: (commentId: string) => void,
    user: any,
    onUpdateComment: (id: string, content: string) => Promise<void>,
    onDeleteComment: (id: string) => Promise<void>,
    onRequestDelete: (id: string) => void,
    canLike?: boolean,
    depth?: number
}) {
    const isReplying = replyingToId === comment.id
    const isOwner = isAuthenticated && user?.id === comment.author?.id
    const [isEditing, setIsEditing] = useState(false)

    const handleUpdate = async (text: string) => {
        await onUpdateComment(comment.id, text)
        setIsEditing(false)
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
            <div className="flex gap-6">
                <Avatar className="size-10 shadow-lg border border-background shrink-0 mt-1">
                    <AvatarImage src={comment.author?.avatarUrl || undefined} />
                    <AvatarFallback className="bg-primary/5 text-primary font-black text-[10px]">
                        {(comment.author?.displayName || 'U')[0]}
                    </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-center gap-4 flex-wrap">
                        <span className="font-black text-[11px] uppercase tracking-widest text-foreground">
                            {comment.author?.displayName || 'Anonymous'}
                        </span>
                        {comment.isOfficialReply && comment.authorRoleLabel && (
                            <Badge className="bg-primary text-primary-foreground border-none text-[8px] font-black uppercase tracking-tighter h-4 px-2">
                                Chính thức
                            </Badge>
                        )}
                        <span className="text-[9px] font-mono font-bold uppercase tracking-tighter text-muted-foreground/30">
                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: vi })}
                        </span>
                    </div>

                    {isEditing ? (
                        <div className="pt-2">
                            <CommentInput
                                user={user}
                                onSubmit={handleUpdate}
                                initialValue={comment.content}
                                placeholder="Hiệu chỉnh nội dung..."
                                autoFocus
                                onCancel={() => setIsEditing(false)}
                                submitLabel="Lưu"
                            />
                        </div>
                    ) : (
                        <p className="text-sm text-foreground/70 leading-relaxed whitespace-pre-wrap break-words italic selection:bg-primary/20">
                            {comment.content}
                        </p>
                    )}

                    <div className="flex items-center gap-8 pt-2">
                        {canLike && (
                            <button
                                className={cn(
                                    "flex items-center gap-2 text-[9px] font-black uppercase tracking-widest transition-all hover:scale-110",
                                    comment.isLiked ? "text-destructive" : "text-muted-foreground/40 hover:text-destructive"
                                )}
                                onClick={() => onLikeComment(comment.id)}
                            >
                                <Heart className={cn("size-3.5", comment.isLiked && "fill-current")} />
                                <span className="font-mono">{formatNumber(comment.likeCount || 0)}</span>
                            </button>
                        )}
                        
                        <button
                            className={cn(
                                "flex items-center gap-2 text-[9px] font-black uppercase tracking-widest transition-all",
                                isReplying ? "text-primary" : "text-muted-foreground/40 hover:text-primary"
                            )}
                            onClick={() => onReplyClick(comment.id)}
                            disabled={!isAuthenticated}
                        >
                            <Reply className="size-3.5" />
                            <span>Trả lời</span>
                        </button>

                        {isOwner && !isEditing && (
                            <div className="flex items-center gap-4">
                                <button onClick={() => setIsEditing(true)} className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/20 hover:text-foreground transition-colors">Sửa</button>
                                <button onClick={() => onRequestDelete(comment.id)} className="text-[9px] font-black uppercase tracking-widest text-destructive/20 hover:text-destructive transition-colors">Xóa</button>
                            </div>
                        )}
                    </div>

                    {isReplying && (
                        <div className="mt-8 animate-in fade-in slide-in-from-top-4 duration-700">
                            <CommentInput
                                user={user}
                                onSubmit={(text) => onReplySubmit(text, comment.id)}
                                placeholder={`Phản hồi cho ${comment.author?.displayName || '...'}`}
                                autoFocus
                                onCancel={() => onReplyClick(comment.id)}
                            />
                        </div>
                    )}

                    {replies.length > 0 && (
                        <div className="mt-8 space-y-10 pl-6 sm:pl-10 border-l border-border/10">
                            {replies.map(reply => (
                                <CommentItem
                                    key={reply.id}
                                    comment={reply}
                                    replies={allComments.filter(c => c.parentId === reply.id)}
                                    allComments={allComments}
                                    isAuthenticated={isAuthenticated}
                                    onReplyClick={onReplyClick}
                                    replyingToId={replyingToId}
                                    onReplySubmit={onReplySubmit}
                                    onLikeComment={onLikeComment}
                                    user={user}
                                    onUpdateComment={onUpdateComment}
                                    onDeleteComment={onDeleteComment}
                                    onRequestDelete={onRequestDelete}
                                    canLike={canLike}
                                    depth={depth + 1}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function CommentInput({ user, onSubmit, placeholder = "Viết bình luận...", autoFocus, onCancel, initialValue = '', submitLabel }: CommentInputProps) {
    const [text, setText] = useState(initialValue)
    const [submitting, setSubmitting] = useState(false)

    const handleSubmit = async () => {
        if (!text.trim()) return
        try {
            setSubmitting(true)
            await onSubmit(text)
            setText('')
        } catch (error) {
            console.error(error)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="flex gap-6 items-start animate-in fade-in duration-1000">
            <Avatar className="size-10 shadow-md border border-background shrink-0 mt-1">
                <AvatarImage src={user?.avatarUrl || undefined} />
                <AvatarFallback className="bg-primary/5 text-primary font-black text-[10px]">
                    {(user?.displayName || 'U')[0]}
                </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-6">
                <Textarea
                    placeholder={placeholder}
                    className="min-h-[120px] w-full bg-muted/20 border-none focus-visible:ring-0 transition-all rounded-[2rem] resize-none p-6 text-sm leading-relaxed shadow-inner italic"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    autoFocus={autoFocus}
                />

                <div className="flex items-center justify-end gap-6 pb-2">
                    {onCancel && (
                        <Button
                            variant="ghost"
                            onClick={onCancel}
                            className="font-black text-[10px] uppercase tracking-widest text-muted-foreground/40 hover:text-foreground hover:bg-transparent"
                        >
                            Hủy
                        </Button>
                    )}

                    <Button
                        onClick={handleSubmit}
                        disabled={submitting || !text.trim()}
                        className={cn(
                            "rounded-full px-12 h-10 font-black text-[10px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all",
                            submitting ? "opacity-50" : ""
                        )}
                    >
                        {submitting ? (
                            <Spinner className="size-4 animate-spin text-background" />
                        ) : submitLabel || 'Gửi'}
                    </Button>
                </div>
            </div>
        </div>
    )
}
