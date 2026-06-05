'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@workspace/ui/components/avatar'
import { Crown, Star, Flame, CalendarDays } from 'lucide-react'
import { cn } from '@workspace/ui/lib/utils'
import type { LeaderboardUserDTO } from '@workspace/schemas'
import { formatNumber } from '@/utils/format-utils'

interface PodiumCardProps {
    user: LeaderboardUserDTO
    rank: number
    isCurrentUser: boolean
    type: 'global' | 'streak' | 'active'
}

export function PodiumCard({ user, rank, isCurrentUser, type }: PodiumCardProps) {
    const isFirst = rank === 1
    const isSecond = rank === 2
    const isThird = rank === 3
    const isTopThree = isFirst || isSecond || isThird

    return (
        <div
            className={cn(
                'flex flex-col items-center gap-4 transition-all duration-300',
                isFirst
                    ? 'order-2 z-10 md:mb-10 px-1 sm:px-2'
                    : isSecond
                      ? 'order-1'
                        : 'order-3',
            )}
        >
            <div className="relative group">
                {isFirst && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2">
                        <Crown className="size-7 text-primary/30 transition-colors group-hover:text-primary/50" />
                    </div>
                )}

                <div
                    className={cn(
                        'rounded-full border-2 p-0 transition-all duration-300 bg-background',
                        isFirst
                            ? 'border-amber-400 scale-105'
                            : isSecond
                                ? 'border-slate-400'
                                : isThird
                                    ? 'border-orange-400'
                                    : 'border-border',
                    )}
                >
                    <Avatar
                        className={cn(
                            // Wrapper đã chịu border => chỉ giữ 1 đường viền.
                            // Avatar component tự vẽ after-border mặc định, nên đổi về transparent để không “thêm viền”.
                            'shadow-none relative after:border-0 after:border-transparent border-0',
                            isFirst
                                ? 'size-20 md:size-26'
                                : isSecond
                                    ? 'size-16 md:size-22'
                                    : 'size-16 md:size-22',
                        )}
                    >
                        <AvatarImage src={user.avatarUrl ?? undefined} className="group-hover:scale-105 transition-transform duration-700" />
                        <AvatarFallback className="text-lg font-semibold text-muted-foreground/50">
                            {user.displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                </div>

                <div
                    className={cn(
                        'absolute -bottom-2 left-1/2 flex -translate-x-1/2 items-center justify-center rounded-full border font-bold tabular-nums transition-all',
                        isFirst 
                            ? 'size-8 bg-background border-amber-400 text-amber-600 text-sm'
                            : isSecond
                                ? 'size-7 bg-background border-slate-400 text-slate-600 text-[10px]'
                                : 'size-7 bg-background border-orange-400 text-orange-500 text-[10px]',
                    )}
                >
                    {rank}
                </div>
            </div>

            <div className="flex flex-col items-center text-center w-full px-1 space-y-2">
                <div className="space-y-1">
                    <div className="flex w-full items-center justify-center gap-1.5 min-w-0">
                        <h3
                            className={cn(
                                'truncate font-bold tracking-tight text-foreground/80',
                                isFirst ? 'text-sm md:text-base' : 'text-xs md:text-sm',
                            )}
                            title={user.displayName}
                        >
                            {user.displayName}
                        </h3>
                        {isCurrentUser && (
                            <div className="size-2 shrink-0 rounded-full bg-primary/40 ring-4 ring-primary/10" title="YOU" />
                        )}
                    </div>
                    <p className="text-[10px] font-semibold text-muted-foreground/50 leading-none">Cấp {user.level}</p>
                </div>

                <div
                    className={cn(
                        'flex items-center gap-1.5 px-2 py-1 sm:gap-2 sm:px-3 sm:py-1.5',
                        !isTopThree && 'rounded-lg border border-border/50 bg-card',
                        isFirst && !isTopThree && 'border-primary/30',
                    )}
                >
                    {type === 'global' ? (
                        <Star className="size-3.5 text-amber-500/30" />
                    ) : type === 'streak' ? (
                        <Flame className="size-3.5 text-orange-500/30" />
                    ) : (
                        <CalendarDays className="size-3.5 text-primary/30" />
                    )}
                    <span className={cn(
                        "font-bold tabular-nums tracking-tight",
                        isFirst ? "text-sm sm:text-base text-primary/70" : "text-xs sm:text-sm text-foreground/60"
                    )}>
                        {type === 'global' 
                            ? formatNumber(user.xp) 
                            : type === 'streak' 
                                ? formatNumber(user.currentStreak ?? 0)
                                : formatNumber(user.totalActiveDays ?? 0)}
                    </span>
                    <span className="text-[10px] font-semibold text-muted-foreground/40">
                        {type === 'global' ? 'XP' : type === 'streak' ? 'Ngày' : 'Ngày'}
                    </span>
                </div>
            </div>
        </div>
    )
}
