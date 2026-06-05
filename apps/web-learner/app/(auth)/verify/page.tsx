import Link from 'next/link'
import { Suspense } from 'react'
import { VerificationContent } from '@/components/auth/verification-content'
import { AuthLayout } from '@/components/auth/auth-layout'
import { Shield, Mail } from 'lucide-react'
import { Spinner } from '@workspace/ui/components/spinner'

export default function VerifyPage() {
    return (
        <AuthLayout
            title="Xác thực tài khoản"
            description="Đang xác minh thông tin của bạn..."
            leftPanel={
                <div className="space-y-8">
                    <div className="space-y-3">
                        <h2 className="text-4xl font-bold tracking-normal leading-tight">
                            Xác thực{' '}
                            <span className="text-primary">Tài khoản.</span>
                        </h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Chúng tôi đang xác minh thông tin để đảm bảo tính bảo mật cho tài khoản của bạn.
                        </p>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-background border">
                            <div className="size-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <Shield className="size-4" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">Bảo mật cao</p>
                                <p className="text-xs text-muted-foreground">Thông tin được mã hóa tuyệt đối</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-background border">
                            <div className="size-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <Mail className="size-4" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">Xác thực qua email</p>
                                <p className="text-xs text-muted-foreground">Kiểm tra hộp thư để hoàn tất</p>
                            </div>
                        </div>
                    </div>
                </div>
            }
        >
            <Suspense fallback={<div className="flex justify-center py-12"><Spinner className="w-6 h-6" /></div>}>
                <VerificationContent />
            </Suspense>
        </AuthLayout>
    )
}
