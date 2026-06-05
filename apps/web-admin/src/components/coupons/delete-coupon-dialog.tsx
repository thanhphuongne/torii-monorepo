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
import { useDeleteCoupon } from "@/lib/api/services/coupons";
import { type CouponResponseDTO } from '@workspace/schemas';
import { Spinner } from "@workspace/ui/components/spinner";

interface DeleteCouponDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    coupon: CouponResponseDTO;
}

export function DeleteCouponDialog({ open, onOpenChange, coupon }: DeleteCouponDialogProps) {
    const deleteMutation = useDeleteCoupon();

    const handleDelete = async () => {
        try {
            await deleteMutation.mutateAsync(coupon.id);
            toast.success('Đã xóa coupon', {
                description: `Mã ${coupon.code} đã được xóa thành công.`,
            });
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Xóa thất bại', {
                description: 'Đã xảy ra lỗi khi xóa coupon. Vui lòng thử lại.',
            });
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent size="sm">
                <AlertDialogHeader>
                    <AlertDialogMedia className="bg-destructive/10 text-destructive">
                        <AlertTriangle />
                    </AlertDialogMedia>
                    <AlertDialogTitle>Xóa coupon</AlertDialogTitle>
                    <AlertDialogDescription>
                        Hành động này sẽ xóa vĩnh viễn mã giảm giá <span className="font-semibold text-foreground font-mono">{coupon.code}</span>. Thao tác này không thể hoàn tác nếu coupon chưa được sử dụng.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                    <AlertDialogCancel asChild>
                        <Button variant="outline" disabled={deleteMutation.isPending}>Hủy</Button>
                    </AlertDialogCancel>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={deleteMutation.isPending}
                    >
                        {deleteMutation.isPending ? (
                            <Spinner />
                        ) : (
                            "Xóa coupon"
                        )}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
