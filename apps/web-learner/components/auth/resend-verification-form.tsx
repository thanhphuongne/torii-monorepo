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
import { useResendVerification } from '@/lib/api/services/auth-api'
import { Spinner } from '@workspace/ui/components/spinner'
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert'

const resendSchema = z.object({
    email: z.string().email('Email không hợp lệ'),
})

type ResendFormData = z.infer<typeof resendSchema>

export function ResendVerificationForm() {
    const { mutateAsync: resendVerification, isPending: isLoading } = useResendVerification()
    const [emailSent, setEmailSent] = useState(false)

    const form = useForm<ResendFormData>({
        resolver: zodResolver(resendSchema),
        defaultValues: { email: '' },
    })

    const onSubmit = async (data: ResendFormData) => {
        try {
            const res = await resendVerification(data.email)
            if (res.success) {
                setEmailSent(true)
                toast.success('Mã xác thực đã được gửi lại', {
                    description: 'Vui lòng kiểm tra hộp thư của bạn.',
                })
            } else {
                toast.error('Gửi lại thất bại', { description: res.message || 'Vui lòng thử lại sau' })
            }
        } catch (error: any) {
            toast.error('Đã có lỗi xảy ra', {
                description: error.response?.data?.message || 'Vui lòng thử lại sau',
            })
        }
    }

    if (emailSent) {
        return (
            <Alert className="bg-primary/5 border-primary/20 py-6">
                <CheckCircle2 className="size-5 text-primary" />
                <AlertTitle className="text-base font-bold">Mã xác thực đã gửi lại</AlertTitle>
                <AlertDescription className="text-sm">
                    Mã xác thực mới đã được gửi tới email của bạn. Vui lòng kiểm tra hộp thư (bao gồm cả thư rác).
                </AlertDescription>
            </Alert>
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
                    Gửi lại mã xác thực
                </Button>
            </form>
        </div>
    )
}
