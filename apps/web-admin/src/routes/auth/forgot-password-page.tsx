import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { toast } from '@workspace/ui/components/sonner';
import { CheckCircle2, ArrowLeft } from 'lucide-react';
import { authApi } from '@/lib/api/services/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Spinner } from "@workspace/ui/components/spinner";
import { useLogo } from '@/hooks/useLogo';

const forgotPasswordSchema = z.object({
    email: z.string().email('Email không hợp lệ'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const logo = useLogo();

    const form = useForm<ForgotPasswordFormData>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: {
            email: '',
        },
    });

    const onSubmit = async (data: ForgotPasswordFormData) => {
        setIsLoading(true);
        try {
            await authApi.forgotPassword(data.email);
            setEmailSent(true);
            toast.success('Email đã được gửi', {
                description: 'Vui lòng kiểm tra hộp thư của bạn để đặt lại mật khẩu',
            });
        } catch (error: any) {
            console.error('Forgot password error:', error);
            toast.error('Gửi email thất bại', {
                description: error.response?.data?.message || 'Vui lòng thử lại sau',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
            <div className="w-full max-w-md">
                <div className="flex flex-col items-center text-center mb-6">
                    <img src={logo} alt="Torii Nihongo" className="h-24 w-auto object-contain mb-2" />
                    <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Cổng quản trị</span>
                </div>

                <Card>
                    <CardHeader className="text-center">
                        <CardTitle>Quên mật khẩu</CardTitle>
                        <CardDescription>
                            Nhập email của bạn để nhận liên kết khôi phục.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {emailSent ? (
                            <div className="flex flex-col items-center text-center space-y-4">
                                <CheckCircle2 className="size-12 text-green-500" />
                                <p className="text-sm text-muted-foreground">
                                    Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu đến <strong>{form.getValues('email')}</strong>. Vui lòng kiểm tra hộp thư.
                                </p>
                                <Button
                                    onClick={() => setEmailSent(false)}
                                    variant="outline"
                                    size="lg"
                                    className="w-full h-10 font-semibold"
                                >
                                    Thử lại với email khác
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <Controller
                                    control={form.control}
                                    name="email"
                                    render={({ field, fieldState }) => (
                                        <div className="space-y-2">
                                            <Label htmlFor={field.name} className="text-sm font-semibold">Email</Label>
                                            <Input
                                                {...field}
                                                id={field.name}
                                                placeholder="Nhập email của bạn"
                                                type="email"
                                                autoComplete="email"
                                            />
                                            {fieldState.error && <p className="text-sm text-destructive">{fieldState.error?.message}</p>}
                                        </div>
                                    )}
                                />
                                <Button type="submit" size="lg" className="w-full text-base font-semibold" disabled={isLoading}>
                                    {isLoading && <Spinner className="mr-2" />}
                                    Gửi liên kết
                                </Button>
                            </form>
                        )}
                        <div className="mt-4 text-center">
                            <Button
                                variant="link"
                                onClick={() => navigate('/login')}
                                className="text-sm"
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
