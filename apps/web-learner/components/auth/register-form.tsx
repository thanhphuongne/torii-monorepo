'use client'

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAppDispatch, useAppSelector } from '@/hooks/hooks'
import { register as registerAction, clearError, checkAuth } from '@/store/slices/authSlice'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Field, FieldLabel, FieldError, FieldGroup } from '@workspace/ui/components/field'
import { Separator } from '@workspace/ui/components/separator'
import { toast } from '@workspace/ui/components/sonner'
import { Eye, EyeOff } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { z } from 'zod'
import { cn } from '@workspace/ui/lib/utils'
import { useGoogleAuth, useFacebookAuth } from '@/lib/api/services/auth-api'
import { createGoogleGsiLoadingGuard, shouldEndFlowFromPromptMoment } from '@/lib/google-gsi-loading-guard'
import { useEffect as useCleanup } from 'react'
import { Spinner } from '@workspace/ui/components/spinner'
import { Badge } from '@workspace/ui/components/badge'

const registerFormSchema = z
    .object({
        fullName: z
            .string()
            .min(2, 'Họ và tên phải có ít nhất 2 ký tự')
            .max(120, 'Họ và tên quá dài'),
        email: z.string().email('Địa chỉ email không hợp lệ'),
        password: z
            .string()
            .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
            .regex(/[A-Z]/, 'Mật khẩu phải chứa ít nhất một chữ hoa')
            .regex(/[a-z]/, 'Mật khẩu phải chứa ít nhất một chữ thường')
            .regex(/[0-9]/, 'Mật khẩu phải chứa ít nhất một số'),
        confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: 'Mật khẩu xác nhận không khớp',
        path: ['confirmPassword'],
    })

type RegisterFormData = z.infer<typeof registerFormSchema>

