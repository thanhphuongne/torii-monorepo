import Link from 'next/link'
import { RegisterForm } from '@/components/auth/register-form'
import { AuthLayout } from '@/components/auth/auth-layout'

export default function RegisterPage() {
    return (
        <AuthLayout
            title="Đăng ký"
            description="Bắt đầu hành trình chinh phục tiếng Nhật của bạn"
            footerText={
                <>
                    Đã có tài khoản?{' '}
                    <Link href="/login" className="text-primary font-medium hover:underline underline-offset-4">
                        Đăng nhập
                    </Link>
                </>
            }
        >
            <>
                <RegisterForm />
                <p className="text-xs text-center text-muted-foreground">
                    Bằng cách đăng ký, bạn đồng ý với{' '}
                    <Link href="/terms" className="underline underline-offset-4 hover:text-primary">Điều khoản</Link>{' '}
                    và{' '}
                    <Link href="/privacy" className="underline underline-offset-4 hover:text-primary">Chính sách bảo mật</Link>.
                </p>
            </>
        </AuthLayout>
    )
}
