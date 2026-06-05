'use client'

import { useState, useEffect, Suspense } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Field, FieldLabel, FieldError, FieldGroup } from '@workspace/ui/components/field'
import { toast } from '@workspace/ui/components/sonner'
import { Spinner } from '@workspace/ui/components/spinner'
import { Lock, Eye, EyeOff, ShieldAlert } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useResetPassword, useVerifyResetToken } from '@/lib/api/services/auth-api'
import Link from 'next/link'
import { cn } from '@workspace/ui/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert'

const resetPasswordSchema = z
    .object({
        password: z
            .string()
            .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
            .regex(/[A-Z]/, 'Mật khẩu phải có ít nhất 1 chữ hoa')
            .regex(/[a-z]/, 'Mật khẩu phải có ít nhất 1 chữ thường')
            .regex(/[0-9]/, 'Mật khẩu phải có ít nhất 1 số'),
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: 'Mật khẩu xác nhận không khớp',
        path: ['confirmPassword'],
    })

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

function ResetPasswordFormContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get('token')

    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [tokenValid, setTokenValid] = useState<boolean | null>(null)
    const [verifyingToken, setVerifyingToken] = useState(true)

    const form = useForm<ResetPasswordFormData>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: { password: '', confirmPassword: '' },
    })

    const password = form.watch('password')

    const passwordStrength = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
    }
    const strengthScore = Object.values(passwordStrength).filter(Boolean).length

    const { mutateAsync: verifyToken } = useVerifyResetToken()
    const { mutateAsync: resetPassword } = useResetPassword()

    useEffect(() => {
        const verify = async () => {
            if (!token) { setTokenValid(false); setVerifyingToken(false); return }
            try {
                const data = await verifyToken(token)
                setTokenValid(data.success)
            } catch {
                setTokenValid(false)
            } finally {
                setVerifyingToken(false)
            }
        }
        verify()
    }, [token])

    const onSubmit = async (data: ResetPasswordFormData) => {
        if (!token) { toast.error('Token không hợp lệ'); return }
        setIsLoading(true)
        try {
            const res = await resetPassword({ token, password: data.password })
            if (res.success) {
                toast.success('Đặt lại mật khẩu thành công', {
                    description: 'Bạn có thể đăng nhập với mật khẩu mới ngay bây giờ',
                })
                router.push('/login')
            } else {
                toast.error('Đặt lại mật khẩu thất bại', { description: res.message || 'Vui lòng thử lại sau' })
            }
        } catch (error: any) {
            toast.error('Đã có lỗi xảy ra', {
                description: error.response?.data?.message || 'Vui lòng thử lại sau',
            })
        } finally {
            setIsLoading(false)
        }
    }

    if (verifyingToken) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
                <Spinner className="w-6 h-6 text-primary" />
                <p className="text-sm text-muted-foreground">Đang xác thực liên kết...</p>
            </div>
        )
    }

    if (tokenValid === false) {
        return (
            <div className="space-y-6">
                <Alert variant="destructive" className="py-6">
                    <ShieldAlert className="size-5" />
                    <AlertTitle className="text-base font-bold">Liên kết không hợp lệ</AlertTitle>
                    <AlertDescription className="text-sm">
                        Liên kết đặt lại mật khẩu đã hết hạn hoặc không hợp lệ. Vui lòng yêu cầu một liên kết mới.
                    </AlertDescription>
                </Alert>
                <Button asChild size="lg" className="w-full text-base font-semibold">
                    <Link href="/forgot-password">Yêu cầu liên kết mới</Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
                <FieldGroup>
                    <Controller
                        control={form.control}
                        name="password"
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel htmlFor={field.name} className="text-sm font-semibold">Mật khẩu mới</FieldLabel>
                                <div className="relative">
                                    <Input
                                        {...field}
                                        id={field.name}
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        className="pr-10"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff className="size-4 text-muted-foreground" /> : <Eye className="size-4 text-muted-foreground" />}
                                        <span className="sr-only">Toggle password visibility</span>
                                    </Button>
                                </div>
                                {password && (
                                    <div className="space-y-3 pt-2">
                                        <div className="flex gap-1.5 h-1.5">
                                            {[1, 2, 3, 4].map((i) => (
                                                <div
                                                    key={i}
                                                    className={cn(
                                                        'h-full flex-1 rounded-full transition-all duration-500',
                                                        i <= strengthScore
                                                            ? strengthScore === 4
                                                                ? 'bg-emerald-500 shadow-[0_0_8px_-2px_rgba(16,185,129,0.5)]'
                                                                : strengthScore === 3
                                                                    ? 'bg-amber-500'
                                                                    : 'bg-destructive'
                                                            : 'bg-muted'
                                                    )}
                                                />
                                            ))}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {[
                                                { label: '8+ ký tự', valid: passwordStrength.length },
                                                { label: 'In hoa', valid: passwordStrength.uppercase },
                                                { label: 'Thường', valid: passwordStrength.lowercase },
                                                { label: 'Số', valid: passwordStrength.number },
                                            ].map((req, idx) => (
                                                <Badge
                                                    key={idx}
                                                    variant={req.valid ? "secondary" : "outline"}
                                                    className={cn(
                                                        "text-[10px] font-bold uppercase tracking-wider",
                                                        !req.valid && "text-muted-foreground/50 border-muted-foreground/20"
                                                    )}
                                                >
                                                    {req.label}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <FieldError errors={[fieldState.error]} />
                            </Field>
                        )}
                    />

                    <Controller
                        control={form.control}
                        name="confirmPassword"
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel htmlFor={field.name} className="text-sm font-semibold">Xác nhận mật khẩu mới</FieldLabel>
                                <div className="relative">
                                    <Input
                                        {...field}
                                        id={field.name}
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        className="pr-10"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    >
                                        {showConfirmPassword ? <EyeOff className="size-4 text-muted-foreground" /> : <Eye className="size-4 text-muted-foreground" />}
                                        <span className="sr-only">Toggle password visibility</span>
                                    </Button>
                                </div>
                                <FieldError errors={[fieldState.error]} />
                            </Field>
                        )}
                    />
                </FieldGroup>

                <Button type="submit" size="lg" className="w-full text-base font-semibold" disabled={isLoading || strengthScore < 4}>
                    {isLoading && <Spinner className="mr-2" />}
                    Thiết lập mật khẩu mới
                </Button>
            </form>
        </div>
    )
}

export function ResetPasswordForm() {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center py-12">
                    <Spinner className="w-6 h-6" />
                </div>
            }
        >
            <ResetPasswordFormContent />
        </Suspense>
    )
}
