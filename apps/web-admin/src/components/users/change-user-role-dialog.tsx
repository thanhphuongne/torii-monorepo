import { useState, useEffect, useMemo } from 'react';
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
import type { UserResponseDTO } from '@workspace/schemas';
import { toast } from 'sonner';
import { useUpdateUser } from "@/lib/api/services/users.ts";
import { Spinner } from "@workspace/ui/components/spinner";
import { useRoles } from "@/lib/api/services/permissions";

interface ChangeUserRoleDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: UserResponseDTO | null;
}

export function ChangeUserRoleDialog({
    open,
    onOpenChange,
    user,
}: ChangeUserRoleDialogProps) {
    const updateUser = useUpdateUser();
    const rolesQuery = useRoles();
    const [selectedRole, setSelectedRole] = useState<string>("");
    const [showConfirm, setShowConfirm] = useState(false);

    /** Đồng bộ API roles động; nếu user đang có mã role chưa có trong bảng (race / role cũ), vẫn hiển thị được trong Select. */
    const roleSelectOptions = useMemo(() => {
        const list = rolesQuery.data || [];
        if (!user?.role) return list;
        const codes = new Set(list.map((r) => r.code));
        if (!codes.has(user.role as string)) {
            return [
                {
                    code: user.role as string,
                    name: `${String(user.role)} (đang gán)`,
                    description: null as string | null,
                },
                ...list,
            ];
        }
        return list;
    }, [rolesQuery.data, user?.role]);

    useEffect(() => {
        if (user) {
            setSelectedRole(user.role as string);
        }
    }, [user, open]);

    if (!user) return null;

    const handleUpdateClick = () => {
        if (selectedRole === user.role) {
            onOpenChange(false);
            return;
        }
        setShowConfirm(true);
    };

    const handleConfirmUpdate = async () => {
        try {
            await updateUser.mutateAsync({
                id: user.id,
                user: {
                    role: selectedRole,
                },
            });
            toast.success('Đã cập nhật vai trò', {
                description: `Vai trò của người dùng đã được thay đổi thành công.`,
            });
            setShowConfirm(false);
            onOpenChange(false);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Không thể cập nhật vai trò';
            toast.error('Cập nhật thất bại', {
                description: errorMessage,
            });
        }
    };

    return (
        <>
            <Dialog open={open && !showConfirm} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Thay đổi vai trò</DialogTitle>
                        <DialogDescription>
                            Điều chỉnh quyền hạn truy cập cho <strong>{user.displayName}</strong> ({user.email}).
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <Field className="space-y-2">
                            <FieldLabel>Vai trò mới</FieldLabel>
                            <Select
                                value={selectedRole}
                                onValueChange={(value) => setSelectedRole(value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn vai trò" />
                                </SelectTrigger>
                                <SelectContent>
                                    {roleSelectOptions.map((r) => (
                                        <SelectItem key={r.code} value={r.code}>
                                            {r.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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
                        <AlertDialogTitle>Xác nhận thay đổi?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Hành động này sẽ thay đổi quyền hạn của người dùng từ
                            <span className="font-medium text-foreground mx-1">{user.role}</span>
                            sang
                            <span className="font-medium text-primary mx-1">{selectedRole}</span>.
                            Người dùng có thể cần đăng nhập lại để cập nhật quyền mới.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={updateUser.isPending}>Quay lại</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleConfirmUpdate();
                            }}
                            disabled={updateUser.isPending}
                        >
                            {updateUser.isPending ? (
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
