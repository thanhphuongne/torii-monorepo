import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { toast } from '@workspace/ui/components/sonner';
import { ArrowLeft } from 'lucide-react';
import { apiClient } from '@/lib/api/api-client';
import type { StandardApiResponse } from '@workspace/schemas';
import { useAppDispatch } from '@/hooks/hooks';
import { setAuthenticated, setUser } from '@/store/slices/auth-slice';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Spinner } from "@workspace/ui/components/spinner";
import { useLogo } from '@/hooks/useLogo';
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
                message: 'Mã xác thực chỉ được chứa chữ số',
                path: ['code'],
            });
        }
    }
});

type VerifyCodeForm = z.infer<typeof verifyCodeSchema>;

interface LocationState {
    tempToken?: string;
    twoFactorMethod?: string;
}

export default function TwoFactorVerifyPage() {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const location = useLocation();
    const state = location.state as LocationState;

    const [isLoading, setIsLoading] = useState(false);
    const [useBackupCode, setUseBackupCode] = useState(false);

    const logo = useLogo();

    const form = useForm<VerifyCodeForm>({
        resolver: zodResolver(verifyCodeSchema),
        defaultValues: {
            code: '',
            isBackup: false,
        },
    });

    // Redirect if no temp token
    useEffect(() => {
        if (!state?.tempToken) {
            toast.error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
            navigate('/login', { replace: true });
        }
    }, [state, navigate]);

    const onSubmit = async (data: VerifyCodeForm) => {
        if (!state?.tempToken) return;

        setIsLoading(true);
        try {
            const response = await apiClient.post<StandardApiResponse<{ user: any }>>('/api/auth/login/verify-2fa', {
                tempToken: state.tempToken,
                code: data.code,
                backupCode: useBackupCode,
            });

            if (response.data.success && response.data.data?.user) {
                const user = response.data.data.user;

                // Block learner role
                if (user.role === 'learner') {
                    toast.error('Từ chối truy cập: Cổng quản trị bị hạn chế.');
                    navigate('/login', { replace: true });
                    return;
                }

                // Update Redux Store
                dispatch(setUser(user));
                dispatch(setAuthenticated({ isAuthenticated: true, user }));

                toast.success(`Chào mừng trở lại, ${user.displayName || 'Quản trị viên'}!`);
                navigate('/', { replace: true });
            } else {
                toast.error(response.data.message || 'Xác thực thất bại');
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Mã xác thực không đúng';
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleBackToLogin = () => {
        navigate('/login', { replace: true });
    };

    if (!state?.tempToken) {
        return null;
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
            <div className="w-full max-w-md">
                <div className="flex flex-col items-center text-center mb-6">
               <img src={logo} alt="Torii Nihongo" className="h-24 w-auto object-contain mb-2" />
                    <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Cổng quản trị</span>
                </div>

                <Card>
                    <CardHeader className="text-center">
                        <CardTitle>Xác thực 2 lớp</CardTitle>
                        <CardDescription>
                            {useBackupCode
                                ? 'Nhập mã dự phòng 8 ký tự của bạn'
                                : 'Nhập mã 6 chữ số từ ứng dụng xác thực'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <Controller
                                name="code"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <div className="space-y-2 text-center">
                                        <Label htmlFor={field.name} className="sr-only">Mã OTP</Label>
                                        <Input
                                            {...field}
                                            id={field.name}
                                            placeholder={useBackupCode ? "XXXXXXXX" : "000000"}
                                            maxLength={useBackupCode ? 8 : 6}
                                            className="text-center text-2xl tracking-[0.5em] font-mono"
                                            autoComplete="off"
                                            autoFocus
                                        />
                                        {fieldState.error && <p className="text-sm text-destructive">{fieldState.error?.message}</p>}
                                    </div>
                                )}
                            />

                            <Button type="submit" size="lg" className="w-full text-base font-semibold" disabled={isLoading}>
                                {isLoading && <Spinner className="mr-2" />}
                                Xác thực
                            </Button>

                            <div className="text-center">
                                <Button
                                    type="button"
                                    variant="link"
                                    onClick={() => {
                                        const nextState = !useBackupCode;
                                        setUseBackupCode(nextState);
                                        form.reset({ code: '', isBackup: nextState });
                                    }}
                                    className="text-sm"
                                >
                                    {useBackupCode ? 'Sử dụng ứng dụng xác thực' : 'Sử dụng mã dự phòng'}
                                </Button>
                            </div>
                        </form>

                        <div className="mt-4 text-center">
                            <Button
                                variant="link"
                                onClick={handleBackToLogin}
                                className="text-sm text-muted-foreground"
                            >
                                <ArrowLeft className="mr-2 size-4" />
                                Quay lại đăng nhập
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
