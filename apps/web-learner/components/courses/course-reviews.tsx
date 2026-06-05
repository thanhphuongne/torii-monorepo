'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Star, ThumbsUp, MessageSquare, Plus, Search, ChevronRight, X, Sparkles } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { Avatar, AvatarFallback, AvatarImage } from '@workspace/ui/components/avatar'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@workspace/ui/components/dialog'
import { Textarea } from '@workspace/ui/components/textarea'
import type { AcademyCourseProfileCreateDTO } from '@workspace/schemas'
import { academyClassReviewsClient as reviewApi, type ClassReview as ReviewResponse } from '@/lib/api/services/academy-class-reviews'

export interface RatingDistribution {
    averageRating: number
    totalReviews: number
    distribution: Array<{
        stars: number
        count: number
        percent: number
    }>
}
import { useAppSelector } from '@/hooks/hooks'
import { useCourseEnrollment } from '@/hooks/use-course-enrollment'
import { Field, FieldLabel, FieldError } from '@workspace/ui/components/field'
import { toast } from '@workspace/ui/components/sonner'
import { cn } from '@workspace/ui/lib/utils'
import { useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
    Item,
    ItemActions,
    ItemContent,
    ItemDescription,
    ItemMedia,
    ItemTitle,
} from "@workspace/ui/components/item"
import { Input } from "@workspace/ui/components/input";

import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@workspace/ui/components/empty"

const courseReviewSchema = z.object({
    rating: z.number().min(1, 'Vui lòng chọn số sao'),
    comment: z.string().optional(),
})

type CourseReviewFormData = z.infer<typeof courseReviewSchema>

interface CourseReviewsProps {
    course: AcademyCourseProfileCreateDTO & { id: string; slug?: string }
}

