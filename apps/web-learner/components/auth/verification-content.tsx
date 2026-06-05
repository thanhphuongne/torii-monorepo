'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ShieldCheck, ShieldAlert } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { Spinner } from '@workspace/ui/components/spinner'
import { useTimeout } from '@workspace/ui/hooks/use-timeout'
import { useAppDispatch } from '@/hooks/hooks'
import { fetchProfile } from '@/store/slices/authSlice'
import { useVerifyEmail } from '@/lib/api/services/auth-api'

export function VerificationContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const dispatch = useAppDispatch()
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
    const [message, setMessage] = useState('')
    const [redirectDelay, setRedirectDelay] = useState<number | null>(null)
    const { mutateAsync: verifyEmail } = useVerifyEmail()

    useTimeout(() => { router.push('/') }, redirectDelay)

    useEffect(() => {
        const token = searchParams.get('token')

        if (!token) {
            setStatus('error')
            setMessage('Link xác thực không hợp lệ')
            return
        }

        const verifyToken = async () => {
            try {
                const data = await verifyEmail(token)
                if (data.success) {
                    setStatus('success')
                    setMessage('Email đã được xác thực thành công!')
                    await dispatch(fetchProfile())
                    setRedirectDelay(3000)
                } else {
                    setStatus('error')
                    setMessage(data.message || 'Link xác thực không hợp lệ hoặc đã hết hạn')
                }
            } catch {
                setStatus('error')
                setMessage('Đã xảy ra lỗi khi xác thực. Vui lòng thử lại.')
            }
        }

        verifyToken()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, dispatch, router])

    if (status === 'loading') {
        return (
            <div className="flex flex-col items-center justify-center gap-4 py-12">
                <Spinner className="h-8 w-8 text-primary" />
                <p className="text-sm text-muted-foreground">Đang xác thực...</p>
            </div>
        )
    }

    if (status === 'success') {
        return (
            <div className="flex flex-col items-center text-center gap-6 py-4">
                <div className="flex size-20 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
                    <ShieldCheck className="size-10 text-primary" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-bold tracking-normal">Kích hoạt thành công</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-[280px]">
                        Chào mừng đến với <span className="text-foreground font-bold">Torii Nihongo</span>. Đang chuyển hướng sau 3 giây...
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center text-center gap-6 py-4">
            <div className="flex size-20 items-center justify-center rounded-full bg-destructive/10 border border-destructive/20">
                <ShieldAlert className="size-10 text-destructive" />
            </div>
            <div className="space-y-2">
                <h3 className="text-xl font-bold tracking-normal">Xác thực thất bại</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-[280px]">{message}</p>
            </div>
            <Button onClick={() => router.push('/')} variant="outline" size="lg" className="w-full max-w-[240px] font-semibold">
                Trở về trang chủ
            </Button>
        </div>
    )
}
