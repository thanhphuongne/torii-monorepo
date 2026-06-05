'use client'

import { AlertCircle } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@workspace/ui/components/dialog"

interface RedeemConfirmDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    selectedDeal: {
        costPoints: number
        name: string
    } | null
    isLoading: boolean
    onConfirm: () => void
}

export function RedeemConfirmDialog({
    open,
    onOpenChange,
    selectedDeal,
    isLoading,
    onConfirm,
}: RedeemConfirmDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Xác nhận đổi điểm</DialogTitle>
                    <DialogDescription>
                        Bạn muốn dùng <span className="font-bold text-primary">{selectedDeal?.costPoints} Points</span> để đổi lấy <span className="font-bold">"{selectedDeal?.name}"</span>?
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 flex items-center gap-4 text-amber-600 bg-amber-50 p-4 rounded-xl border border-amber-100">
                    <AlertCircle className="size-5 shrink-0" />
                    <p className="text-xs font-medium">Mã giảm giá sau khi đổi sẽ được gán cho tài khoản của bạn và không thể chuyển nhượng.</p>
                </div>
                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={isLoading}
                    >
                        Hủy
                    </Button>
                    <Button
                        onClick={onConfirm}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Đang xử lý...' : 'Xác nhận đổi'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
