"use client"

import * as React from "react"
import Image from "next/image"

import { NavMain } from "@/components/layout/nav-main"
import { NavLearning } from "@/components/layout/nav-learning"
import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarRail,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
} from "@workspace/ui/components/sidebar"
import { learningNav, progressNav, accountNav, aiSenseiNav } from "@/config/navigation"
import { cn } from "@workspace/ui/lib/utils"
import { useLogo } from "@/hooks/useLogo"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const logo = useLogo()
    return (
        <Sidebar
            collapsible="icon"
            variant="sidebar"
            {...props}
            className="border-r border-border bg-card"
        >
            <SidebarHeader className="h-16 justify-center group-data-[collapsible=icon]:px-0">
                <SidebarMenu>
                    <SidebarMenuItem className="px-2 group-data-[collapsible=icon]:px-0">
                        <SidebarMenuButton
                            size="lg"
                            className={cn(
                                "hover:bg-transparent transition-all duration-300",
                                "group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center"
                            )}
                        >
                            <div className="flex items-center justify-start rounded-lg shrink-0">
                                <Image
                                    src={logo}
                                    alt="Torii Nihongo"
                                    width={220}
                                    height={48}
                                    className="h-16 w-auto object-contain"
                                />
                            </div>
                            <div className="grid flex-1 text-left text-sm leading-tight ml-2 group-data-[collapsible=icon]:hidden">
                                <span className="truncate text-sm md:text-base font-semibold text-muted-foreground font-sans">
                                    Torii Nihongo
                                </span>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="scrollbar-none py-2">
                <NavMain label="Học tập" items={learningNav as any} />
                <NavMain label="AI Sensei" items={aiSenseiNav as any} />
                <NavLearning />
                <NavMain label="Tiến độ" items={progressNav as any} />
                <NavMain label="Tài khoản" items={accountNav as any} />

            </SidebarContent>

            <SidebarRail className="hover:after:bg-primary/20" />
        </Sidebar>
    )
}
