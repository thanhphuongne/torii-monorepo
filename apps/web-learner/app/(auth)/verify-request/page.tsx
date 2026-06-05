import Link from 'next/link'
import { Button } from '@workspace/ui/components/button'
import { AuthLayout } from '@/components/auth/auth-layout'
import { Mail, Shield, Clock, ArrowRight } from 'lucide-react'

export default function VerifyRequestPage() {
    return (
        <AuthLayout
            title="Kiểm tra hộp thư"
            description="Email xác thực đã được gửi tới hòm thư của bạn"
            leftPanel={
                <div className="space-y-8">
                    <div className="space-y-3">
                        <h2 className="text-4xl font-bold tracking-normal leading-tight">
                            Kiểm tra{' '}
                            <span className="text-primary">Email.</span>
                        </h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Chúng tôi đã gửi email xác thực đến hộp thư của bạn. Vui lòng kiểm tra để hoàn tất đăng ký.
                        </p>
                    </div>
                    <div className="space-y-3">
                        {[
                            { icon: Mail, title: 'Kiểm tra hộp thư', desc: 'Email xác thực đã được gửi tới địa chỉ của bạn' },
                            { icon: Shield, title: 'Liên kết bảo mật', desc: 'Click vào link trong email để kích hoạt tài khoản' },
                            { icon: Clock, title: 'Kiểm tra Spam', desc: 'Nếu không thấy email, hãy kiểm tra thư mục Spam' },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-background border">
                                <div className="size-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                    <item.icon className="size-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">{item.title}</p>
                                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            }
        >
            <div className="space-y-6">
                <div className="flex flex-col items-center text-center gap-4 p-6 rounded-lg border bg-muted/30">
                    <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
                        <Mail className="size-7 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Chúng tôi đã gửi một liên kết bảo mật. Vui lòng kiểm tra hộp thư đến và cả thư mục Spam để hoàn tất kích hoạt tài khoản.
                    </p>
                </div>

                <Button asChild size="lg" className="w-full text-base font-semibold">
                    <Link href="/login">
                        Đăng nhập ngay
                        <ArrowRight className="ml-2 size-4" />
                    </Link>
                </Button>

                <p className="text-sm text-center text-muted-foreground">
                    Không nhận được email?{' '}
                    <Link
                        href="/resend-verification"
                        className="text-primary hover:underline underline-offset-4 transition-colors"
                    >
                        Gửi lại mã
                    </Link>
                </p>
            </div>
        </AuthLayout>
    )
}
