'use client'

import { CardContent } from '@workspace/ui/components/card'
import { Avatar, AvatarFallback, AvatarImage } from '@workspace/ui/components/avatar'
import { Star, Flame, CalendarDays } from 'lucide-react'
import type { LeaderboardUserDTO } from '@workspace/schemas'
import { formatNumber } from '@/utils/format-utils'

interface CurrentUserRankProps {
    user: LeaderboardUserDTO
    type: 'global' | 'streak' | 'active'
}

export function CurrentUserRank({ user, type }: CurrentUserRankProps) {
    return (
        <div className="mb-6 overflow-hidden rounded-xl border border-border/50 bg-card md:mb-10">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-4">
                <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="size-11 shrink-0 border-2 border-border sm:h-12 sm:w-12">
                            <AvatarImage src={user.avatarUrl || ''} />
                            <AvatarFallback className="bg-muted/30 font-bold text-foreground">
                                {user.displayName.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <h3 className="text-sm font-bold leading-tight sm:text-base md:text-lg">
                                Bạn · Thứ hạng hiện tại
                            </h3>
                            <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground sm:text-sm">
                                {user.displayName}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-stretch justify-between gap-6 border-t border-border/50 pt-4 sm:border-t-0 sm:pt-0">
                    <div className="flex flex-col items-center justify-center text-center">
                        <p className="text-[10px] font-semibold text-muted-foreground/60">
                            Cấp độ
                        </p>
                        <p className="text-lg font-bold text-foreground tabular-nums">{user.level}</p>
                    </div>
                    <div className="flex flex-col items-center justify-center text-center">
                        <p className="text-[10px] font-semibold text-muted-foreground/60">
                            {type === 'global' ? 'Kinh nghiệm' : type === 'streak' ? 'Chuỗi học' : 'Hoạt động'}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                            {type === 'global' ? (
                                <Star className="size-4 shrink-0 fill-amber-500 text-amber-500" aria-hidden />
                            ) : type === 'streak' ? (
                                <Flame className="size-4 shrink-0 fill-orange-500 text-orange-500" aria-hidden />
                            ) : (
                                <CalendarDays className="size-4 shrink-0 fill-primary text-primary" aria-hidden />
                            )}
                            <p className="text-lg font-bold tabular-nums text-foreground">
                                {type === 'global'
                                    ? formatNumber(user.xp)
                                    : type === 'streak'
                                      ? formatNumber(user.currentStreak ?? 0)
                                      : formatNumber(user.totalActiveDays ?? 0)}
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </div>
    )
}
