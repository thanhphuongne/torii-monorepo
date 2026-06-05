"use client"

import { useState } from "react"
import { academyClassReviewHooks } from "@/lib/api/services/academy-class-reviews"
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { StarIcon } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Button } from "@workspace/ui/components/button"

export function StudentReviewsSection({ liveClassId }: { liveClassId: string }) {
    const [limit, setLimit] = useState(5)
    const { data, isLoading } = academyClassReviewHooks.useListByLiveClass(liveClassId, { limit, offset: 0, status: "PUBLISHED" })

    const reviews = data?.data?.data?.items || []
    const total = data?.data?.data?.total || 0

    if (isLoading) {
        return (
            <section className="bg-white rounded-2xl p-8 border border-zinc-100 shadow-sm mt-12">
                <h2 className="text-2xl font-bold text-zinc-900 mb-8">Đánh giá từ học viên</h2>
                <div className="space-y-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex gap-4">
                            <Skeleton className="size-12 rounded-full" />
                            <div className="space-y-2 flex-1">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-16 w-full" />
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        )
    }

    if (reviews.length === 0) {
        return (
            <section className="bg-white rounded-2xl p-8 border border-zinc-100 shadow-sm mt-12">
                <h2 className="text-2xl font-bold text-zinc-900 mb-4">Đánh giá từ học viên</h2>
                <p className="text-zinc-500 italic">Chưa có đánh giá nào cho lớp học này.</p>
            </section>
        )
    }

    // Calculate average rating from the data, or just show list
    const avgRating = reviews.length > 0
        ? (reviews.reduce((acc: number, cur: any) => acc + cur.rating, 0) / reviews.length).toFixed(1)
        : "5.0"

    return (
        <section className="bg-white rounded-2xl p-8 border border-zinc-100 shadow-sm mt-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <h2 className="text-2xl font-bold text-zinc-900">Đánh giá từ học viên</h2>
                <div className="flex items-center gap-2">
                    <div className="flex text-yellow-500">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <StarIcon key={i} className={`size-5 ${i < Math.round(Number(avgRating)) ? 'fill-current' : 'text-zinc-200'}`} />
                        ))}
                    </div>
                    <span className="font-bold text-lg">{avgRating}</span>
                    <span className="text-zinc-500">({total} đánh giá)</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
                {reviews.map((review: any) => (
                    <div key={review.id} className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Avatar className="size-10 border border-zinc-100 shadow-sm">
                                    <AvatarImage src={review.user?.avatarUrl || ""} />
                                    <AvatarFallback className="bg-zinc-100 text-zinc-600 font-medium">
                                        {review.isAnonymous ? "A" : (review.user?.displayName?.[0] || "U")}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="font-bold text-zinc-900 text-sm">
                                        {review.isAnonymous ? "Học viên ẩn danh" : (review.user?.displayName || "Học viên")}
                                    </div>
                                    <div className="text-xs text-zinc-500">
                                        {formatDistanceToNow(new Date(review.publishedAt || review.createdAt), { addSuffix: true, locale: vi })}
                                    </div>
                                </div>
                            </div>
                            <div className="flex text-yellow-500">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <StarIcon key={i} className={`size-3.5 ${i < review.rating ? 'fill-current' : 'text-zinc-200'}`} />
                                ))}
                            </div>
                        </div>

                        <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-100 relative">
                            {/* Small decorative quote mark */}
                            <div className="absolute -top-2 left-4 bg-white px-1 text-zinc-300 text-xl">"</div>
                            {review.title && <h4 className="font-bold text-sm text-zinc-800 mb-1">{review.title}</h4>}
                            <p className="text-zinc-600 text-sm leading-relaxed whitespace-pre-wrap">{review.content || "Đánh giá không có nội dung."}</p>
                        </div>
                    </div>
                ))}
            </div>

            {total > reviews.length && (
                <div className="mt-8 flex justify-center">
                    <Button variant="outline" className="border-zinc-200 hover:bg-zinc-50 font-medium" onClick={() => setLimit(l => l + 6)}>
                        Xem thêm đánh giá
                    </Button>
                </div>
            )}
        </section>
    )
}
