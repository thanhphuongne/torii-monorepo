'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Field, FieldLabel, FieldError } from '@workspace/ui/components/field'
import { toast } from '@workspace/ui/components/sonner'
import { CheckCircle2 } from 'lucide-react'
import { useForgotPassword } from '@/lib/api/services/auth-api'
import { Spinner } from '@workspace/ui/components/spinner'
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert'

const forgotPasswordSchema = z.object({
    email: z.string().email('Email không hợp lệ'),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export function ForgotPasswordForm() {
    const { mutateAsync: forgotPassword, isPending: isLoading } = useForgotPassword()
    const [emailSent, setEmailSent] = useState(false)

    const form = useForm<ForgotPasswordFormData>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: { email: '' },
    })

    const onSubmit = async (data: ForgotPasswordFormData) => {
        try {
            const res = await forgotPassword(data.email)
            if (res.success) {
                setEmailSent(true)
                toast.success('Email đã được gửi', {
                    description: 'Vui lòng kiểm tra hộp thư để đặt lại mật khẩu',
                })
            } else {
                toast.error('Gửi email thất bại', { description: res.message || 'Vui lòng thử lại sau' })
            }
        } catch (error: any) {
            toast.error('Đã có lỗi xảy ra', {
                description: error.response?.data?.message || 'Vui lòng thử lại sau',
            })
        }
    }

    if (emailSent) {
        return (
            <div className="space-y-6">
                <Alert className="bg-primary/5 border-primary/20 py-6">
                    <CheckCircle2 className="size-5 text-primary" />
                    <AlertTitle className="text-base font-bold">Email đã được gửi</AlertTitle>
                    <AlertDescription className="text-sm">
                        Link đặt lại mật khẩu đã gửi tới <span className="font-bold text-foreground">{form.getValues('email')}</span>. Vui lòng kiểm tra hộp thư của bạn.
                    </AlertDescription>
                </Alert>

                <div className="space-y-4">
                    <Button
                        onClick={() => setEmailSent(false)}
                        variant="outline"
                        size="lg"
                        className="w-full font-semibold"
                    >
                        Gửi lại hoặc thử email khác
                    </Button>
                    <p className="text-xs text-muted-foreground text-center leading-relaxed">
                        Link đặt lại mật khẩu sẽ hết hạn sau <span className="font-bold">60 phút</span>. Một khi hết hạn, bạn sẽ cần yêu cầu link mới.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <Controller
                    control={form.control}
                    name="email"
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor={field.name} className="text-sm font-semibold">Email</FieldLabel>
                            <Input
                                {...field}
                                id={field.name}
                                type="email"
                                placeholder="Nhập email của bạn"
                                autoComplete="email"
                            />
                            <FieldError errors={[fieldState.error]} />
                        </Field>
                    )}
                />

                <Button type="submit" size="lg" className="w-full text-base font-semibold" disabled={isLoading}>
                    {isLoading && <Spinner className="mr-2" />}
                    Gửi link khôi phục
                </Button>
            </form>
        </div>
    )
}
