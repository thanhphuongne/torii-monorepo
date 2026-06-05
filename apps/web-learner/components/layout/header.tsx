"use client"

import { Button } from "@workspace/ui/components/button"
import { Avatar, AvatarImage, AvatarFallback } from "@workspace/ui/components/avatar"
import { Switch } from "@workspace/ui/components/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet"
import { LayoutDashboard, LogOut, Moon, Sun, Menu } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useAppSelector, useAppDispatch } from "@/hooks/hooks"
import { logout } from "@/store/slices/authSlice"
import { useLogo } from "@/hooks/useLogo"
import { useState } from "react"

export function Header() {
    const pathname = usePathname()
    const router = useRouter()
    const dispatch = useAppDispatch()
    const { user, isAuthenticated } = useAppSelector(state => state.auth)
    const { theme, setTheme } = useTheme()
    const logo = useLogo()
    const [open, setOpen] = useState(false)

    const handleLogout = async () => {
        await dispatch(logout())
        setOpen(false)
        router.push('/')
    }

    const navLinks = [
        { href: "/dashboard/available-courses", label: "Khóa học" },
        { href: "/dashboard/blogs", label: "Blog" },
        { href: "/dashboard/faq", label: "Hỗ trợ" },
    ]

    return (
        <header className="fixed top-0 z-50 w-full border-b border-border/40 bg-background/70 backdrop-blur-md">
            <div className="container mx-auto px-4 lg:px-8 h-16 flex items-center justify-between gap-3">
                <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
                    <Image src={logo} alt="Torii Nihongo" width={48} height={48} className="w-9 h-9 object-contain" />
                    <div className="flex flex-col leading-none">
                        <span className="text-base font-bold tracking-normal text-foreground">Torii</span>
                        <span className="text-[11px] font-semibold text-muted-foreground mt-1">Nihongo</span>
                    </div>
                </Link>

                <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-muted-foreground">
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="hover:text-foreground transition-colors"
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                <div className="flex items-center gap-2 lg:gap-4">
                    <div className="hidden md:flex items-center gap-4">
                        {isAuthenticated && user ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Avatar className="h-9 w-9 cursor-pointer border border-border hover:border-border/80 transition-colors">
                                        {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
                                        <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                                            {user.displayName?.substring(0, 2).toUpperCase() || 'U'}
                                        </AvatarFallback>
                                    </Avatar>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-64 p-2 rounded-xl shadow-xl border-border bg-card/95 backdrop-blur-md">
                                    <DropdownMenuLabel className="font-bold text-foreground text-sm px-2 pt-2">
                                        {user.displayName}
                                    </DropdownMenuLabel>
                                    <p className="px-2 pb-2 text-xs text-muted-foreground truncate">
                                        {user.email || 'No email'}
                                    </p>
                                    <DropdownMenuSeparator />
                                    <div className="flex items-center justify-between px-2 py-3">
                                        <div className="flex items-center gap-2">
                                            {theme === "dark" ? (
                                                <Moon className="size-4 text-primary" />
                                            ) : (
                                                <Sun className="size-4 text-amber-500" />
                                            )}
                                            <span className="text-sm font-bold">{theme === "dark" ? "Chế độ tối" : "Chế độ sáng"}</span>
                                        </div>
                                        <Switch
                                            checked={theme === "dark"}
                                            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                                        />
                                    </div>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild className="rounded-lg py-3 cursor-pointer">
                                        <Link href="/dashboard" className="flex items-center gap-3">
                                            <LayoutDashboard className="size-4 text-primary" />
                                            <span className="font-semibold">Vào học</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleLogout} className="rounded-lg py-3 cursor-pointer text-destructive focus:bg-destructive/10">
                                        <LogOut className="size-4" />
                                        <span className="font-semibold">Đăng xuất</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" className="hidden sm:flex font-semibold text-sm text-muted-foreground hover:text-foreground" asChild>
                                    <Link href="/login">Đăng nhập</Link>
                                </Button>
                                <Button className="bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg px-5 h-10" asChild>
                                    <Link href="/register">Đăng ký</Link>
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Mobile Menu */}
                    <Sheet open={open} onOpenChange={setOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="md:hidden">
                                <Menu className="h-6 w-6" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-[300px] sm:w-[360px] flex flex-col">
                            <SheetHeader className="border-b pb-3 mb-3">
                                <SheetTitle className="flex items-center gap-2">
                                    <Image src={logo} alt="Logo" width={28} height={28} className="rounded-md" />
                                    <span className="font-bold tracking-normal text-base">Torii Nihongo</span>
                                </SheetTitle>
                            </SheetHeader>
                            <div className="flex flex-col gap-5 py-2 px-2">
                                <nav className="flex flex-col">
                                    {navLinks.map((link) => (
                                        <Link 
                                            key={link.href} 
                                            href={link.href} 
                                            onClick={() => setOpen(false)}
                                            className="py-3 px-1 text-sm font-semibold text-foreground/80 hover:text-foreground transition-colors border-b border-border/60"
                                        >
                                            {link.label}
                                        </Link>
                                    ))}
                                </nav>
                                
                                <div className="flex flex-col gap-2">
                                    {isAuthenticated && user ? (
                                        <>
                                            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                                                <Avatar className="h-12 w-12 border-2 border-primary/20">
                                                    {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
                                                    <AvatarFallback className="bg-primary text-white font-bold">
                                                        {user.displayName?.substring(0, 2).toUpperCase() || 'U'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-foreground leading-none">{user.displayName}</span>
                                                    <span className="text-xs text-muted-foreground mt-1">{user.email}</span>
                                                </div>
                                            </div>
                                            <Button className="w-full h-11 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold" asChild onClick={() => setOpen(false)}>
                                                <Link href="/dashboard" className="flex items-center justify-center gap-2">
                                                    <LayoutDashboard className="size-4" />
                                                    Vào học
                                                </Link>
                                            </Button>
                                            <Button variant="outline" className="w-full h-11 rounded-lg text-destructive hover:bg-destructive/10" onClick={handleLogout}>
                                                <LogOut className="size-4 mr-2" />
                                                Đăng xuất
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Button variant="outline" className="h-11 rounded-lg font-semibold" asChild onClick={() => setOpen(false)}>
                                                <Link href="/login">Đăng nhập</Link>
                                            </Button>
                                            <Button className="h-11 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold" asChild onClick={() => setOpen(false)}>
                                                <Link href="/register">Đăng ký</Link>
                                            </Button>
                                        </>
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-4 mt-auto border-t border-border">
                                    <span className="text-sm font-semibold text-muted-foreground">{theme === "dark" ? "Chế độ tối" : "Chế độ sáng"}</span>
                                    <Switch
                                        checked={theme === "dark"}
                                        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                                    />
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </header>
    )
}

