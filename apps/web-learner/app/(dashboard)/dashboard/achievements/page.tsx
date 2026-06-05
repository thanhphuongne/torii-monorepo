'use client'

import { useAchievements } from '@/lib/api/services/gamification-api'
import { formatDate } from '@/utils/format-utils'
import { Card, CardContent } from '@workspace/ui/components/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import { Badge } from '@workspace/ui/components/badge'
import { Progress } from '@workspace/ui/components/progress'
import { cn } from '@workspace/ui/lib/utils'
import { Empty, EmptyContent, EmptyDescription, EmptyMedia, EmptyTitle } from '@workspace/ui/components/empty';
import { Award, Trophy, Star, GraduationCap, Heart, Target, Flame, Calendar, TrendingUp, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PageLoading } from '@workspace/ui/components/page-loading'
import type { AchievementCategory } from '@workspace/schemas'

// Map achievement icons
const achievementIconMap: Record<string, any> = {
    Heart,
    Trophy,
    Star,
    GraduationCap,
    Award,
    Target,
    Flame,
    Calendar,
    TrendingUp,
    Zap,
}

// Category labels
const categoryLabels: Record<AchievementCategory, string> = {
    STREAK: 'Chuỗi học tập',
    CONSISTENCY: 'Kiên trì',
    LEARNING_PROGRESS: 'Tiến bộ học tập',
    RECOVERY: 'Phục hồi',
    SOCIAL: 'Xã hội',
    MASTERY: 'Thành thạo',
}