export function CourseReviews({ course }: CourseReviewsProps) {
    const [reviews, setReviews] = useState<ReviewResponse[]>([])
    const [ratingDistribution, setRatingDistribution] = useState<RatingDistribution | null>(null)
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(false)
    const [showReviewForm, setShowReviewForm] = useState(false)
    const [showAllReviews, setShowAllReviews] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const form = useForm<CourseReviewFormData>({
        resolver: zodResolver(courseReviewSchema),
        defaultValues: {
            rating: 0,
            comment: '',
        },
    })

    const { control, handleSubmit, setValue, watch, reset } = form
    const currentRating = watch('rating')

    const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated)
    const user = useAppSelector((state) => state.auth.user)

    const { enrollment, isEnrolled, isLoadingEnrollment } = useCourseEnrollment(course.id, course.slug || '')
    const userReview = reviews.find((r) => r.user?.id === user?.id)

    useEffect(() => {
        loadReviews()
        loadRatingDistribution()
    }, [course.id, page])

    const loadReviews = async () => {
        try {
            setLoading(true)
            const response = await reviewApi.listByLiveClass(course.id, { limit: 10, offset: (page - 1) * 10, status: 'PUBLISHED' })
            const data = response?.data?.data?.items || []
            const total = response?.data?.data?.total || 0

            if (page === 1) {
                setReviews(data)
            } else {
                setReviews((prev) => [...prev, ...data])
            }
            setHasMore(reviews.length + data.length < total)
        } catch (error: any) {
            console.error('Failed to load reviews:', error)
            toast.error('Không thể tải đánh giá')
        } finally {
            setLoading(false)
        }
    }

    const loadRatingDistribution = async () => {
        // NOTE: Distribution API is no longer separate. We can mock it or skip for now.
        // In a real scenario, this might come from the course/class metadata.
    }

    const queryClient = useQueryClient()

    const onSubmitReview = async (data: CourseReviewFormData) => {
        if (!isAuthenticated) {
            toast.error('Vui lòng đăng nhập để đánh giá')
            return
        }

        try {
            setSubmitting(true)
            const response = await reviewApi.create(course.id, {
                enrollmentId: enrollment?.id || '',
                rating: data.rating,
                isAnonymous: false,
                content: data.comment || '',
            })
            const newReview = response.data.data
            setReviews((prev) => [newReview, ...prev])
            setShowReviewForm(false)
            reset()
            toast.success('Đánh giá của bạn đã được gửi')

            // Invalidate queries to refresh data across the app
            queryClient.invalidateQueries({ queryKey: ['class-reviews', course.id] })

            await loadRatingDistribution()
        } catch (error: any) {
            console.error('Failed to submit review:', error)
            toast.error(error?.response?.data?.message || 'Không thể gửi đánh giá')
        } finally {
            setSubmitting(false)
        }
    }

    const renderStars = (rating: number, onRatingChange?: (r: number) => void, size: number = 4) => {
        return (
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                        key={i}
                        className={cn(
                            `w-${size} h-${size}`,
                            i <= rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-muted-foreground/20',
                            onRatingChange && 'cursor-pointer hover:scale-110 transition-transform hover:text-amber-400'
                        )}
                        onClick={() => onRatingChange?.(i)}
                    />
                ))}
            </div>
        )
    }

    const ReviewItem = ({ review }: { review: ReviewResponse }) => {
        const initials = review.user.displayName
            ? review.user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
            : 'U'

        const formatTimeAgo = (date: Date | string) => {
            const now = new Date()
            const reviewDate = new Date(date)
            const diffInMs = now.getTime() - reviewDate.getTime()
            const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

            if (diffInDays === 0) return 'Hôm nay'
            if (diffInDays === 1) return 'Hôm qua'
            if (diffInDays < 7) return `${diffInDays} ngày trước`
            if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} tuần trước`
            return `${Math.floor(diffInDays / 30)} tháng trước`
        }

        return (
            <div className="p-6 bg-card rounded-xl border">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground">
                            {initials}
                        </div>
                        <div>
                            <p className="font-bold text-sm">{review.user.displayName}</p>
                            <p className="text-xs text-muted-foreground">{formatTimeAgo(review.createdAt)}</p>
                        </div>
                    </div>
                    <div className="flex text-amber-500 text-sm">
                        {[...Array(5)].map((_, i) => (
                            <Star key={i} className={cn("size-4", i < review.rating && "fill-current")} />
                        ))}
                    </div>
                </div>
                {review.content && (
                    <p className="text-sm text-muted-foreground">{review.content}</p>
                )}
            </div>
        )
    }

    const averageRating = ratingDistribution?.averageRating || /* Number((course as any).averageRating) */ 4.8 || 0
    const totalReviews = ratingDistribution?.totalReviews || /* (course as any).totalReviews */ 12 || 0
    const roundedRating = Math.round(averageRating * 10) / 10

    const distribution = ratingDistribution?.distribution || [
        { stars: 5, count: 0, percent: 0 },
        { stars: 4, count: 0, percent: 0 },
        { stars: 3, count: 0, percent: 0 },
        { stars: 2, count: 0, percent: 0 },
        { stars: 1, count: 0, percent: 0 },
    ]

    const RatingBreakdown = () => (
        <div className="space-y-3">
            {[5, 4, 3, 2, 1].map((star) => {
                const stat = distribution.find(d => d.stars === star) || { stars: star, count: 0, percent: 0 }
                return (
                    <div key={star} className="flex items-center gap-3 text-sm">
                        <div className="flex items-center gap-1 w-8">
                            <span className="font-bold text-foreground">{star}</span>
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        </div>
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div
                                className="h-full bg-amber-400 rounded-full"
                                style={{ width: `${stat.percent}%` }}
                            />
                        </div>
                        <div className="w-10 text-right">
                            <span className="text-xs text-muted-foreground">{stat.percent}%</span>
                        </div>
                    </div>
                )
            })}
        </div>
    )

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
                <MessageSquare className="text-primary size-6" />
                Đánh giá từ học viên
            </h3>

            <div className="grid gap-4">
                {loading && page === 1 ? (
                    <div className="py-12 text-center text-muted-foreground">
                        Đang tải đánh giá...
                    </div>
                ) : reviews.length === 0 ? (
                    <div className="py-12 text-center">
                        <p className="text-muted-foreground">Chưa có đánh giá nào</p>
                        {isAuthenticated && isEnrolled && !userReview && (
                            <div className="mt-4">
                                <Dialog open={showReviewForm} onOpenChange={setShowReviewForm}>
                                    <DialogTrigger asChild>
                                        <Button className="font-bold">
                                            <Plus className="mr-2 size-4" />
                                            Viết đánh giá đầu tiên
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-md">
                                        <DialogHeader>
                                            <DialogTitle>Đánh giá khóa học</DialogTitle>
                                            <DialogDescription>
                                                Chia sẻ trải nghiệm của bạn với khóa học này
                                            </DialogDescription>
                                        </DialogHeader>
                                        <form onSubmit={handleSubmit(onSubmitReview)} className="space-y-4">
                                            <Field>
                                                <FieldLabel>Đánh giá của bạn</FieldLabel>
                                                <Controller
                                                    name="rating"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <div className="flex gap-1">
                                                            {[1, 2, 3, 4, 5].map((i) => (
                                                                <Star
                                                                    key={i}
                                                                    className={cn(
                                                                        'size-8 cursor-pointer transition-all',
                                                                        i <= field.value
                                                                            ? 'fill-amber-400 text-amber-400'
                                                                            : 'text-muted-foreground/20 hover:text-amber-400'
                                                                    )}
                                                                    onClick={() => field.onChange(i)}
                                                                />
                                                            ))}
                                                        </div>
                                                    )}
                                                />
                                                <FieldError />
                                            </Field>
                                            <Field>
                                                <FieldLabel>Nhận xét (tùy chọn)</FieldLabel>
                                                <Controller
                                                    name="comment"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <Textarea
                                                            {...field}
                                                            placeholder="Chia sẻ trải nghiệm của bạn..."
                                                            rows={4}
                                                        />
                                                    )}
                                                />
                                            </Field>
                                            <DialogFooter>
                                                <Button type="submit" disabled={submitting} className="font-bold">
                                                    {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
                                                </Button>
                                            </DialogFooter>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {reviews.slice(0, showAllReviews ? reviews.length : 3).map((review) => (
                            <ReviewItem key={review.id} review={review} />
                        ))}
                        {reviews.length > 3 && !showAllReviews && (
                            <div className="pt-4">
                                <Button
                                    variant="outline"
                                    className="w-full font-bold"
                                    onClick={() => setShowAllReviews(true)}
                                >
                                    Xem tất cả đánh giá
                                    <ChevronRight className="ml-2 size-4" />
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
