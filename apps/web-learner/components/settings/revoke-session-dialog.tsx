'use client'

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@workspace/ui/components/dialog';
import { Button } from '@workspace/ui/components/button';
import { AlertTriangle } from 'lucide-react';
import { Spinner } from '@workspace/ui/components/spinner'

interface RevokeSessionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    isPending: boolean;
    title: string;
    description: string;
}

export function RevokeSessionDialog({
    open,
    onOpenChange,
    onConfirm,
    isPending,
    title,
    description
}: RevokeSessionDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader className="space-y-3">
                    <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                        <AlertTriangle className="size-6" />
                    </div>
                    <div className="space-y-1 text-center">
                        <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
                        <DialogDescription className="text-sm">
                            {description}
                        </DialogDescription>
                    </div>
                </DialogHeader>
                <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-4">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={isPending}
                        className="flex-1 font-bold"
                    >
                        Hủy
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={isPending}
                        className="flex-1 font-bold"
                    >
                        {isPending ? (
                            <div className="flex items-center gap-2">
                                <Spinner className="size-3 animate-spin" />
                                Đang xử lý...
                            </div>
                        ) : (
                            'Xác nhận'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
