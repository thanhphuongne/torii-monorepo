"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Sparkles, type LucideIcon } from "lucide-react"

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    useSidebar,
} from "@workspace/ui/components/sidebar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@workspace/ui/components/dropdown-menu"
import { cn } from "@workspace/ui/lib/utils"

export interface NavMainItem {
    name: string
    href: string
    icon?: LucideIcon
    items?: {
        name: string
        href: string
    }[]
}

export function NavMain({
    label,
    items,
}: {
    label: string
    items: NavMainItem[]
}) {
    const pathname = usePathname()
    const { state, isMobile } = useSidebar()
    const isCollapsed = state === "collapsed"

    return (
        <SidebarGroup className="group-data-[collapsible=icon]:px-0">
            <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40 mb-2 px-4 group-data-[collapsible=icon]:hidden">
                {label}
            </SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) => {
                    const isItemActive = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href)
                    const hasSubItems = item.items && item.items.length > 0

                    const menuButton = (
                        <SidebarMenuButton
                            tooltip={isCollapsed ? undefined : item.name}
                            className={cn(
                                "h-10 transition-all duration-200",
                                isItemActive
                                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                                "group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center"
                            )}
                        >
                            <div className="flex items-center justify-center shrink-0">
                                {item.icon && <item.icon className={cn("size-4", isItemActive && "scale-110")} />}
                            </div>
                            <span className="ml-2 font-medium text-sm group-data-[collapsible=icon]:hidden truncate">{item.name}</span>
                            {hasSubItems && (
                                <ChevronRight className="ml-auto size-3 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 opacity-50 group-data-[collapsible=icon]:hidden" />
                            )}
                            {isItemActive && !hasSubItems && (
                                <Sparkles className="ml-auto size-3 text-primary opacity-50 group-data-[collapsible=icon]:hidden" />
                            )}
                        </SidebarMenuButton>
                    )

                    return (
                        <SidebarMenuItem key={item.name} className="px-2 group-data-[collapsible=icon]:px-0">
                            {hasSubItems ? (
                                isCollapsed && !isMobile ? (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            {menuButton}
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                            side="right"
                                            align="start"
                                            sideOffset={16}
                                            className="w-56 rounded-lg p-1"
                                        >
                                            <DropdownMenuLabel className="text-xs font-medium text-muted-foreground px-2 py-1.5">
                                                {item.name}
                                            </DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            {item.items?.map((subItem) => (
                                                <DropdownMenuItem key={subItem.name} asChild>
                                                    <Link
                                                        href={subItem.href}
                                                        className={cn(
                                                            "cursor-pointer px-2 py-1.5 text-xs font-medium rounded-sm",
                                                            pathname === subItem.href && "bg-accent text-accent-foreground"
                                                        )}
                                                    >
                                                        {subItem.name}
                                                    </Link>
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                ) : (
                                    <Collapsible
                                        asChild
                                        defaultOpen={isItemActive}
                                        className="group/collapsible"
                                    >
                                        <div>
                                            <CollapsibleTrigger asChild>
                                                {menuButton}
                                            </CollapsibleTrigger>
                                            <CollapsibleContent>
                                                <SidebarMenuSub>
                                                    {item.items?.map((subItem) => (
                                                        <SidebarMenuSubItem key={subItem.name}>
                                                            <SidebarMenuSubButton asChild isActive={pathname === subItem.href}>
                                                                <Link href={subItem.href}>
                                                                    <span>{subItem.name}</span>
                                                                </Link>
                                                            </SidebarMenuSubButton>
                                                        </SidebarMenuSubItem>
                                                    ))}
                                                </SidebarMenuSub>
                                            </CollapsibleContent>
                                        </div>
                                    </Collapsible>
                                )
                            ) : (
                                <SidebarMenuButton
                                    asChild
                                    tooltip={item.name}
                                    className={cn(
                                        "h-10 transition-all duration-200",
                                        isItemActive
                                            ? "bg-primary/10 text-primary hover:bg-primary/20"
                                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                                        "group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center"
                                    )}
                                >
                                    <Link href={item.href}>
                                        <div className="flex items-center justify-center shrink-0">
                                            {item.icon && <item.icon className={cn("size-4", isItemActive && "scale-110")} />}
                                        </div>
                                        <span className="ml-2 font-medium text-sm group-data-[collapsible=icon]:hidden truncate">{item.name}</span>
                                        {isItemActive && (
                                            <Sparkles className="ml-auto size-3 text-primary opacity-50 group-data-[collapsible=icon]:hidden" />
                                        )}
                                    </Link>
                                </SidebarMenuButton>
                            )}
                        </SidebarMenuItem>
                    )
                })}
            </SidebarMenu>
        </SidebarGroup>
    )
}
