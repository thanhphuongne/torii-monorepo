import Link from 'next/link'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import { AuthLayout } from '@/components/auth/auth-layout'
import { ShieldCheck, KeyRound } from 'lucide-react'

export default function ForgotPasswordPage() {
    return (
        <AuthLayout
            title="Quên mật khẩu"
            description="Nhập email để nhận link khôi phục mật khẩu"
            footerText={
                <>
                    Nhớ mật khẩu rồi?{' '}
                    <Link href="/login" className="text-primary font-medium hover:underline underline-offset-4">
                        Đăng nhập ngay
                    </Link>
                </>
            }
        >
            <ForgotPasswordForm />
        </AuthLayout>
    )
}
