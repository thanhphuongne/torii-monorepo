import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog';
import { Button } from '@workspace/ui/components/button';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useDeleteAcademyQuestion } from '@/lib/api/services/academy-questions';
import { Spinner } from '@workspace/ui/components/spinner';

interface DeleteQuestionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    question: {
        id: string;
        stem: string;
    } | null;
}

export function DeleteQuestionDialog({
    open,
    onOpenChange,
    question,
}: DeleteQuestionDialogProps) {
    const deleteQuestion = useDeleteAcademyQuestion();

    const handleDelete = async () => {
        if (!question) return;

        try {
            await deleteQuestion.mutateAsync(question.id);
            toast.success('Đã xóa câu hỏi thành công');
            onOpenChange(false);
        } catch (error: any) {
            const msg = error.userMessage || error.response?.data?.message || error.message;
            toast.error(msg || 'Không thể xóa câu hỏi');
            onOpenChange(false);
        }

    };

    if (!question) return null;

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent size="sm">
                <AlertDialogHeader>
                    <AlertDialogMedia className="bg-destructive/10 text-destructive">
                        <AlertTriangle />
                    </AlertDialogMedia>
                    <AlertDialogTitle>Xóa câu hỏi</AlertDialogTitle>
                    <AlertDialogDescription>
                        Hành động này sẽ xóa vĩnh viễn câu hỏi{' '}
                        <span className="font-semibold text-foreground line-clamp-1">
                            &ldquo;{question.stem}&rdquo;
                        </span>
                        . Thao tác này không thể hoàn tác.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                    <AlertDialogCancel asChild>
                        <Button variant="outline" disabled={deleteQuestion.isPending}>
                            Hủy
                        </Button>
                    </AlertDialogCancel>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={deleteQuestion.isPending}
                    >
                        {deleteQuestion.isPending ? (
                            <Spinner />
                        ) : (
                            'Xóa câu hỏi'
                        )}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}