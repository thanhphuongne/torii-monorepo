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
import { toast } from '@workspace/ui/components/sonner';
import { useDeleteBlog } from "@/lib/api/services/blog.ts";
import type { BlogResponseDTO } from '@workspace/schemas';
import { Spinner } from "@workspace/ui/components/spinner";

interface DeleteBlogDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    blog: BlogResponseDTO | null;
}

export function DeleteBlogDialog({
    open,
    onOpenChange,
    blog,
}: DeleteBlogDialogProps) {
    const deleteBlog = useDeleteBlog();

    const handleDelete = async () => {
        if (!blog) return;

        try {
            await deleteBlog.mutateAsync(blog.id);
            toast.success('Đã xóa bài viết', {
                description: `Bài viết "${blog.title}" đã được xóa thành công.`,
            });
            onOpenChange(false);
        } catch (error: any) {
            toast.error('Xóa thất bại', {
                description: error.response?.data?.message || error.message,
            });
        }
    };

    if (!blog) return null;

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent size="sm">
                <AlertDialogHeader>
                    <AlertDialogMedia className="bg-destructive/10 text-destructive">
                        <AlertTriangle />
                    </AlertDialogMedia>
                    <AlertDialogTitle>Xóa bài viết</AlertDialogTitle>
                    <AlertDialogDescription>
                        Hành động này sẽ xóa vĩnh viễn bài viết <span className="font-semibold text-foreground">"{blog.title}"</span> và tất cả nội dung liên quan. Thao tác này không thể hoàn tác.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                    <AlertDialogCancel asChild>
                        <Button variant="outline" disabled={deleteBlog.isPending}>Hủy</Button>
                    </AlertDialogCancel>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={deleteBlog.isPending}
                    >
                        {deleteBlog.isPending ? (
                            <Spinner />
                        ) : (
                            "Xóa bài viết"
                        )}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
