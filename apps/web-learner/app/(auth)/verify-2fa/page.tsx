'use client'

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@workspace/ui/components/button';
import { Field, FieldLabel } from '@workspace/ui/components/field';
import { Spinner } from '@workspace/ui/components/spinner';
import { toast } from '@workspace/ui/components/sonner';
import { Smartphone, ArrowLeft, Key } from 'lucide-react';
import { authApi } from '@/lib/api/services/auth-api';
import { useAppDispatch } from '@/hooks/hooks';
import { checkAuth } from '@/store/slices/authSlice';
import { Input } from '@workspace/ui/components/input';
import { AuthLayout } from '@/components/auth/auth-layout';

const verifyCodeSchema = z.object({
    code: z.string().min(1, 'Vui lòng nhập mã xác thực'),
    isBackup: z.boolean(),
}).superRefine((data, ctx) => {
    if (data.isBackup) {
        if (data.code.length !== 8) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Mã dự phòng phải có 8 ký tự',
                path: ['code'],
            });
        }
    } else {
        if (data.code.length !== 6) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Mã xác thực phải có 6 chữ số',
                path: ['code'],
            });
        } else if (!/^\d+$/.test(data.code)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Mã xác thực chỉ được chứa số',
                path: ['code'],
            });
        }
    }
});

type VerifyCodeForm = z.infer<typeof verifyCodeSchema>;

export default function TwoFactorVerifyPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const dispatch = useAppDispatch();

    const [isLoading, setIsLoading] = useState(false);
    const [useBackupCode, setUseBackupCode] = useState(false);
    const [tempToken, setTempToken] = useState<string | null>(null);

    useEffect(() => {
        // Get tempToken from URL params or sessionStorage (in case of navigation)
        const token = searchParams.get('token') || sessionStorage.getItem('2fa_tempToken');
        if (!token) {
            toast.error('Phiên xác thực không hợp lệ. Vui lòng đăng nhập lại.');
            router.push('/login');
            return;
        }
        setTempToken(token);
        sessionStorage.setItem('2fa_tempToken', token);
    }, [searchParams, router]);

    const form = useForm<VerifyCodeForm>({
        resolver: zodResolver(verifyCodeSchema),
        defaultValues: {
            code: '',
            isBackup: false,
        },
    });

    const onSubmit = async (data: VerifyCodeForm) => {
        if (!tempToken) return;

        setIsLoading(true);
        try {
            const { user } = await authApi.verify2FA({
                tempToken,
                code: data.code,
                backupCode: useBackupCode,
            });

            if (user) {

                // Update Redux Store
                const authAction = await dispatch(checkAuth());

                // Clear temp token
                sessionStorage.removeItem('2fa_tempToken');

                toast.success(`Chào mừng quay trở lại, ${user.displayName || 'Người dùng'}!`);

                // Get redirect URL from 'from' param or default to dashboard
                const redirectTo = searchParams.get('from') || '/dashboard';
                router.push(redirectTo);
                router.refresh();
            } else {
                toast.error('Xác thực thất bại');
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Mã xác thực không hợp lệ';
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleBackToLogin = () => {
        sessionStorage.removeItem('2fa_tempToken');
        router.push('/login');
    };

    if (!tempToken) {
        return null;
    }

    return (
        <AuthLayout
            title="Xác thực 2FA"
            description={useBackupCode
                ? 'Nhập một trong các mã dự phòng của bạn'
                : 'Nhập mã 6 chữ số từ ứng dụng xác thực'
            }
            leftPanel={
                <div className="space-y-8">
                    <div className="space-y-3">
                        <h2 className="text-4xl font-bold tracking-normal leading-tight">
                            Bảo mật <br />
                            <span className="text-primary">Hai lớp.</span>
                        </h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Tài khoản của bạn được bảo vệ bằng xác thực hai lớp. Nhập mã từ ứng dụng xác thực để tiếp tục.
                        </p>
                    </div>
                </div>
            }
        >
            <div className="space-y-6">
                {/* Back Button */}
                <button
                    onClick={handleBackToLogin}
                    className="flex items-center gap-2 text-sm text-muted-foreground/60 hover:text-foreground transition-colors group mb-4"
                >
                    <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
                    Quay về đăng nhập
                </button>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
                    <div className="space-y-5">
                        <Controller
                            name="code"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <Field className="space-y-2">
                                    <FieldLabel htmlFor={field.name} className="flex items-center gap-2 text-xs font-medium text-foreground ml-1">
                                        {useBackupCode ? 'Mã dự phòng' : 'Mã xác thực'}
                                    </FieldLabel>
                                    <div className="relative group">
                                        {useBackupCode ? (
                                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                                        ) : (
                                            <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                                        )}
                                        <Input
                                            {...field}
                                            id={field.name}
                                            placeholder={useBackupCode ? "XXXXXXXX" : "000000"}
                                            maxLength={useBackupCode ? 8 : 6}
                                            className="pl-11 text-center text-2xl font-mono tracking-[0.3em] rounded-2xl border-border/40 bg-muted/20 hover:bg-muted/30 focus:border-primary/40 transition-all placeholder:text-muted-foreground/20 shadow-sm"
                                            autoComplete="off"
                                            autoFocus
                                        />
                                        {fieldState.invalid && <p className="text-[10px] font-medium text-rose-500 mt-1.5 ml-1">{fieldState.error?.message}</p>}
                                    </div>
                                </Field>
                            )}
                        />
                    </div>

                    {/* Toggle Backup Code */}
                    <div className="text-center">
                        <button
                            type="button"
                            onClick={() => {
                                const nextState = !useBackupCode;
                                setUseBackupCode(nextState);
                                form.reset({
                                    code: '',
                                    isBackup: nextState,
                                });
                            }}
                            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                        >
                            {useBackupCode ? 'Sử dụng mã xác thực thay thế' : 'Sử dụng mã dự phòng thay thế'}
                        </button>
                    </div>

                    <Button
                        type="submit"
                        size="lg"
                        className="w-full font-medium text-sm shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 active:scale-95 transition-all duration-300"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Spinner className="mr-2 size-4 opacity-70" />
                                Đang xác thực...
                            </>
                        ) : (
                            'Xác thực và tiếp tục'
                        )}
                    </Button>
                </form>
            </div>
        </AuthLayout>
    );
}
