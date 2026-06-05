import Link from 'next/link'
import { LoginForm } from '@/components/auth/login-form'
import { AuthLayout } from '@/components/auth/auth-layout'

export default function LoginPage() {
    return (
        <AuthLayout
            title="Đăng nhập"
            description="Chào mừng quay trở lại Torii Nihongo"
            footerText={
                <>
                    Chưa có tài khoản?{' '}
                    <Link href="/register" className="text-primary font-medium hover:underline underline-offset-4">
                        Đăng ký ngay
                    </Link>
                </>
            }
        >
            <LoginForm />
        </AuthLayout>
    )
}
