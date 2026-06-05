'use client'

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Clock } from "lucide-react"

interface CourseExpirationModalProps {
    isOpen: boolean
    onClose: () => void
    courseTitle: string
}

export function CourseExpirationModal({
    isOpen,
    onClose,
    courseTitle,
}: CourseExpirationModalProps) {
    return (
        <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <AlertDialogContent className="rounded-2xl border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200">
                <AlertDialogHeader>
                    <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                        <Clock className="w-6 h-6 text-destructive" />
                    </div>
                    <AlertDialogTitle className="text-xl font-bold text-center">
                        Khóa học đã hết hạn
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-sm text-muted-foreground text-center">
                        Quyền truy cập vào khóa học <span className="font-bold text-foreground">{courseTitle}</span> đã kết thúc. Bạn không thể xem lại nội dung bài học sau thời hạn đã quy định.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="sm:flex-col gap-2 mt-4">
                    <AlertDialogAction
                        onClick={onClose}
                        className="w-full rounded-xl h-11 font-bold"
                    >
                        Đóng
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
