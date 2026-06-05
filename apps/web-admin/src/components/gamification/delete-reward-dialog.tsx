import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { useDeleteReward } from "@/lib/api/services/gamification"
import { toast } from "sonner"
import type { PointRewardDTO } from "@workspace/schemas"

interface DeleteRewardDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    reward: PointRewardDTO
}

export function DeleteRewardDialog({ open, onOpenChange, reward }: DeleteRewardDialogProps) {
    const deleteMutation = useDeleteReward()

    const handleDelete = async () => {
        try {
            await deleteMutation.mutateAsync(reward.id)
            toast.success("Đã xóa mẫu phần thưởng")
            onOpenChange(false)
        } catch (error: any) {
            toast.error(error.message || "Không thể xóa phần thưởng")
        }
    }

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Hành động này sẽ xóa mẫu phần thưởng <span className="font-bold text-foreground">"{reward.name}"</span>.
                        Người dùng sẽ không thể nhìn thấy hoặc quy đổi phần thưởng này nữa.
                        Các mã giảm giá đã được quy đổi trước đó vẫn sẽ tiếp tục có hiệu lực.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleteMutation.isPending}>Hủy</AlertDialogCancel>
                    <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={(e) => {
                            e.preventDefault()
                            handleDelete()
                        }}
                        disabled={deleteMutation.isPending}
                    >
                        {deleteMutation.isPending ? "Đang xóa..." : "Xác nhận xóa"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