export function RegisterForm() {
    const dispatch = useAppDispatch()
    const router = useRouter()
    const searchParams = useSearchParams()
    const { status } = useAppSelector((state) => state.auth)
    const isLoading = status === 'loading'
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const googleAuthMutation = useGoogleAuth()
    const facebookAuthMutation = useFacebookAuth()
    const [googleLoading, setGoogleLoading] = useState(false)
    const [facebookLoading, setFacebookLoading] = useState(false)

    const form = useForm<RegisterFormData>({
        resolver: zodResolver(registerFormSchema),
        defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
        mode: 'onChange',
    })

    const password = form.watch('password')

    const requirements = [
        { label: 'Ít nhất 8 ký tự', valid: (password?.length ?? 0) >= 8 },
        { label: 'Chữ in hoa', valid: /[A-Z]/.test(password || '') },
        { label: 'Chữ thường', valid: /[a-z]/.test(password || '') },
        { label: 'Số', valid: /[0-9]/.test(password || '') },
    ]

    useEffect(() => {
        return () => { dispatch(clearError()) }
    }, [dispatch])

    useEffect(() => {
        // Load Google SDK
        const googleScript = document.createElement('script')
        googleScript.src = 'https://accounts.google.com/gsi/client'
        googleScript.async = true
        googleScript.defer = true
        document.body.appendChild(googleScript)
    }, [])

    const onSubmit = async (data: RegisterFormData) => {
        try {
            const { confirmPassword, fullName, ...rest } = data
            const resultAction = await dispatch(
                registerAction({
                    email: rest.email,
                    password: rest.password,
                    fullName: fullName.trim(),
                    platform: 'web',
                }),
            )

            if (registerAction.fulfilled.match(resultAction)) {
                form.reset()
                toast.success('Tạo tài khoản thành công!', {
                    description: 'Vui lòng kiểm tra email để xác thực tài khoản.',
                    duration: 6000,
                })
                router.push('/verify-request')
            } else {
                const errorMessage =
                    typeof resultAction.payload === 'string'
                        ? resultAction.payload
                        : (resultAction.payload as any)?.message || 'Không thể tạo tài khoản'
                toast.error('Đăng ký thất bại', { description: errorMessage })
            }
        } catch {
            toast.error('Đăng ký thất bại', { description: 'Đã có lỗi không mong muốn xảy ra' })
        }
    }

    const handleGoogleButtonClick = () => {
        const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
        if (!googleClientId) { toast.error('Google OAuth chưa được cấu hình'); return }
        setGoogleLoading(true)
        if (typeof window === 'undefined' || !(window as any).google?.accounts?.id) {
            toast.error('Google Sign-In chưa tải. Vui lòng tải lại trang.')
            setGoogleLoading(false)
            return
        }
        const guard = createGoogleGsiLoadingGuard(setGoogleLoading, 60_000)
        
        // Listen for window focus to detect popup closure
        const handleFocus = () => {
            setTimeout(() => {
                window.removeEventListener('focus', handleFocus)
                guard.end()
            }, 1000)
        }
        window.addEventListener('focus', handleFocus)

        ; (window as any).google.accounts.id.initialize({
            client_id: googleClientId,
            callback: async (response: any) => {
                // Remove focus listener as we have a response
                window.removeEventListener('focus', handleFocus)
                try {
                    const result = await googleAuthMutation.mutateAsync(response.credential)
                    await dispatch(checkAuth())
                    toast.success(`Chào mừng, ${result.user.displayName || 'Người dùng'}!`)
                    router.push(searchParams.get('from') || '/dashboard')
                } catch (error: any) {
                    toast.error(error?.message || 'Đăng nhập Google thất bại')
                } finally {
                    guard.end()
                }
            },
        })
        const buttonWrapper = document.createElement('div')
        buttonWrapper.style.cssText = 'position:absolute;opacity:0;pointer-events:none;width:0;height:0'
        document.body.appendChild(buttonWrapper)
            ; (window as any).google.accounts.id.renderButton(buttonWrapper, { type: 'standard', size: 'large' })
        setTimeout(() => {
            const btn = buttonWrapper.querySelector('div[role="button"]') as HTMLElement
            if (btn) btn.click()
            else {
                try {
                    ; (window as any).google.accounts.id.prompt((notification: unknown) => {
                        if (shouldEndFlowFromPromptMoment(notification)) {
                            window.removeEventListener('focus', handleFocus)
                            guard.end()
                        }
                    })
                } catch {
                    window.removeEventListener('focus', handleFocus)
                    guard.end()
                    toast.error('Không thể khởi tạo Google Sign-In')
                }
            }
        }, 200)
    }

    const handleFacebookButtonClick = () => {
        const facebookAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID
        if (!facebookAppId) {
            toast.error('Facebook App ID chưa được cấu hình')
            return
        }

        if (typeof window === 'undefined' || !(window as any).FB) {
            toast.error('Facebook SDK chưa tải. Vui lòng tải lại trang.')
            return
        }

        setFacebookLoading(true)
        ; (window as any).FB.login(
            (response: any) => {
                if (response.authResponse) {
                    const { accessToken } = response.authResponse
                    facebookAuthMutation
                        .mutateAsync(accessToken)
                        .then(async (result) => {
                            await dispatch(checkAuth())
                            toast.success(`Chào mừng, ${result.user.displayName || 'Người dùng'}!`)
                            router.push(searchParams.get('from') || '/dashboard')
                        })
                        .catch((error: any) => {
                            toast.error(error?.message || 'Đăng nhập Facebook thất bại')
                        })
                        .finally(() => {
                            setFacebookLoading(false)
                        })
                } else {
                    setFacebookLoading(false)
                    toast.error('Đăng nhập Facebook bị hủy')
                }
            },
            { scope: 'public_profile,email' }
        )
    }

    return (
        <div className="space-y-6">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
                <FieldGroup>
                    <Controller
                        control={form.control}
                        name="fullName"
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel htmlFor={field.name} className="text-sm font-semibold">
                                    Họ và tên
                                </FieldLabel>
                                <Input
                                    {...field}
                                    id={field.name}
                                    type="text"
                                    placeholder="Nhập họ và tên đầy đủ của bạn"
                                    autoComplete="name"
                                />
                                <FieldError errors={[fieldState.error]} />
                            </Field>
                        )}
                    />

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

                    <Controller
                        control={form.control}
                        name="password"
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel htmlFor={field.name} className="text-sm font-semibold">Tạo mật khẩu</FieldLabel>
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
                                        <span className="sr-only">
                                            {showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                        </span>
                                    </Button>
                                </div>
                                {password && (
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {requirements.map((req, i) => (
                                            <Badge
                                                key={i}
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
                                        <span className="sr-only">
                                            {showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                        </span>
                                    </Button>
                                </div>
                                <FieldError errors={[fieldState.error]} />
                            </Field>
                        )}
                    />
                </FieldGroup>

                <Button type="submit" size="lg" className="w-full text-base font-semibold" disabled={isLoading || googleLoading}>
                    {isLoading && <Spinner className="mr-2" />}
                    Đăng ký
                </Button>
            </form>

            <div className="relative flex items-center gap-3 py-2">
                <Separator className="flex-1" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Hoặc</span>
                <Separator className="flex-1" />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="w-full gap-2"
                    onClick={handleGoogleButtonClick}
                    disabled={isLoading || googleLoading}
                >
                    {googleLoading ? (
                        <Spinner className="size-4" />
                    ) : (
                        <svg className="size-4" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                    )}
                    Google
                </Button>

                <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="w-full gap-2 border-[#1877F2] text-[#1877F2] hover:bg-[#1877F2] hover:text-white"
                    onClick={handleFacebookButtonClick}
                    disabled={isLoading || facebookLoading}
                >
                    {facebookLoading ? (
                        <Spinner className="size-4" />
                    ) : (
                        <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                    )}
                    Facebook
                </Button>
            </div>
        </div>
    )
}
