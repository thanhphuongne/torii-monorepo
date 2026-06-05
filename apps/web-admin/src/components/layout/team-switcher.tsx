"use client"

import * as React from "react"
import { ChevronsUpDown } from "lucide-react"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@workspace/ui/components/sidebar"
import { cn } from "@workspace/ui/lib/utils"

/**
 * Một workspace trong sidebar (bám roles trong `apps/server/config/rbac-v2.yaml`).
 * `plan` — dòng phụ mô tả phạm vi menu, hiển thị dưới tên workspace.
 */
export interface Team {
    name: string
    logo: React.ElementType
    plan: string
}

export function TeamSwitcher({
    teams,
    activeTeam,
    onTeamSelect,
}: {
    teams: Team[]
    activeTeam?: Team
    onTeamSelect?: (team: Team) => void
}) {
    const { isMobile } = useSidebar()
    // const [activeTeam, setActiveTeam] = React.useState(teams[0]) - Removed internal state

    if (!activeTeam) {
        return null
    }

    const canSwitch = teams.length > 1

    const triggerButton = (
        <SidebarMenuButton
            size="lg"
            className={cn(
                "transition-all duration-200",
                canSwitch && "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
                "group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center"
            )}
            disabled={!canSwitch}
        >
            <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg shadow-sm shrink-0">
                <activeTeam.logo className="size-4 shrink-0" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight ml-2 group-data-[collapsible=icon]:hidden">
                <span className="truncate font-sans font-semibold tracking-tight">{activeTeam.name}</span>
                <span className="truncate text-xs font-sans font-medium text-muted-foreground/60">{activeTeam.plan}</span>
            </div>
            {canSwitch ? (
                <ChevronsUpDown className="ml-auto opacity-50 group-data-[collapsible=icon]:hidden" />
            ) : null}
        </SidebarMenuButton>
    )

    return (
        <SidebarMenu>
            <SidebarMenuItem className="group-data-[collapsible=icon]:px-0">
                {canSwitch ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
                        <DropdownMenuContent
                            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg border-border/40"
                            align="start"
                            side={isMobile ? "bottom" : "right"}
                            sideOffset={4}
                        >
                            <DropdownMenuLabel className="text-muted-foreground/60 text-xs font-medium">
                                Chế độ menu (theo vai trò)
                            </DropdownMenuLabel>
                            {teams.map((team) => (
                                <DropdownMenuItem
                                    key={team.name}
                                    onClick={() => onTeamSelect?.(team)}
                                    className="gap-3 p-2 cursor-pointer transition-colors"
                                    aria-label={`Chuyển workspace ${team.name}`}
                                >
                                    <div className="flex size-6 items-center justify-center rounded-sm border border-border/20 bg-muted/20">
                                        <team.logo className="size-3.5 shrink-0" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-medium">{team.name}</span>
                                        <span className="text-[9px] text-muted-foreground/60">{team.plan}</span>
                                    </div>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : (
                    triggerButton
                )}
            </SidebarMenuItem>
        </SidebarMenu>
    )
}
