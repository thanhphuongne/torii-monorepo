"use client"

import Link from 'next/link'
import Image from 'next/image'
import { type ReactNode } from 'react'
import { useLogo } from '@/hooks/useLogo'
import { BookOpen, Sparkles, ShieldCheck } from 'lucide-react'

interface AuthLayoutProps {
    /** Tiêu đề trang */
    title: string
    /** Mô tả ngắn dưới tiêu đề */
    description?: string
    /** Form hoặc content chính */
    children: ReactNode
    /** Footer text - phần "Đã có tài khoản?" */
    footerText?: ReactNode
    /** Nội dung tuỳ chỉnh cho panel bên trái (nếu cần override mặc định) */
    leftPanel?: ReactNode
}

const LEFT_POINTS = [
    { icon: BookOpen, text: 'Lộ trình N5 → N1 bài bản, cá nhân hóa' },
    { icon: Sparkles, text: 'AI Sensei & lớp học trực tuyến tương tác' },
    { icon: ShieldCheck, text: 'Bảo mật & cam kết hỗ trợ học viên' },
] as const

export function AuthLayout({
    title,
    description,
    children,
    footerText,
    leftPanel,
}: AuthLayoutProps) {
    const logo = useLogo()

    return (
        <main className="min-h-screen flex flex-col md:flex-row font-sans">
            {/* Left: một block cố định, gọn, trên nền caro */}
            <section
                className="hidden md:flex md:w-[48%] flex-col justify-between p-10 lg:p-14"
                data-purpose="auth-left"
            >
                <Link href="/" className="inline-flex items-center gap-3 group transition-opacity hover:opacity-90">
                    <Image
                        src={logo}
                        alt="Torii Nihongo"
                        width={52}
                        height={52}
                        className="h-10 w-auto object-contain"
                        priority
                    />
                    <div className="flex flex-col">
                        <span className="text-foreground text-lg font-bold tracking-widest leading-none">TORII</span>
                        <span className="text-muted-foreground text-[10px] font-bold tracking-[0.35em] leading-none mt-0.5">NIHONGO</span>
                    </div>
                </Link>

                <div className="max-w-md mt-12 flex-1 flex flex-col justify-center">
                    {leftPanel ? (
                        leftPanel
                    ) : (
                        <>
                            <h1 className="text-4xl lg:text-5xl font-bold text-foreground leading-tight tracking-normal">
                                Một nền tảng.
                                <br />
                                <span className="text-primary">Trọn lộ trình JLPT.</span>
                            </h1>
                            <p className="mt-4 text-muted-foreground text-base leading-relaxed">
                                Học tiếng Nhật bài bản với video, AI trợ lý và lớp live — từ vỡ lòng đến đạt chứng chỉ.
                            </p>
                            <ul className="mt-10 space-y-5">
                                {LEFT_POINTS.map(({ icon: Icon, text }) => (
                                    <li key={text} className="flex items-center gap-4 text-base">
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                            <Icon className="h-5 w-5" />
                                        </span>
                                        <span className="text-foreground font-medium">{text}</span>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </div>

                <p className="text-muted-foreground text-xs pt-8">
                    © {new Date().getFullYear()} Torii Nihongo
                </p>
            </section>

            {/* Right: form trong card */}
            <section
                className="flex-1 flex flex-col justify-center items-center p-4 sm:p-5 md:p-10"
                data-purpose="auth-form"
            >
                <div className="w-full max-w-[440px] space-y-6 animate-in fade-in slide-in-from-right duration-700">
                    <div className="md:hidden flex justify-center">
                        <Link href="/" className="flex items-center gap-2">
                            <Image src={logo} alt="Torii Nihongo" width={40} height={40} className="h-9 w-auto object-contain" priority />
                            <div className="flex flex-col text-left">
                                <span className="text-foreground text-lg font-bold tracking-widest leading-none">TORII</span>
                                <span className="text-muted-foreground text-[10px] font-bold tracking-[0.35em] leading-none mt-0.5">NIHONGO</span>
                            </div>
                        </Link>
                    </div>

                    <div className="rounded-3xl border border-border bg-card p-7 sm:p-8 md:p-10 shadow-xl ring-1 ring-black/5">
                        <div className="text-center space-y-1.5 mb-8">
                            <h2 className="text-2xl font-extrabold text-foreground tracking-normal">{title}</h2>
                            {description && <p className="text-muted-foreground text-sm">{description}</p>}
                        </div>

                        <div className="font-sans">{children}</div>

                        {footerText && (
                            <div className="text-center pt-6 mt-6 border-t border-border">
                                <p className="text-sm text-muted-foreground">{footerText}</p>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </main>
    )
}
