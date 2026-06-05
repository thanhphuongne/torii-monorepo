import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
} from '@workspace/ui/components/dialog';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import {
    Field,
    FieldGroup,
    FieldLabel,
    FieldError,
} from '@workspace/ui/components/field';
import { toast } from '@workspace/ui/components/sonner';
import { AlertTriangle, Lock } from 'lucide-react';
import { useDisableTotp } from '@/lib/api/services/two-factor-auth';
import { Spinner } from "@workspace/ui/components/spinner";

const disableSchema = z.object({
    password: z.string().min(1, 'Password is required'),
});

type DisableForm = z.infer<typeof disableSchema>;

interface DisableTwoFactorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function DisableTwoFactorDialog({ open, onOpenChange }: DisableTwoFactorDialogProps) {
    const disableMutation = useDisableTotp();

    const form = useForm<DisableForm>({
        resolver: zodResolver(disableSchema),
        defaultValues: { password: '' },
    });

    const onSubmit = async (data: DisableForm) => {
        try {
            await disableMutation.mutateAsync({ password: data.password });
            toast.success('Two-factor authentication has been disabled');
            onOpenChange(false);
            form.reset();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to disable 2FA');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <AlertTriangle className="size-5 text-rose-600 dark:text-rose-400" />
                        Tắt Xác Thực Hai Yếu Tố
                    </DialogTitle>
                    <DialogDescription>
                        Điều này sẽ làm cho tài khoản của bạn kém an toàn hơn
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <FieldGroup className="space-y-6">
                        {/* Warning */}
                        <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-4">
                            <div className="flex gap-3">
                                <AlertTriangle className="size-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-foreground">
                                        Bạn có chắc chắn không?
                                    </p>
                                    <p className="text-xs text-muted-foreground/60 leading-relaxed">
                                        Tắt xác thực hai yếu tố sẽ làm cho tài khoản của bạn dễ bị truy cập trái phép hơn. Chúng tôi khuyên bạn nên duy trì nó.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Password Field */}
                        <Controller
                            name="password"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid} className="space-y-2">
                                    <FieldLabel htmlFor={field.name} className="text-sm font-medium">
                                        Xác nhận mật khẩu của bạn
                                    </FieldLabel>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40" />
                                        <Input
                                            {...field}
                                            id={field.name}
                                            type="password"
                                            placeholder="Nhập mật khẩu của bạn"
                                            className="pl-10"
                                            autoComplete="current-password"
                                        />
                                    </div>
                                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                </Field>
                            )}
                        />
                    </FieldGroup>

                    <DialogFooter className="mt-6">
                        <DialogClose asChild>
                            <Button
                                type="button"
                                variant="outline"
                            >
                                Hủy
                            </Button>
                        </DialogClose>
                        <Button
                            type="submit"
                            disabled={disableMutation.isPending}
                            className="bg-rose-600 hover:bg-rose-700 text-white border-rose-600"
                        >
                            {disableMutation.isPending ? (
                                <>
                                    <Spinner />
                                    Đang tắt...
                                </>
                            ) : (
                                'Tắt 2FA'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
