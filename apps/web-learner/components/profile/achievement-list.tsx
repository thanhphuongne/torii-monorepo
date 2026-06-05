'use client'

import { AchievementCard } from './achievement-card'
import { Trophy, Award, Zap, Star } from 'lucide-react'
import { cn } from '@workspace/ui/lib/utils'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@workspace/ui/components/empty'
import { Separator } from '@workspace/ui/components/separator'
import { Button } from '@workspace/ui/components/button'

interface AchievementListProps {
    achievements: any[]
}

export function AchievementList({ achievements }: AchievementListProps) {
    if (!achievements || achievements.length === 0) {
        return (
            <div className="py-12">
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon" className="mb-4">
                            <Trophy className="size-8 text-muted-foreground/40" />
                        </EmptyMedia>
                        <EmptyTitle className="text-lg font-bold">Chưa có thành tích nào</EmptyTitle>
                        <EmptyDescription className="text-sm text-muted-foreground max-w-xs">
                            Học tập chăm chỉ để nhận được những huy hiệu danh giá đầu tiên nhé!
                        </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                        <Button variant="outline" className="h-9 px-4 font-bold border-dashed hover:border-solid transition-all">
                            Bắt đầu học ngay
                        </Button>
                    </EmptyContent>
                </Empty>
            </div>
        )
    }

    // Grouping achievements by category for better organization
    const groups = [
        { title: 'Chuỗi học tập', category: 'STREAK', icon: Zap, color: 'text-orange-500' },
        { title: 'Tiến độ học tập', category: 'LEARNING_PROGRESS', icon: Award, color: 'text-blue-500' },
        { title: 'Thành thạo', category: 'MASTERY', icon: Star, color: 'text-purple-500' },
        { title: 'Tính kiên trì', category: 'CONSISTENCY', icon: Trophy, color: 'text-amber-500' },
    ]

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {groups.map((group) => {
                const groupAchievements = achievements.filter(
                    a => a.achievement.category === group.category
                )

                if (groupAchievements.length === 0) return null

                return (
                    <div key={group.category} className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className={cn("p-2 rounded-xl bg-background border shadow-sm", group.color)}>
                                <group.icon className="size-5" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">
                                    {group.title}
                                </h3>
                                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-normal"> Danh hiệu {group.title.toLowerCase()} </p>
                            </div>
                            <Separator className="flex-1" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {groupAchievements.map((achievement) => (
                                <AchievementCard
                                    key={achievement.id}
                                    achievement={achievement}
                                />
                            ))}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
