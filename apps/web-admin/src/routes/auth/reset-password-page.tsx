import { Button } from '@workspace/ui/components/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@workspace/ui/components/card'
import {
    Field,
    FieldGroup,
    FieldLabel,
} from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/lib/api/services/auth'
import { useLogo } from '@/hooks/useLogo'

const resetPasswordSchema = z.object({
    password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
    confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
    message: 'Mật khẩu không khớp',
    path: ['confirmPassword'],
})

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

export default function ResetPasswordPage() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const token = searchParams.get('token')
    const logo = useLogo()

    const { register, handleSubmit, formState: { errors } } = useForm<ResetPasswordFormValues>({
        resolver: zodResolver(resetPasswordSchema),
    })

    const mutation = useMutation({
        mutationFn: (data: ResetPasswordFormValues) => authApi.resetPassword({
            token: token!,
            password: data.password,
        }),
        onSuccess: () => {
            navigate('/login', { replace: true })
        },
    })

    const onSubmit = (data: ResetPasswordFormValues) => {
        mutation.mutate(data)
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
            <div className="w-full max-w-md">
                <div className="flex flex-col items-center text-center mb-6">
                    <img src={logo} alt="Torii Nihongo" className="h-24 w-auto object-contain mb-2" />
                    <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Cổng quản trị</span>
                </div>
                <Card className="w-full">
                    <CardHeader>
                        <CardTitle>Đặt lại mật khẩu</CardTitle>
                        <CardDescription>Nhập mật khẩu mới cho tài khoản của bạn.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmit)}>
                            <FieldGroup>
                                <Field>
                                    <FieldLabel htmlFor="password" className="text-sm font-semibold">Mật khẩu mới</FieldLabel>
                                    <Input
                                        id="password"
                                        type="password"
                                        {...register('password')}
                                    />
                                    {errors.password && <p className="text-red-500">{errors.password.message}</p>}
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="confirmPassword" className="text-sm font-semibold">Xác nhận mật khẩu</FieldLabel>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        {...register('confirmPassword')}
                                    />
                                    {errors.confirmPassword && <p className="text-red-500">{errors.confirmPassword.message}</p>}
                                </Field>
                                <Button type="submit" size="lg" className="w-full text-base font-semibold" disabled={mutation.isPending}>
                                    {mutation.isPending ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
                                </Button>
                            </FieldGroup>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
