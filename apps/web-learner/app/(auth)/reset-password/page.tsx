import Link from 'next/link'
import { Suspense } from 'react'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'
import { AuthLayout } from '@/components/auth/auth-layout'
import { Lock, ShieldCheck } from 'lucide-react'
import { Spinner } from '@workspace/ui/components/spinner'

export default function ResetPasswordPage() {
    return (
        <AuthLayout
            title="Đặt lại mật khẩu"
            description="Thiết lập mật khẩu mới cho tài khoản của bạn"
            footerText={
                <>
                    Gặp sự cố?{' '}
                    <Link href="/contact" className="text-primary font-medium hover:underline underline-offset-4">
                        Liên hệ hỗ trợ
                    </Link>
                </>
            }
            leftPanel={
                <div className="space-y-8">
                    <div className="space-y-3">
                        <h2 className="text-4xl font-bold tracking-normal leading-tight">
                            Mật khẩu{' '}
                            <span className="text-primary">Mới hơn.</span>
                        </h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Chọn một mật khẩu mạnh để bảo vệ tài khoản học tập của bạn.
                        </p>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-background border">
                            <div className="size-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <Lock className="size-4" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">Ít nhất 8 ký tự</p>
                                <p className="text-xs text-muted-foreground">Kết hợp chữ, số, hoa/thường</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-background border">
                            <div className="size-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <ShieldCheck className="size-4" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">Bảo mật cao</p>
                                <p className="text-xs text-muted-foreground">Mã hóa AES-256 end-to-end</p>
                            </div>
                        </div>
                    </div>
                </div>
            }
        >
            <Suspense fallback={<div className="flex justify-center py-12"><Spinner className="w-6 h-6" /></div>}>
                <ResetPasswordForm />
            </Suspense>
        </AuthLayout>
    )
}
