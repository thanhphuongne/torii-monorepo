"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { SidebarProvider, SidebarInset } from "@workspace/ui/components/sidebar"
import { PageLoading } from "@workspace/ui/components/page-loading"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { DashboardHeader } from "@/components/layout/dashboard-header"
import { useAppSelector } from "@/hooks/hooks"

export function SenseiLayout({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, status } = useAppSelector((state) => state.auth)
    const router = useRouter()
    const pathname = usePathname()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    React.useEffect(() => {
        if (!mounted || status === "loading" || status === "idle") return
        if (!isAuthenticated) {
            const from = pathname || "/ai-sensei"
            router.replace(`/login?from=${encodeURIComponent(from)}`)
        }
    }, [mounted, status, isAuthenticated, pathname, router])

    if (!mounted || status === "loading" || status === "idle") {
        return <PageLoading className="min-h-screen" />
    }

    if (!isAuthenticated) {
        return <PageLoading className="min-h-screen" />
    }

    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full overflow-hidden bg-background">
                <AppSidebar />

                <SidebarInset className="relative z-10 flex min-h-0 flex-1 flex-col bg-transparent">
                    <DashboardHeader />
                    <main className="relative flex h-[calc(100vh-4rem)] min-h-0 flex-1 flex-col overflow-y-auto scrollbar-gutter-stable">
                        {children}
                    </main>
                </SidebarInset>
            </div>
        </SidebarProvider>
    )
}
