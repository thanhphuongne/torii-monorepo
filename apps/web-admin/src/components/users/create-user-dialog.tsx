import { useForm, Controller } from 'react-hook-form';
import { useStep } from "@workspace/ui/hooks/use-step";
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import {
    Field,
    FieldError,
    FieldLabel,
} from '@workspace/ui/components/field';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import {
    GraduationCap,
    Users,
    BookOpen,
    ChevronRight,
    ShieldCheck,
    BadgeCheck,
    Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { useCreateInternalUser } from "@/lib/api/services/users.ts";
import { useState, useEffect, useMemo } from 'react';
import { cn } from '@workspace/ui/lib/utils';
import { Spinner } from "@workspace/ui/components/spinner";
import { useRoles } from "@/lib/api/services/permissions";

const formSchema = z.object({
    displayName: z.string().min(1, 'Họ và tên là bắt buộc'),
    email: z.string().email('Email không hợp lệ'),
    role: z.string().min(1, 'Vai trò là bắt buộc'),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateUserDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    fixedRole?: string;
}

export function CreateUserDialog({
    open,
    onOpenChange,
    fixedRole,
}: CreateUserDialogProps) {
    // const isLecturerOnly = false;
    // const isStaffOnly = false;

    // We always want 2 steps: 
    // Step 1: Details
    // Step 2: Role Selection (Lecturer or Staff types)
    const totalSteps = 2;

    const [currentStep, { goToNextStep, goToPrevStep, reset }] = useStep(totalSteps);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        mode: 'onChange',
        defaultValues: {
            displayName: '',
            email: '',
            role: fixedRole || '',
        },
    });

    const createInternalUser = useCreateInternalUser();
    const rolesQuery = useRoles();

    /** useMemo: tránh mảng mới mỗi render → useEffect phụ thuộc roleOptions gây vòng lặp vô hạn (React #185). */
    const roleOptions = useMemo(
        () =>
            (rolesQuery.data || [])
                .filter((r) => r.code !== 'learner')
                .map((r) => {
                    const icon =
                        r.code === 'lecturer'
                            ? GraduationCap
                            : r.code === 'staff-academic'
                              ? BookOpen
                              : r.code === 'staff-operations'
                                ? Users
                                : ShieldCheck;
                    return {
                        id: r.code,
                        label: r.name,
                        icon,
                        description: r.description?.trim() || r.code,
                    };
                }),
        [rolesQuery.data],
    );

    // Chỉ reset khi mở dialog — không phụ thuộc roleOptions (tránh reset lại khi API roles về sau, xóa mất tên/email đang gõ).
    useEffect(() => {
        if (!open) return;
        reset();
        form.reset({
            displayName: '',
            email: '',
            role: fixedRole || '',
        });
    }, [open, fixedRole, reset, form]);

    // Gán vai trò mặc định khi danh sách role đã có và chưa chọn (không ghi đè fixedRole).
    useEffect(() => {
        if (!open || fixedRole) return;
        const first = roleOptions[0]?.id;
        if (!first) return;
        const current = form.getValues('role');
        if (!current) {
            form.setValue('role', first, { shouldValidate: true });
        }
    }, [open, fixedRole, roleOptions, form]);

    const [showConfirm, setShowConfirm] = useState(false);

    const onSubmit = async (data: FormValues) => {
        try {
            await createInternalUser.mutateAsync(data);
            toast.success('Thành công', {
                description: `Tài khoản ${data.displayName} đã được tạo thành công.`,
            });
            form.reset();
            reset();
            setShowConfirm(false);
            onOpenChange(false);
        } catch (error: unknown) {
            const errorMessage =
                (error as any)?.userMessage ||
                (error instanceof Error ? error.message : 'Lỗi khi tạo người dùng');
            toast.error('Thất bại', {
                description: errorMessage,
            });
        }
    };

    const handlePreSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const valid = await form.trigger();
        if (valid) {
            setShowConfirm(true);
        }
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            form.reset();
            reset();
        }
        onOpenChange(newOpen);
    };

    const handleNextToRole = async () => {
        const valid = await form.trigger(['displayName', 'email']);
        if (valid) {
            goToNextStep();
        }
    };

    const handleBackToDetails = () => {
        goToPrevStep();
    };

    const handleRoleSelect = (roleId: string) => {
        form.setValue('role', roleId as FormValues['role'], { shouldValidate: true });
    };

    const currentRole = form.watch('role');
    const displayName = form.watch('displayName');
    const email = form.watch('email');
    const detailsValid = !!displayName && !!email;

    const dialogTitle = 'Thêm Người Dùng Mới';

    return (
        <>
            <Dialog open={open && !showConfirm} onOpenChange={handleOpenChange}>
                <DialogContent className="sm:max-w-[600px]">
                    <form onSubmit={handlePreSubmit}>
                        <DialogHeader>
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-primary text-primary-foreground">
                                    <Users className="size-5" />
                                </div>
                                <DialogTitle>{dialogTitle}</DialogTitle>
                            </div>
                            <DialogDescription>
                                {currentStep === 1
                                    ? 'Bước 1: Nhập thông tin cá nhân'
                                    : 'Bước 2: Chọn vai trò'}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex gap-2 mb-4">
                            {[1, 2].map((step) => (
                                <div
                                    key={step}
                                    className={cn(
                                        "h-2 flex-1 rounded-full",
                                        currentStep >= step ? "bg-primary" : "bg-muted"
                                    )}
                                />
                            ))}
                        </div>

                        <div className="space-y-4">
                            {currentStep === 1 ? (
                                <div className="space-y-4">
                                    <Controller
                                        name="displayName"
                                        control={form.control}
                                        render={({ field, fieldState }) => (
                                            <Field data-invalid={fieldState.invalid}>
                                                <FieldLabel htmlFor={field.name}>
                                                    Họ và tên
                                                </FieldLabel>
                                                <Input
                                                    {...field}
                                                    id={field.name}
                                                    autoFocus
                                                    placeholder="Nguyễn Văn A"
                                                />
                                                <FieldError errors={[fieldState.error]} />
                                            </Field>
                                        )}
                                    />

                                    <Controller
                                        name="email"
                                        control={form.control}
                                        render={({ field, fieldState }) => (
                                            <Field data-invalid={fieldState.invalid}>
                                                <FieldLabel htmlFor={field.name}>
                                                    Email
                                                </FieldLabel>
                                                <Input
                                                    {...field}
                                                    id={field.name}
                                                    type="email"
                                                    placeholder="name@torii.edu.vn"
                                                />
                                                <FieldError errors={[fieldState.error]} />
                                            </Field>
                                        )}
                                    />

                                    <div className="p-4 rounded-lg border bg-muted/50">
                                        <div className="flex gap-3">
                                            <Lock className="size-4 text-muted-foreground mt-0.5" />
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium">Bảo mật</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Hệ thống sẽ gửi email kích hoạt. Người dùng cần xác nhận để thiết lập mật khẩu.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        {roleOptions.map((role) => {
                                            const Icon = role.icon;
                                            const isSelected = currentRole === role.id;

                                            return (
                                                <div
                                                    key={role.id}
                                                    onClick={() => handleRoleSelect(role.id)}
                                                    className={cn(
                                                        "cursor-pointer rounded-lg border p-4",
                                                        isSelected
                                                            ? "border-primary bg-primary/5"
                                                            : "hover:border-primary/50"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className={cn(
                                                                "p-2 rounded-md",
                                                                isSelected
                                                                    ? "bg-primary text-primary-foreground"
                                                                    : "bg-muted"
                                                            )}
                                                        >
                                                            <Icon className="size-5" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between">
                                                                <span className="font-medium">{role.label}</span>
                                                                {isSelected && (
                                                                    <BadgeCheck className="size-4 text-primary" />
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-muted-foreground">
                                                                {role.description}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        <DialogFooter className="mt-6">
                            {currentStep === 1 ? (
                                <>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleOpenChange(false)}
                                        disabled={createInternalUser.isPending}
                                    >
                                        Hủy
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleNextToRole();
                                        }}
                                        disabled={!detailsValid || createInternalUser.isPending}
                                    >
                                        Tiếp theo
                                        <ChevronRight className="ml-2 size-4" />
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleBackToDetails}
                                        disabled={createInternalUser.isPending}
                                    >
                                        Quay lại
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={createInternalUser.isPending}
                                    >
                                        {createInternalUser.isPending ? (
                                            <>
                                                <Spinner className="mr-2 size-4" />
                                                Đang tạo...
                                            </>
                                        ) : (
                                            <>
                                                <BadgeCheck className="mr-2 size-4" />
                                                Xác nhận
                                            </>
                                        )}
                                    </Button>
                                </>
                            )}
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="size-5 text-primary" />
                            <AlertDialogTitle>Xác nhận tạo tài khoản</AlertDialogTitle>
                        </div>
                        <AlertDialogDescription>
                            Bạn đang tạo tài khoản <strong>{form.getValues('role')}</strong> cho{' '}
                            <strong>{form.getValues('displayName')}</strong>.
                            <br /><br />
                            Email kích hoạt sẽ được gửi đến <strong>{form.getValues('email')}</strong>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={createInternalUser.isPending}>
                            Hủy
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                form.handleSubmit(onSubmit)();
                            }}
                            disabled={createInternalUser.isPending}
                        >
                            {createInternalUser.isPending ? (
                                <>
                                    <Spinner className="mr-2 size-4" />
                                    Đang xử lý...
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
