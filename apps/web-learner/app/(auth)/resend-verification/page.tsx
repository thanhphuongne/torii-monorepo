import Link from 'next/link'
import { ResendVerificationForm } from '@/components/auth/resend-verification-form'
import { AuthLayout } from '@/components/auth/auth-layout'
import { Mail, RefreshCcw } from 'lucide-react'

export default function ResendVerificationPage() {
    return (
        <AuthLayout
            title="Gửi lại mã xác thực"
            description="Nhập email để nhận lại mã kích hoạt tài khoản"
            footerText={
                <>
                    Đã có tài khoản?{' '}
                    <Link href="/login" className="text-primary font-medium hover:underline underline-offset-4">
                        Đăng nhập
                    </Link>
                </>
            }
            leftPanel={
                <div className="space-y-8">
                    <div className="space-y-3">
                        <h2 className="text-4xl font-bold tracking-normal leading-tight">
                            Kích hoạt{' '}
                            <span className="text-primary">Lại.</span>
                        </h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Chúng tôi sẽ gửi lại email xác thực để bạn có thể hoàn tất đăng ký.
                        </p>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-background border">
                            <div className="size-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <Mail className="size-4" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">Kiểm tra Spam</p>
                                <p className="text-xs text-muted-foreground">Email có thể nằm trong thư mục Spam</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-background border">
                            <div className="size-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <RefreshCcw className="size-4" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">Gửi lại ngay</p>
                                <p className="text-xs text-muted-foreground">Nhận mã xác thực mới trong vài giây</p>
                            </div>
                        </div>
                    </div>
                </div>
            }
        >
            <ResendVerificationForm />
        </AuthLayout>
    )
}