export default function AchievementsPage() {
    const { data: achievementsData, isLoading } = useAchievements()
    const [selectedCategory, setSelectedCategory] = useState<string>('ALL')

    // Process achievements data
    const achievements = useMemo(() => {
        if (!achievementsData) return []
        return achievementsData.map((achievement) => {
            return {
                id: achievement.id,
                title: achievement.achievement.title,
                description: achievement.achievement.description,
                category: achievement.achievement.category,
                icon: achievement.achievement.icon || 'Award',
                earned: achievement.isUnlocked,
                date: achievement.unlockedAt ? formatDate(achievement.unlockedAt) : null,
                progress: achievement.progress,
            }
        })
    }, [achievementsData])

    // Filter by category
    const filteredAchievements = useMemo(() => {
        if (selectedCategory === 'ALL') return achievements
        return achievements.filter(a => a.category === selectedCategory)
    }, [achievements, selectedCategory])

    // Calculate stats
    const stats = useMemo(() => {
        const total = achievements.length
        const earned = achievements.filter(a => a.earned).length
        const percentage = total > 0 ? Math.round((earned / total) * 100) : 0
        return { total, earned, remaining: total - earned, percentage }
    }, [achievements])

    // Get unique categories
    const categories = useMemo(() => {
        const cats = new Set(achievements.map(a => a.category))
        return Array.from(cats) as AchievementCategory[]
    }, [achievements])

    if (isLoading) {
        return <PageLoading />
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-8">
            {/* Standard Header */}
            <div className="space-y-4 pb-8 border-b border-border">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Thành tựu học tập</h1>
                <p className="text-sm font-medium text-muted-foreground w-full max-w-xl">
                    Theo dõi tiến trình và những cột mốc quan trọng bạn đã chinh phục trong hành trình chinh phục tiếng Nhật của mình.
                </p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="shadow-none border-border/40 bg-card rounded-xl group hover:bg-muted/5 transition-colors">
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight leading-none">
                                Tổng cộng
                            </p>
                            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                                {stats.total}
                            </p>
                        </div>
                        <div className="size-9 rounded-xl bg-primary/5 flex items-center justify-center text-primary border border-primary/10 shrink-0">
                            <Trophy className="size-4" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-none border-border/40 bg-card rounded-xl group hover:bg-muted/5 transition-colors">
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight leading-none">
                                Đã đạt
                            </p>
                            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                                {stats.earned}
                            </p>
                        </div>
                        <div className="size-9 rounded-xl bg-primary/5 flex items-center justify-center text-primary border border-primary/10 shrink-0">
                            <Star className="size-4" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-none border-border/40 bg-card rounded-xl group hover:bg-muted/5 transition-colors">
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight leading-none">
                                Còn lại
                            </p>
                            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                                {stats.remaining}
                            </p>
                        </div>
                        <div className="size-9 rounded-xl bg-primary/5 flex items-center justify-center text-primary border border-primary/10 shrink-0">
                            <Target className="size-4" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-none border-border/40 bg-card rounded-xl group hover:bg-muted/5 transition-colors">
                    <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight leading-none">
                                    Hoàn thành
                                </p>
                                <p className="mt-1 text-2xl font-bold tabular-nums text-primary">
                                    {stats.percentage}%
                                </p>
                            </div>
                            <div className="size-9 rounded-xl bg-primary/5 flex items-center justify-center text-primary border border-primary/10 shrink-0">
                                <TrendingUp className="size-4" />
                            </div>
                        </div>
                        <Progress value={stats.percentage} className="h-1.5 bg-muted/30" />
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="ALL" className="w-full space-y-6" onValueChange={setSelectedCategory}>
                <TabsList className="bg-muted/50 p-1 h-auto flex-wrap justify-start border-none">
                    <TabsTrigger value="ALL" className="px-4 py-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">Tất cả</TabsTrigger>
                    {categories.map((category) => (
                        <TabsTrigger 
                            key={category} 
                            value={category}
                            className="px-4 py-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
                        >
                            {categoryLabels[category]}
                        </TabsTrigger>
                    ))}
                </TabsList>

                <TabsContent value={selectedCategory} className="mt-0 outline-none">
                    {filteredAchievements.length > 0 ? (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {filteredAchievements.map((achievement) => (
                                <Card
                                    key={achievement.id}
                                    className={cn(
                                        "transition-all duration-300 shadow-none border-border/40 rounded-xl bg-card hover:bg-muted/5 group",
                                        !achievement.earned && "opacity-40"
                                    )}
                                >
                                    <CardContent className="p-3 flex items-start gap-2.5">
                                        <div className={cn(
                                            "size-8 rounded-lg flex items-center justify-center shrink-0 border border-border/40 group-hover:border-primary/20 transition-colors",
                                            achievement.earned 
                                                ? "bg-primary/5 text-primary/60" 
                                                : "bg-muted/20 text-muted-foreground/30"
                                        )}>
                                            {achievement.icon.startsWith('http') ? (
                                                <img src={achievement.icon} alt={achievement.title} className="size-full object-contain p-1" />
                                            ) : (() => {
                                                const Icon = achievementIconMap[achievement.icon] || Award;
                                                return <Icon className="size-3.5" />;
                                            })()}
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <div className="space-y-0.5">
                                                <h3 className="text-xs font-bold text-foreground leading-tight">
                                                    {achievement.title}
                                                </h3>
                                                <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
                                                    {achievement.description}
                                                </p>
                                            </div>
                                            {achievement.earned && achievement.date && (
                                                <div className="pt-1 flex items-center gap-1.5 text-xs text-muted-foreground leading-none">
                                                    <Calendar className="size-3.5 text-primary/60" />
                                                    {achievement.date}
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Empty className="py-20 border-2 border-dashed rounded-2xl">
                            <EmptyMedia>
                                <Trophy className="size-10 text-muted-foreground/30" />
                            </EmptyMedia>
                            <EmptyContent>
                                <EmptyTitle className="text-lg">
                                    Không có thành tích nào
                                </EmptyTitle>
                                <EmptyDescription className="text-sm">
                                    {selectedCategory === 'ALL'
                                        ? 'Bắt đầu học tập để mở khóa thành tích đầu tiên!'
                                        : 'Không có thành tích nào trong danh mục này'}
                                </EmptyDescription>
                            </EmptyContent>
                        </Empty>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
