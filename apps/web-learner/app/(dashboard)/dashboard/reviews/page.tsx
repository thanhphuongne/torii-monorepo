'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppSelector } from '@/hooks/hooks'
import { ReviewList } from '@/components/reviews/review-list'
import { PageLoading } from '@workspace/ui/components/page-loading'
import { MessageSquare } from 'lucide-react'

export default function DashboardReviewsPage() {
    const { user, isAuthenticated, status } = useAppSelector((state) => state.auth)
    const router = useRouter()
    const [isClient, setIsClient] = useState(false)

    useEffect(() => {
        setIsClient(true)
    }, [])

    useEffect(() => {
        if (status !== 'loading' && !isAuthenticated) {
            router.push('/login')
        }
    }, [isAuthenticated, status, router])

    if (!isClient || status === 'loading' || !user) {
        return <PageLoading />
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center gap-4 border-b border-border/40 pb-6">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-normal text-foreground">Đánh giá của tôi</h1>
                    <p className="text-sm text-muted-foreground">
                        Xem lại lịch sử đánh giá và nhận xét của bạn về các khóa học trên hệ thống.
                    </p>
                </div>
            </div>

            <ReviewList />
        </div>
    )
}
