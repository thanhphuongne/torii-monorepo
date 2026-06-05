'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@workspace/ui/components/avatar'
import { Badge } from '@workspace/ui/components/badge'
import { CardContent } from '@workspace/ui/components/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@workspace/ui/components/table'
import { Trophy, Star, Flame, CalendarDays } from 'lucide-react'
import { cn } from '@workspace/ui/lib/utils'
import type { LeaderboardUserDTO } from '@workspace/schemas'
import { TrendIndicator } from './trend-indicator'
import { formatNumber } from '@/utils/format-utils'
import { dataTableHeaderClass } from '@/lib/ui-shell'

interface LeaderboardTableProps {
    users: LeaderboardUserDTO[]
    currentUserId?: string
    type: 'global' | 'streak' | 'active'
}

function StatIcon({ type }: { type: 'global' | 'streak' | 'active' }) {
    if (type === 'global') {
        return <Star className="size-4 shrink-0 fill-amber-500 text-amber-500" aria-hidden />
    }
    if (type === 'streak') {
        return <Flame className="size-4 shrink-0 fill-orange-500 text-orange-500" aria-hidden />
    }
    return <CalendarDays className="size-4 shrink-0 fill-primary/20 text-primary" aria-hidden />
}

function formatStat(item: LeaderboardUserDTO, type: 'global' | 'streak' | 'active') {
    if (type === 'global') return formatNumber(item.xp)
    if (type === 'streak') return formatNumber(item.currentStreak ?? 0)
    return formatNumber(item.totalActiveDays ?? 0)
}

export function LeaderboardTable({ users, currentUserId, type }: LeaderboardTableProps) {
    return (
        <div className="overflow-hidden rounded-xl border border-border/50 bg-card">
            <CardContent className="p-0">
                {users.length === 0 ? (
                    <div className="px-4 py-12 text-center sm:py-14">
                        <Trophy className="mx-auto mb-3 size-10 text-muted-foreground/30" aria-hidden />
                        <p className="text-sm text-muted-foreground">
                            Chưa có dữ liệu bảng xếp hạng.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Mobile List View */}
                        <ul className="divide-y divide-border md:hidden" aria-label="Danh sách xếp hạng">
                            {users.map((item) => {
                                const isMe = item.id === currentUserId
                                const isRank1 = item.rank === 1
                                const isRank2 = item.rank === 2
                                const isRank3 = item.rank === 3
                                return (
                                    <li
                                        key={item.id}
                                        className={cn(
                                            'flex items-center gap-3 px-3 py-2.5',
                                            isMe && 'bg-primary/[0.03]',
                                        )}
                                    >
                                        <span className={cn(
                                            "w-7 shrink-0 text-center text-sm font-medium tabular-nums",
                                            isRank1 ? "text-amber-500" : isRank2 ? "text-slate-400" : isRank3 ? "text-orange-500" : "text-muted-foreground/30"
                                        )}>
                                            {item.rank}
                                        </span>
                                        <div className="relative shrink-0">
                                            <Avatar className={cn(
                                                "size-10 border",
                                                isRank1 ? "border-amber-400/50" : isRank2 ? "border-slate-400/50" : isRank3 ? "border-orange-500/50" : "border-border"
                                            )}>
                                                <AvatarImage src={item.avatarUrl ?? undefined} />
                                                <AvatarFallback className="text-sm font-medium">
                                                    {item.displayName.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                            {isMe && (
                                                <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-background bg-primary" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex min-w-0 items-center gap-2">
                                                <h4 className="truncate text-sm leading-tight">{item.displayName}</h4>
                                                {isMe && (
                                                    <Badge
                                                        variant="outline"
                                                        className="h-4 shrink-0 border-primary/20 bg-primary/5 px-1.5 text-[8px] text-primary"
                                                    >
                                                        Bạn
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-muted-foreground leading-none mt-1">Cấp {item.level}</p>
                                        </div>
                                        <div className="flex shrink-0 flex-col items-end gap-1">
                                            <div className="flex items-center gap-1">
                                                <StatIcon type={type} />
                                                <span className="text-sm font-medium tabular-nums">
                                                    {formatStat(item, type)}
                                                </span>
                                            </div>
                                            <TrendIndicator change={Math.floor(Math.random() * 3) - 1} />
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>

                        {/* Desktop Table View */}
                        <div className="hidden overflow-x-auto md:block">
                            <Table>
                                <TableHeader className={dataTableHeaderClass}>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-[80px] pl-6 lg:pl-8 text-[11px] text-muted-foreground text-center">Hạng</TableHead>
                                        <TableHead className="text-[11px] text-muted-foreground">Học viên</TableHead>
                                        <TableHead className="text-right text-[11px] text-muted-foreground">Thành tích</TableHead>
                                        <TableHead className="w-[100px] pr-6 text-right lg:pr-8 text-[11px] text-muted-foreground">Xu hướng</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((item) => {
                                        const isRank1 = item.rank === 1
                                        const isRank2 = item.rank === 2
                                        const isRank3 = item.rank === 3
                                        const isMe = item.id === currentUserId
                                        
                                        return (
                                            <TableRow
                                                key={item.id}
                                                className={cn(
                                                    'group h-12',
                                                    isMe && 'bg-primary/[0.02]',
                                                )}
                                            >
                                                <TableCell className="pl-6 lg:pl-8">
                                                    <div className="flex items-center justify-center w-8 mx-auto">
                                                        <span className={cn(
                                                            "text-sm font-medium tabular-nums transition-colors",
                                                            isRank1 ? "text-amber-500" : 
                                                            isRank2 ? "text-slate-400" : 
                                                            isRank3 ? "text-orange-500" : 
                                                            "text-muted-foreground/30 group-hover:text-foreground"
                                                        )}>
                                                            {item.rank}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative">
                                                            <Avatar className={cn(
                                                                "size-8 border",
                                                                isRank1 ? "border-amber-400/50" : 
                                                                isRank2 ? "border-slate-400/50" : 
                                                                isRank3 ? "border-orange-500/50" : 
                                                                "border-border group-hover:border-primary/20"
                                                            )}>
                                                                <AvatarImage src={item.avatarUrl ?? undefined} />
                                                                <AvatarFallback className="font-medium text-[10px]">
                                                                    {item.displayName.charAt(0)}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            {isMe && (
                                                                <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full border border-background bg-primary" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="text-sm group-hover:text-primary transition-colors truncate">
                                                                    {item.displayName}
                                                                </h4>
                                                                {isMe && (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="h-4 border-primary/20 bg-primary/5 text-[8px] font-bold text-primary px-1"
                                                                    >
                                                                        Bạn
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <p className="text-[10px] text-muted-foreground leading-none mt-1">
                                                                Cấp {item.level}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <StatIcon type={type} />
                                                        <span className={cn(
                                                            "text-sm font-medium tabular-nums text-foreground/80",
                                                            isMe && "text-primary/70"
                                                        )}>
                                                            {formatStat(item, type)}
                                                        </span>
                                                        <span className="text-[9px] text-muted-foreground hidden lg:inline">
                                                            {type === 'global' ? 'XP' : 'Ngày'}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="pr-6 text-right lg:pr-8">
                                                    <TrendIndicator change={Math.floor(Math.random() * 3) - 1} />
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </>
                )}
            </CardContent>
        </div>
    )
}
