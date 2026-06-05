'use client'

import { useMemo, useState } from 'react'
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog'
import { toast } from '@workspace/ui/components/sonner'
import { Button } from '@workspace/ui/components/button'
import { academyClassReviewHooks } from '@/lib/api/services/academy-class-reviews'
import type { ReviewRow } from './reviews-columns'
import { ReviewsTable } from './reviews-table'
import { ReviewDetailDialog } from './review-detail-dialog'

export function ReviewList() {
    const { data: axiosRes, isLoading } = academyClassReviewHooks.useListMine()
    const deleteMutation = academyClassReviewHooks.useDeleteReview()

    const reviews = useMemo((): ReviewRow[] => {
        const raw = axiosRes?.data?.data ?? []
        return raw.map((r: ReviewRow) => ({
            ...r,
            courseTitle: r.class?.courseProfile?.title || 'Khóa học',
        }))
    }, [axiosRes])

    const [detailOpen, setDetailOpen] = useState(false)
    const [detailReview, setDetailReview] = useState<ReviewRow | null>(null)

    const [confirmOpen, setConfirmOpen] = useState(false)
    const [pendingRemove, setPendingRemove] = useState<ReviewRow | null>(null)

    const openDetail = (r: ReviewRow) => {
        setDetailReview(r)
        setDetailOpen(true)
    }

    const requestRemove = (r: ReviewRow) => {
        setPendingRemove(r)
        setConfirmOpen(true)
    }

    const confirmRemove = () => {
        if (!pendingRemove) return
        const id = pendingRemove.id
        deleteMutation.mutate(id, {
            onSuccess: () => {
                toast.success('Đã xóa đánh giá.')
                setConfirmOpen(false)
                setPendingRemove(null)
                if (detailReview?.id === id) {
                    setDetailOpen(false)
                    setDetailReview(null)
                }
            },
            onError: () => {
                toast.error('Không thể xóa đánh giá. Vui lòng thử lại.')
            },
        })
    }

    return (
        <>
            <ReviewsTable
                data={reviews}
                isLoading={isLoading}
                onViewDetail={openDetail}
                onRemove={requestRemove}
                page={1}
                limit={50}
            />

            <ReviewDetailDialog
                open={detailOpen}
                onOpenChange={(open) => {
                    setDetailOpen(open)
                    if (!open) setDetailReview(null)
                }}
                review={detailReview}
                onRequestRemove={requestRemove}
            />

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Gỡ đánh giá này?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Đánh giá sẽ bị xóa khỏi hệ thống. Bạn có thể đánh giá lại sau tại trang khóa học nếu cần.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            onClick={() => {
                                setPendingRemove(null)
                            }}
                        >
                            Hủy
                        </AlertDialogCancel>
                        <Button
                            type="button"
                            variant="destructive"
                            disabled={deleteMutation.isPending}
                            onClick={confirmRemove}
                        >
                            {deleteMutation.isPending ? 'Đang xử lý…' : 'Xóa đánh giá'}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
