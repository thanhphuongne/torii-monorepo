"use client"

import {
    BadgeCheck,
    Settings,
    ChevronsUpDown,
    LogOut,
} from "lucide-react"
import { useNavigate } from "react-router-dom"

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@workspace/ui/components/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@workspace/ui/components/sidebar"
import { useAppDispatch } from "@/hooks/hooks"
import { logout } from "@/store/slices/auth-slice"
import { toast } from "@workspace/ui/components/sonner"
import { cn } from "@workspace/ui/lib/utils"

const ROLE_LABELS: Record<string, string> = {
    "admin": 'Quản trị viên',
    "lecturer": 'Giảng viên',
    "learner": 'Học viên',
    "staff-academic": 'Phụ trách Học thuật',
    "staff-operations": 'Phụ trách Vận hành',
}

export function NavUser({
    user,
}: {
    user: {
        displayName: string
        email: string
        avatarUrl?: string
        role?: string
    }
}) {
    const { isMobile } = useSidebar()
    const dispatch = useAppDispatch()
    const navigate = useNavigate()

    const handleLogout = async () => {
        try {
            await dispatch(logout()).unwrap()
            toast.success('Đã đăng xuất thành công')
            navigate('/login', { replace: true })
        } catch (error) {
            toast.error('Đăng xuất không thành công, nhưng bạn đã được đăng xuất cục bộ')
            navigate('/login', { replace: true })
        }
    }

    return (
        <SidebarMenu>
            <SidebarMenuItem className="group-data-[collapsible=icon]:px-0">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className={cn(
                                "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground transition-all duration-200",
                                "group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center"
                            )}
                        >
                            <div className="relative shrink-0 flex items-center justify-center">
                                <Avatar className="h-8 w-8 rounded-lg group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8">
                                    <AvatarImage src={user.avatarUrl} alt={user.displayName} />
                                    <AvatarFallback className="rounded-lg bg-primary text-primary-foreground text-xs font-semibold">
                                        {user.displayName?.[0]?.toUpperCase() || "U"}
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                            <div className="grid flex-1 text-left text-sm leading-tight ml-2 group-data-[collapsible=icon]:hidden">
                                <span className="truncate font-semibold">{user.displayName || 'Người quản trị'}</span>
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <span className="truncate text-xs">{(user.role && ROLE_LABELS[user.role]) || user.role || 'Quản trị viên'}</span>
                                </div>
                            </div>
                            <ChevronsUpDown className="ml-auto size-4 opacity-50 group-data-[collapsible=icon]:hidden" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                        side={isMobile ? "bottom" : "right"}
                        align="end"
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="p-0 font-normal">
                            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                <Avatar className="h-8 w-8 rounded-lg">
                                    <AvatarImage src={user.avatarUrl} alt={user.displayName} />
                                    <AvatarFallback className="rounded-lg bg-primary text-primary-foreground text-xs font-semibold">
                                        {user.displayName?.[0]?.toUpperCase() || "U"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">{user.displayName}</span>
                                    <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                                </div>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/profile')}>
                                <BadgeCheck className="size-4 mr-2 text-muted-foreground" />
                                Tài khoản
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/settings')}>
                                <Settings className="size-4 mr-2 text-muted-foreground" />
                                Cấu hình
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="cursor-pointer text-destructive focus:text-destructive"
                            onClick={handleLogout}
                        >
                            <LogOut className="size-4 mr-2" />
                            Đăng xuất
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}
