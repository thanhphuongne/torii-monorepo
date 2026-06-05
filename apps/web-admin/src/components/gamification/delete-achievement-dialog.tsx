import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { useDeleteAchievement } from "@/lib/api/services/gamification";
import { toast } from "sonner";
import type { AchievementDTO } from "@workspace/schemas";

export function DeleteAchievementDialog({
    open,
    onOpenChange,
    achievement
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    achievement: AchievementDTO;
}) {
    const { mutate: deleteAchievement, isPending } = useDeleteAchievement();

    const handleConfirm = () => {
        deleteAchievement(achievement.id, {
            onSuccess: () => {
                toast.success(`Đã xóa thành tích: ${achievement.title}`);
                onOpenChange(false);
            },
            onError: (error) => {
                toast.error("Không thể xóa: " + error.message);
            }
        });
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Hành động này sẽ xóa vĩnh viễn thành tích <span className="font-bold">"{achievement.title}"</span>.
                        Nếu đã có người dùng đạt được, hệ thống có thể sẽ chỉ vô hiệu hóa (soft-delete) để giữ dữ liệu lịch sử.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPending}>Hủy</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            handleConfirm();
                        }}
                        disabled={isPending}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {isPending ? "Đang xóa..." : "Xác nhận xóa"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
