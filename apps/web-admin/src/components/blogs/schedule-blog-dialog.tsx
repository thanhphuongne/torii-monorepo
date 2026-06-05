import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@workspace/ui/components/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import {
    Field,
    FieldLabel,
} from '@workspace/ui/components/field';
import { toast } from 'sonner';
import { useUpdateBlog } from '@/lib/api/services/blog';
import { Spinner } from "@workspace/ui/components/spinner";
import { BlogStatus } from '@workspace/schemas';
import { formatDateTime, formatForDateTimeLocal } from "@/lib/format-utils"

interface ScheduleBlogDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    blogId: string;
    onSuccess?: () => void;
    content?: string; // the latest content to save while scheduling (optional)
}

export function ScheduleBlogDialog({
    open,
    onOpenChange,
    blogId,
    onSuccess,
    content,
}: ScheduleBlogDialogProps) {
    const updateBlog = useUpdateBlog();
    const [publishedAt, setPublishedAt] = useState<string>('');
    const [showConfirm, setShowConfirm] = useState(false);

    // Reset date when dialog opens
    useEffect(() => {
        if (open) {
            setPublishedAt('');
            setShowConfirm(false);
        }
    }, [open]);

    const handleUpdateClick = () => {
        if (!publishedAt) {
            toast.error('Vui lòng chọn ngày xuất bản');
            return;
        }

        const publishDate = new Date(publishedAt);
        if (publishDate <= new Date()) {
            toast.error('Ngày xuất bản phải ở trong tương lai');
            return;
        }

        setShowConfirm(true);
    };

    const handleConfirmUpdate = async () => {
        try {
            await updateBlog.mutateAsync({
                id: blogId,
                blog: {
                    ...(content ? { content } : {}),
                    status: BlogStatus.SCHEDULED,
                    publishedAt: new Date(publishedAt),
                },
            });
            toast.success('Đã lên lịch xuất bản bài viết');
            setShowConfirm(false);
            onOpenChange(false);
            onSuccess?.();
        } catch (error: any) {
            toast.error('Lên lịch thất bại', {
                description: error.response?.data?.message || 'Không thể lên lịch xuất bản bài viết',
            });
        }
    };

    return (
        <>
            <Dialog open={open && !showConfirm} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Lên lịch xuất bản</DialogTitle>
                        <DialogDescription>
                            Chọn thời gian để hệ thống tự động xuất bản bài viết này.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        <Field className="space-y-2">
                            <FieldLabel>Ngày xuất bản dự kiến</FieldLabel>
                            <Input
                                type="datetime-local"
                                value={publishedAt}
                                onChange={(e) => setPublishedAt(e.target.value)}
                                min={formatForDateTimeLocal(new Date())}
                            />
                        </Field>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Hủy bỏ
                        </Button>
                        <Button onClick={handleUpdateClick}>
                            Tiếp tục
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận lên lịch?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bài viết sẽ được tự động xuất bản vào lúc
                            <strong className="mx-1 text-primary">
                                {formatDateTime(publishedAt, "HH:mm dd/MM/yyyy")}
                            </strong>.
                            Bạn có chắc chắn muốn tiếp tục?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={updateBlog.isPending}>Quay lại</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleConfirmUpdate();
                            }}
                            disabled={updateBlog.isPending}
                        >
                            {updateBlog.isPending ? (
                                <>
                                    <Spinner className="mr-2 h-4 w-4" />
                                    Đang lưu...
                                </>
                            ) : (
                                "Xác nhận"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
