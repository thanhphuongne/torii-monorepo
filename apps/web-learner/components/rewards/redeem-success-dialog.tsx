'use client'

import { Ticket } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@workspace/ui/components/dialog"
import { toast } from 'sonner'
import Link from 'next/link'

interface RedeemSuccessDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    coupon: {
        code: string
    } | null
    pointsDeducted: number | null
}

export function RedeemSuccessDialog({
    open,
    onOpenChange,
    coupon,
    pointsDeducted,
}: RedeemSuccessDialogProps) {
    if (!coupon) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] text-center">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-center">🎉 Đổi quà thành công!</DialogTitle>
                    <DialogDescription className="text-center pt-2">
                        Bạn đã đổi thành công <span className="font-bold text-primary">{pointsDeducted} Points</span> lấy ưu đãi này.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-8 space-y-4">
                    <div className="bg-primary/5 border-2 border-dashed border-primary/20 rounded-2xl p-6 relative overflow-hidden group">
                        <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform">
                            <Ticket className="size-24 text-primary" />
                        </div>

                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] mb-2">Mã giảm giá của bạn</p>
                        <h3 className="text-4xl font-bold text-primary tracking-[0.3em] mb-4 select-all">{coupon.code}</h3>

                        <Button
                            variant="outline"
                            size="sm"
                            className="font-bold uppercase tracking-widest text-[10px] h-8 border-2"
                            onClick={() => {
                                navigator.clipboard.writeText(coupon.code)
                                toast.success('Đã sao chép mã!')
                            }}
                        >
                            Sao chép mã
                        </Button>
                    </div>

                    <div className="text-xs text-muted-foreground font-medium">
                        Bạn có thể sử dụng mã này khi thanh toán khóa học.
                    </div>
                </div>

                <DialogFooter>
                    <Button className="w-full font-bold uppercase tracking-widest" onClick={() => onOpenChange(false)}>
                        Tuyệt vời!
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
