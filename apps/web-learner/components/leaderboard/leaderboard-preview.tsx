'use client'

import { ArrowRight, Star, Trophy } from 'lucide-react'
import Link from 'next/link'
import type { LeaderboardDTO } from '@workspace/schemas'
import { Avatar, AvatarFallback, AvatarImage } from '@workspace/ui/components/avatar'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@workspace/ui/components/item'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { cn } from '@workspace/ui/lib/utils'

interface LeaderboardPreviewProps {
    data?: LeaderboardDTO
    isLoading?: boolean
}

export function LeaderboardPreview({ data, isLoading }: LeaderboardPreviewProps) {
    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-10 w-full rounded-xl" />
                    ))}
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                    <Trophy className="size-4 text-warning" />
                    <CardTitle className="text-sm font-bold">Bảng xếp hạng</CardTitle>
                </div>
                <Button asChild variant="link" size="sm" className="text-xs">
                    <Link href="/dashboard/leaderboard">
                        Xem tất cả
                        <ArrowRight className="ml-1 size-3" />
                    </Link>
                </Button>
            </CardHeader>

            <CardContent className="space-y-3">
                {data?.users?.slice(0, 5).map((item, idx) => (
                    <Item key={item.id} size="xs" className="hover:bg-muted/50">
                        <ItemMedia>
                            <span
                                className={cn(
                                    'w-5 text-center text-xs font-bold',
                                    idx === 0 ? 'text-warning' : idx === 1 ? 'text-muted-foreground' : idx === 2 ? 'text-orange-600' : 'text-muted-foreground/50',
                                )}
                            >
                                {idx + 1}
                            </span>
                            <Avatar className="size-7 shrink-0">
                                <AvatarImage src={item.avatarUrl ?? undefined} alt="" />
                                <AvatarFallback>{item.displayName.charAt(0)}</AvatarFallback>
                            </Avatar>
                        </ItemMedia>
                        <ItemContent>
                            <ItemTitle className="text-xs font-bold">
                                {item.displayName}
                            </ItemTitle>
                        </ItemContent>
                        <ItemActions>
                            <Star className="size-3 fill-warning text-warning" />
                            <span className="text-xs font-bold tabular-nums">{item.xp}</span>
                        </ItemActions>
                    </Item>
                ))}

                {data?.currentUser && data.currentUser.rank > 5 && (
                    <>
                        <div className="flex justify-center py-1">
                            <div className="mx-0.5 size-1 rounded-full bg-border" />
                            <div className="mx-0.5 size-1 rounded-full bg-border" />
                            <div className="mx-0.5 size-1 rounded-full bg-border" />
                        </div>
                        <Item size="xs" variant="outline" className="border-primary/10 bg-primary/5">
                            <ItemMedia>
                                <span className="w-5 text-center text-xs font-bold text-primary">
                                    {data.currentUser.rank}
                                </span>
                            </ItemMedia>
                            <ItemContent>
                                <ItemTitle className="text-xs font-bold">Bạn</ItemTitle>
                            </ItemContent>
                            <ItemActions>
                                <Star className="size-3 fill-warning text-warning" />
                                <span className="text-xs font-bold tabular-nums">{data.currentUser.xp}</span>
                            </ItemActions>
                        </Item>
                    </>
                )}
            </CardContent>
        </Card>
    )
}
