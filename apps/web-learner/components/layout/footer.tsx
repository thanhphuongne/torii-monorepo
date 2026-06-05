"use client"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Facebook, Youtube } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useLogo } from "@/hooks/useLogo"

export function Footer() {
    const logo = useLogo()
    
    return (
        <footer className="bg-background border-t border-border/40 py-24 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-20" />
            
            <div className="container mx-auto px-4 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 lg:gap-24 mb-20">
                    <div className="space-y-8">
                        <Link href="/" className="flex items-center gap-3">
                            <Image src={logo} alt="Torii Nihongo" width={56} height={56} className="w-10 h-auto object-contain" />
                            <div className="flex flex-col">
                                <span className="text-xl font-bold tracking-normaler text-foreground leading-none uppercase">Torii</span>
                                <span className="text-[9px] font-bold text-muted-foreground tracking-[0.4em] leading-none mt-1 uppercase">Nihongo</span>
                            </div>
                        </Link>
                        <p className="text-muted-foreground text-sm leading-relaxed font-medium max-w-xs">
                            Hệ thống nhật ngữ cao cấp, tiên phong trong công tác chuyển đổi số E-learning. 
                            Chinh phục tiếng Nhật bài bản với AI trợ lý và cộng đồng học tập sôi nổi.
                        </p>
                        <div className="flex gap-4">
                            <Link href="#" className="h-10 w-10 rounded-full border border-border flex items-center justify-center hover:bg-primary hover:text-white transition-all hover:scale-110">
                                <Facebook className="size-4" />
                            </Link>
                            <Link href="#" className="h-10 w-10 rounded-full border border-border flex items-center justify-center hover:bg-primary hover:text-white transition-all hover:scale-110">
                                <Youtube className="size-4" />
                            </Link>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <h4 className="text-foreground font-bold text-xs uppercase tracking-[0.2em]">Học tập</h4>
                        <ul className="space-y-4">
                            <li><Link href="/dashboard/available-courses" className="text-muted-foreground hover:text-primary transition-colors text-sm font-bold">Thư viện khóa tự học JLPT</Link></li>
                            <li><Link href="/live-courses" className="text-muted-foreground hover:text-primary transition-colors text-sm font-bold">Lịch khai giảng lớp trực tiếp</Link></li>
                            <li><Link href="#" className="text-muted-foreground hover:text-primary transition-colors text-sm font-bold">Lộ trình học tập</Link></li>
                            <li><Link href="#" className="text-muted-foreground hover:text-primary transition-colors text-sm font-bold">Tài liệu miễn phí</Link></li>
                        </ul>
                    </div>

                    <div className="space-y-8">
                        <h4 className="text-foreground font-bold text-xs uppercase tracking-[0.2em]">Kết nối</h4>
                        <ul className="space-y-4">
                            <li className="flex flex-col gap-1">
                                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Hotline</span>
                                <span className="text-sm font-bold text-foreground">1900 1234</span>
                            </li>
                            <li className="flex flex-col gap-1">
                                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Email</span>
                                <span className="text-sm font-bold text-foreground">contact@toriinihongo.edu.vn</span>
                            </li>
                            <li className="flex flex-col gap-1">
                                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Địa chỉ</span>
                                <span className="text-sm font-bold text-foreground leading-relaxed">123 Đường Trần Phú, Quận Hải Châu, TP. Đà Nẵng</span>
                            </li>
                        </ul>
                    </div>

                    <div className="space-y-8">
                        <h4 className="text-foreground font-bold text-xs uppercase tracking-[0.2em]">Newsletter</h4>
                        <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                            Nhận lịch khai giảng ưu đãi và tài liệu JLPT miễn phí hàng tuần.
                        </p>
                        <div className="flex flex-col gap-3">
                            <Input placeholder="Email của bạn..." className="bg-muted/30 border-border rounded-xl h-12 px-4 focus-visible:ring-primary font-medium" />
                            <Button className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20">Đăng ký ngay</Button>
                        </div>
                    </div>
                </div>

                <div className="pt-8 border-t border-border/40 flex flex-col md:flex-row justify-between items-center gap-6 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                    <p>© {new Date().getFullYear()} Torii Nihongo. Nền tảng học tiếng Nhật.</p>
                    <div className="flex gap-8">
                        <Link href="#" className="hover:text-primary transition-colors">Điều khoản</Link>
                        <Link href="/privacy-policy" className="hover:text-primary transition-colors">Bản mật</Link>
                        <Link href="#" className="hover:text-primary transition-colors">Cookies</Link>
                    </div>
                </div>
            </div>
            {/* Background design elements */}
            <div className="absolute bottom-[-100px] right-[-100px] w-64 h-64 bg-primary/5 rounded-full blur-[100px]" />
        </footer>
    )
}
