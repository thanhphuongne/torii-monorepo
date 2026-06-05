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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select';
import {
    Field,
    FieldLabel,
} from '@workspace/ui/components/field';
import { Input } from '@workspace/ui/components/input';
import type { UserResponseDTO } from '@workspace/schemas';
import { toast } from 'sonner';
import { useChangeUserStatus } from "@/lib/api/services/users.ts";
import { Spinner } from "@workspace/ui/components/spinner";

interface ChangeUserStatusDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: UserResponseDTO | null;
}

type UserStatus = 'active' | 'banned' | 'deleted';

export function ChangeUserStatusDialog({
    open,
    onOpenChange,
    user,
}: ChangeUserStatusDialogProps) {
    const changeStatus = useChangeUserStatus();
    const [status, setStatus] = useState<UserStatus>('active');
    const [bannedUntil, setBannedUntil] = useState<string>('');
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        if (user) {
            if (user.deletedAt) {
                setStatus('deleted');
            } else if (user.bannedUntil) {
                setStatus('banned');
                const date = new Date(user.bannedUntil);
                setBannedUntil(date.toISOString().split('T')[0]);
            } else {
                setStatus('active');
                setBannedUntil('');
            }
        }
    }, [user, open]);

    if (!user) return null;

    const handleUpdateClick = () => {
        setShowConfirm(true);
    };

    const handleConfirmUpdate = async () => {
        try {
            await changeStatus.mutateAsync({
                id: user.id,
                dto: {
                    status,
                    bannedUntil: status === 'banned' && bannedUntil ? new Date(bannedUntil).toISOString() : null,
                },
            });
            toast.success('Đã cập nhật trạng thái', {
                description: `Trạng thái của người dùng đã được thay đổi thành ${status}.`,
            });
            setShowConfirm(false);
            onOpenChange(false);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Không thể cập nhật trạng thái';
            toast.error('Cập nhật thất bại', {
                description: errorMessage,
            });
        }
    };

    const getStatusLabel = (s: UserStatus) => {
        switch (s) {
            case 'active': return 'Hoạt động';
            case 'banned': return 'Khóa tài khoản';
            case 'deleted': return 'Đã xóa (Soft delete)';
            default: return s;
        }
    };

    return (
        <>
            <Dialog open={open && !showConfirm} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Thay đổi trạng thái</DialogTitle>
                        <DialogDescription>
                            Cập nhật tình trạng hoạt động cho <strong>{user.displayName}</strong>.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        <Field className="space-y-2">
                            <FieldLabel>Trạng thái mới</FieldLabel>
                            <Select
                                value={status}
                                onValueChange={(value) => setStatus(value as UserStatus)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn trạng thái" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Hoạt động</SelectItem>
                                    <SelectItem value="banned">Khóa tài khoản</SelectItem>
                                    <SelectItem value="deleted">Xóa tài khoản</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>

                        {status === 'banned' && (
                            <Field className="space-y-2">
                                <FieldLabel>Khóa đến ngày</FieldLabel>
                                <Input
                                    type="date"
                                    value={bannedUntil}
                                    onChange={(e) => setBannedUntil(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                />
                                <p className="text-[10px] text-muted-foreground italic">
                                    Để trống nếu muốn khóa vĩnh viễn.
                                </p>
                            </Field>
                        )}
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
                        <AlertDialogTitle>Xác nhận thay đổi?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn sắp thay đổi trạng thái của người dùng sang
                            <strong className="mx-1 text-primary">{getStatusLabel(status)}</strong>.
                            {status === 'banned' && bannedUntil && (
                                <> Tài khoản sẽ bị khóa đến hết ngày <strong>{bannedUntil}</strong>.</>
                            )}
                            {status === 'deleted' && (
                                <> Người dùng sẽ không thể đăng nhập và dữ liệu sẽ bị ẩn khỏi hệ thống.</>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={changeStatus.isPending}>Quay lại</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleConfirmUpdate();
                            }}
                            disabled={changeStatus.isPending}
                        >
                            {changeStatus.isPending ? (
                                <>
                                    <Spinner className="mr-2 h-4 w-4" />
                                    Đang lưu...
                                </>
                            ) : (
                                "Xác nhận thay đổi"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
