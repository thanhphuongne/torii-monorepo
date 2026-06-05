import * as React from 'react'
import { useState } from 'react'
import { LogOut, BadgeCheck, Bell, Flame, Snowflake, Zap, Gem, Coins, Target } from 'lucide-react'
import { SidebarTrigger } from '@workspace/ui/components/sidebar'
import { NotificationsDropdown } from '../dashboard/notifications-dropdown'
import { ModeToggle } from './mode-toggle'
import { useAppSelector, useAppDispatch } from '@/hooks/hooks'
import { useRouter } from 'next/navigation'
import { logout } from '@/store/slices/authSlice'
import { formatNumber } from '@/utils/format-utils'
import Link from 'next/link'
import { toast } from '@workspace/ui/components/sonner'
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
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@workspace/ui/components/avatar"
import { Button } from '@workspace/ui/components/button'
import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"
import { useGamificationProfile, useStreak } from '@/lib/api/services/gamification-api'
import { useWalletBalance } from '@/lib/api/services/wallet-api'
import { Progress } from '@workspace/ui/components/progress'
import { JlptGoalDialog } from '@/components/onboarding/jlpt-goal-dialog'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@workspace/ui/components/tooltip"

import { QuotaIndicator } from '../ai-sensei/quota-indicator'

type DashboardHeaderProps = {
    onOpenStreakModal?: () => void
}

export function DashboardHeader({ onOpenStreakModal }: DashboardHeaderProps) {
    const { user } = useAppSelector((state) => state.auth)
    const { data: profile } = useGamificationProfile()
    const { data: streak } = useStreak()
    const { data: walletBalance } = useWalletBalance()
    const dispatch = useAppDispatch()
    const router = useRouter()
    const [goalOpen, setGoalOpen] = useState(false)

    const handleLogout = async () => {
        try {
            await dispatch(logout()).unwrap()
            toast.success("Đăng xuất thành công")
            router.push('/login')
        } catch (error) {
            toast.error("Lỗi khi đăng xuất")
            router.push('/login')
        }
    }

    // Modal set mục tiêu JLPT được dùng chung qua component JlptGoalDialog

    // Level & XP Progress logic (align with gamification profile UI)
    // Non-linear: L1->2=200, L2->3=300, L3->4=400, ...
    // currentXp from backend is now the XP accumulated in the current level.
    const level = profile?.level ?? 1
    const currentXpInLevel = profile?.currentXp ?? 0
    const xpNeededForThisRange = 100 * (level + 1)
    const progress = Math.min(100, Math.max(0, (currentXpInLevel / xpNeededForThisRange) * 100))
    const isActiveToday = streak?.isActiveToday === true

    return (
        <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md">
            <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-6">
                {/* Left: Trigger */}
                <div className="flex items-center gap-4 flex-1">
                    <SidebarTrigger />
                </div>

                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                    <div className="flex items-center gap-1">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="rounded-xl"
                                        onClick={() => setGoalOpen(true)}
                                    >
                                        <Target className="size-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Đặt mục tiêu JLPT</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <QuotaIndicator />
                        <NotificationsDropdown />
                        <ModeToggle />
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-full">
                                <Avatar className="h-8 w-8 hover:ring-2 ring-primary/20 transition-all">
                                    <AvatarImage src={user?.avatarUrl || undefined} alt={user?.displayName || 'Avatar'} />
                                    <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                                        {user?.displayName?.[0]?.toUpperCase() || 'U'}
                                    </AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-64 p-2 shadow-xl border-border/50" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal px-2 pb-3">
                                <div className="flex flex-col space-y-2">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-bold leading-none">{user?.displayName || 'Người dùng'}</p>
                                        <p className="text-xs leading-none text-muted-foreground font-medium truncate">
                                            {user?.email}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 pt-1">
                                        <Badge variant="secondary" className="text-[10px] py-0 px-2 h-4 font-bold uppercase tracking-wider bg-primary/10 text-primary border-none">
                                            LV.{level}
                                        </Badge>
                                        <Badge variant="secondary" className="text-[10px] py-0 px-2 h-4 font-bold uppercase tracking-wider bg-muted text-muted-foreground border-none">
                                            {user?.role === 'learner' ? 'Học viên' : user?.role}
                                        </Badge>
                                    </div>
                                </div>
                            </DropdownMenuLabel>
                            <div className="px-2 pb-2">
                                <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Flame className={cn("size-4", isActiveToday ? "text-orange-500" : "text-muted-foreground")} />
                                            <span className="text-xs font-bold">Streak</span>
                                        </div>
                                        <button
                                            type="button"
                                            className="text-xs font-bold text-primary hover:underline"
                                            onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                onOpenStreakModal?.()
                                            }}
                                        >
                                            🔥 {streak?.currentStreak || 0}
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Zap className="size-4 text-primary" />
                                            <span className="text-xs font-bold">XP</span>
                                        </div>
                                        <span className="text-xs font-bold">{formatNumber(profile?.totalXp || 0)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Gem className="size-4 text-cyan-600" />
                                            <span className="text-xs font-bold">Điểm</span>
                                        </div>
                                        <span className="text-xs font-bold">{formatNumber(profile?.points || 0)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Snowflake className={cn("size-4", (profile?.freezeCount || 0) > 0 ? "text-blue-500" : "text-muted-foreground")} />
                                            <span className="text-xs font-bold">Freeze</span>
                                        </div>
                                        <span className="text-xs font-bold">{profile?.freezeCount || 0}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Coins className="size-4 text-amber-600" />
                                            <span className="text-xs font-bold">Coins</span>
                                        </div>
                                        <span className="text-xs font-bold">{formatNumber(walletBalance || 0)}</span>
                                    </div>
                                </div>
                            </div>
                            <DropdownMenuSeparator className="mx-2 mb-2" />
                            <DropdownMenuGroup className="space-y-1">
                                <DropdownMenuItem className="cursor-pointer py-2 font-medium" onClick={() => router.push('/dashboard/settings')}>
                                    <BadgeCheck className="mr-3 size-4 text-primary" />
                                    <span>Cài đặt cá nhân</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer py-2 font-medium" onClick={() => router.push('/dashboard/notifications')}>
                                    <Bell className="mr-3 size-4 text-muted-foreground" />
                                    <span>Thông báo</span>
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator className="mx-2 my-2" />
                            <DropdownMenuItem
                                onClick={handleLogout}
                                className="cursor-pointer text-destructive focus:bg-destructive focus:text-destructive-foreground py-2 font-medium"
                            >
                                <LogOut className="mr-3 size-4" />
                                <span>Đăng xuất</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <JlptGoalDialog open={goalOpen} onOpenChange={setGoalOpen} />
        </header >
    )
}
