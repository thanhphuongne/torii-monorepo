"use client"

import * as React from 'react'
import { useAppSelector } from '@/hooks/hooks'
import { useGamificationProfile, useAchievements, useStreak } from '@/lib/api/services/gamification-api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@workspace/ui/components/card'
import { Button } from '@workspace/ui/components/button'
import { Badge } from '@workspace/ui/components/badge'
import { Progress } from '@workspace/ui/components/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@workspace/ui/components/avatar'
import { ScrollArea } from '@workspace/ui/components/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@workspace/ui/components/dialog'
import Link from 'next/link'
import { JlptGoalDialog } from '@/components/onboarding/jlpt-goal-dialog'
import {
    Award,
    Trophy,
    Calendar,
    Target,
    GraduationCap,
    Clock,
    Flag,
    User,
    Shield,
    Star,
    Heart,
    Zap,
    Flame,
    TrendingUp
} from 'lucide-react'
import { formatDate, formatNumber } from '@/utils/format-utils'

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

const categoryLabels: Record<string, string> = {
    STREAK: 'Chuỗi học tập',
    CONSISTENCY: 'Kiên trì',
    LEARNING_PROGRESS: 'Tiến bộ học tập',
    RECOVERY: 'Phục hồi',
    SOCIAL: 'Xã hội',
    MASTERY: 'Thành thạo',
}

const requirementTypeLabels: Record<string, string> = {
    type: 'Loại điều kiện',
    value: 'Giá trị mục tiêu',
    days: 'Số ngày',
    lessons: 'Số bài học',
    points: 'Điểm thưởng',
    xp: 'Kinh nghiệm (XP)',
    status: 'Trạng thái',
}

const requirementValueLabels: Record<string, string> = {
    LONGEST_STREAK: 'Chuỗi ngày dài nhất',
    CURRENT_STREAK: 'Chuỗi ngày hiện tại',
    TOTAL_XP: 'Tổng kinh nghiệm',
    COMPLETED_LESSONS: 'Bài học đã hoàn thành',
    STREAK_PROTECTION: 'Bảo vệ chuỗi',
}

export default function ProfilePage() {
    const { user } = useAppSelector((state) => state.auth)
    const { data: gamification } = useGamificationProfile()
    const { data: streak } = useStreak()
    const { data: achievementsData } = useAchievements()
    const [goalOpen, setGoalOpen] = React.useState(false)
    const [selectedAchievement, setSelectedAchievement] = React.useState<any | null>(null)

    const currentXpProgress = React.useMemo(() => {
        if (!gamification) return 0
        const max = 100 * (gamification.level + 1)
        return Math.floor((gamification.currentXp / max) * 100)
    }, [gamification])

    return (
        <>
            <div className="container mx-auto max-w-5xl py-8 space-y-6 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6 pb-6 border-b">
                    <Avatar className="size-20 border border-border">
                        <AvatarImage src={user?.avatarUrl || undefined} alt={user?.displayName} />
                        <AvatarFallback className="bg-primary/10 text-primary text-2xl font-medium">
                            {user?.displayName?.charAt(0) || 'U'}
                        </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 text-center md:text-left space-y-4 w-full">
                        <div className="space-y-1">
                            <div className="flex flex-col md:flex-row md:items-center gap-3">
                                <h1 className="text-2xl font-semibold">{user?.displayName}</h1>
                                <div className="flex items-center justify-center md:justify-start gap-2">
                                    <Badge variant="secondary">Level {gamification?.level || 1}</Badge>
                                    {user?.role === 'admin' && (
                                        <Badge className="bg-destructive/10 text-destructive border-none">
                                            <Shield className="size-3 mr-1" /> Admin
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {user?.email} • Hoạt động từ {user?.createdAt ? formatDate(user.createdAt) : '2024'}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-6">
                            <div className="space-y-1 rounded-xl bg-muted/20 px-3 py-3">
                                <p className="text-[11px] text-muted-foreground">Kinh nghiệm</p>
                                <p className="text-lg font-medium">
                                    {formatNumber(gamification?.currentXp || 0)} <span className="text-[10px] text-muted-foreground">XP</span>
                                </p>
                            </div>
                            <div className="space-y-1 rounded-xl bg-muted/20 px-3 py-3">
                                <p className="text-[11px] text-muted-foreground">Điểm thưởng</p>
                                <p className="text-lg font-medium">
                                    {formatNumber(gamification?.points || 0)} <span className="text-[10px] text-muted-foreground">PTS</span>
                                </p>
                            </div>
                            <div className="space-y-1 rounded-xl bg-muted/20 px-3 py-3">
                                <p className="text-[11px] text-muted-foreground">Chuỗi học tập</p>
                                <p className="text-lg font-medium">
                                    {streak?.currentStreak || 0} <span className="text-[10px] text-muted-foreground">Ngày</span>
                                </p>
                            </div>
                            <div className="space-y-1 rounded-xl bg-muted/20 px-3 py-3">
                                <p className="text-[11px] text-muted-foreground">Thành tựu</p>
                                <p className="text-lg font-medium">
                                    {achievementsData?.filter(a => a.isUnlocked).length || 0} <span className="text-[10px] text-muted-foreground">Huy hiệu</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <Tabs defaultValue="overview" className="w-full space-y-4">
                    <div className="w-full overflow-x-auto">
                        <TabsList className="w-max">
                            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
                            <TabsTrigger value="achievements">Bộ sưu tập huy hiệu</TabsTrigger>
                            <TabsTrigger value="onboarding">Lộ trình học tập</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="overview" className="focus-visible:outline-none">
                        <ScrollArea className="max-h-[65vh] pr-3">
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Card className="shadow-none">
                                        <CardHeader className="pb-4">
                                            <div className="flex justify-between items-center">
                                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                                    <Target className="size-4 text-primary" />
                                                    Mục tiêu cấp {(gamification?.level || 1) + 1}
                                                </CardTitle>
                                                <Badge variant="outline">{currentXpProgress}%</Badge>
                                            </div>
                                            <CardDescription className="text-xs">Tiến trình đạt cấp độ tiếp theo</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <Progress value={currentXpProgress} className="h-2" />
                                            <p className="text-[11px] text-muted-foreground text-center">
                                                Cần tích lũy thêm {(100 * ((gamification?.level || 1) + 1)) - (gamification?.currentXp || 0)} XP
                                            </p>
                                        </CardContent>
                                    </Card>

                                    <Card className="shadow-none flex flex-col justify-center p-6">
                                        <div className="flex items-center gap-5">
                                            <div className="size-12 rounded-md bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                                <Award className="size-6" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium">Thành tích học tập</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Bạn đã xuất sắc mở khóa {achievementsData?.filter(a => a.isUnlocked).length || 0} huy hiệu danh dự trong quá trình rèn luyện tại Torii.
                                                </p>
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="achievements" className="focus-visible:outline-none">
                        <ScrollArea className="max-h-[65vh] pr-3">
                            <Card className="shadow-none">
                                <CardHeader>
                                    <CardTitle className="text-base font-medium">Huy hiệu đã đạt được</CardTitle>
                                    <CardDescription>Các cột mốc quan trọng bạn đã vượt qua</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
                                        {achievementsData?.filter(a => a.isUnlocked).length ? (
                                            achievementsData?.filter(a => a.isUnlocked).map((achievement: any) => {
                                                const icon = achievement.achievement.icon || 'Award'
                                                return (
                                                    <button
                                                        key={achievement.id}
                                                        type="button"
                                                        onClick={() => setSelectedAchievement(achievement)}
                                                        className="aspect-square bg-muted/20 rounded-md flex items-center justify-center border group relative cursor-pointer transition-all hover:bg-primary/5 hover:border-primary/20 overflow-hidden focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                                        title={achievement.achievement.title}
                                                    >
                                                        {icon.startsWith('http') ? (
                                                            <img src={icon} alt={achievement.achievement.title} className="size-full object-contain p-2 group-hover:scale-110 transition-all duration-300" />
                                                        ) : (() => {
                                                            const Icon = achievementIconMap[icon] || Award
                                                            return <Icon className="size-7 text-primary/40 group-hover:text-primary group-hover:scale-110 transition-all duration-300" />
                                                        })()}
                                                    </button>
                                                )
                                            })
                                        ) : (
                                            <div className="col-span-full py-16 flex flex-col items-center justify-center text-center gap-3 opacity-30">
                                                <Trophy className="size-10" />
                                                <p className="text-xs">Chưa có huy hiệu nào</p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="onboarding" className="focus-visible:outline-none">
                        <ScrollArea className="max-h-[65vh] pr-3">
                            <Card className="shadow-none">
                                <CardHeader>
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0">
                                            <CardTitle className="text-base font-medium">Lộ trình học cá nhân</CardTitle>
                                            <CardDescription>Các thông số mục tiêu bạn đã thiết lập</CardDescription>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="w-full sm:w-auto sm:shrink-0"
                                            onClick={() => setGoalOpen(true)}
                                        >
                                            <Target className="mr-2 size-4" />
                                            Thiết lập lại mục tiêu
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {(user?.jlptTarget || user?.currentLevel || (user?.userMetadata as any)?.jlptTarget) ? (
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            {[
                                                {
                                                    label: 'Mục tiêu JLPT',
                                                    value: (user as any)?.jlptTarget || ((user?.userMetadata as any)?.jlptTarget ?? 'Chưa đặt'),
                                                    icon: <Target className="size-4" />
                                                },
                                                {
                                                    label: 'Trình độ hiện tại',
                                                    value: (() => {
                                                        const cl = (user as any)?.currentLevel
                                                        const map: any = {
                                                            'NEVER': 'Mới bắt đầu',
                                                            'N5': 'Cơ bản (N5)',
                                                            'N4': 'Sơ cấp (N4)',
                                                            'N3': 'Trung cấp (N3)',
                                                            'N2': 'Cao cấp (N2)',
                                                            'N1': 'Nâng cao (N1)'
                                                        }
                                                        return map[cl || ''] || cl || 'Chưa đặt'
                                                    })(),
                                                    icon: <GraduationCap className="size-4" />
                                                }
                                            ].map((item, i) => (
                                                <div key={i} className="flex items-center gap-4 rounded-xl bg-muted/20 px-4 py-4 transition-all group">
                                                    <div className="flex size-10 items-center justify-center rounded-xl bg-background/80 text-muted-foreground/60 group-hover:text-primary transition-all">
                                                        {item.icon}
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-muted-foreground">{item.label}</p>
                                                        <p className="text-sm font-medium">{item.value}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="py-20 flex flex-col items-center justify-center text-center gap-6">
                                            <div className="size-16 rounded-md bg-muted/20 flex items-center justify-center text-muted-foreground/20">
                                                <Target className="size-8" />
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-sm font-medium">Chưa thiết lập lộ trình</p>
                                                <p className="text-xs text-muted-foreground max-w-[240px]">
                                                    Bạn có thể đặt mục tiêu JLPT ngay trên dashboard bằng nút mục tiêu ở header.
                                                </p>
                                            </div>
                                            <Button asChild variant="default" size="sm" className="w-full sm:w-auto">
                                                <Link href="/dashboard">Về dashboard</Link>
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </div>

            <JlptGoalDialog open={goalOpen} onOpenChange={setGoalOpen} />

            <Dialog
                open={!!selectedAchievement}
                onOpenChange={(open) => {
                    if (!open) setSelectedAchievement(null)
                }}
            >
                <DialogContent className="border-border/60 bg-background p-6 shadow-2xl sm:max-w-[500px]">
                    {selectedAchievement ? (
                        <>
                            <DialogHeader className="space-y-4 pr-6">
                                <div className="flex items-start gap-4">
                                    <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                        {(() => {
                                            const icon = selectedAchievement.achievement?.icon || 'Award'
                                            if (typeof icon === 'string' && icon.startsWith('http')) {
                                                return (
                                                    <img
                                                        src={icon}
                                                        alt={selectedAchievement.achievement?.title ?? 'Huy hiệu'}
                                                        className="size-9 object-contain"
                                                    />
                                                )
                                            }
                                            const Icon = achievementIconMap[icon] || Award
                                            return <Icon className="size-7" />
                                        })()}
                                    </div>
                                    <div className="min-w-0">
                                        <DialogTitle className="text-xl font-semibold leading-tight">
                                            {selectedAchievement.achievement?.title ?? 'Huy hiệu'}
                                        </DialogTitle>
                                        <DialogDescription className="mt-1 text-sm leading-6">
                                            {selectedAchievement.achievement?.description ?? ''}
                                        </DialogDescription>
                                    </div>
                                </div>
                            </DialogHeader>

                            <div className="space-y-6 pt-5">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="space-y-1">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Thời gian đạt được</p>
                                        <p className="text-sm font-medium">
                                            {selectedAchievement.unlockedAt ? formatDate(selectedAchievement.unlockedAt) : '—'}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Danh mục</p>
                                        <p className="text-sm font-medium">
                                            {categoryLabels[selectedAchievement.achievement?.category] || selectedAchievement.achievement?.category || '—'}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Điều kiện để đạt</p>
                                    {selectedAchievement.achievement?.requirements &&
                                        Object.keys(selectedAchievement.achievement.requirements).length > 0 ? (
                                        <div className="space-y-3">
                                            {Object.entries(selectedAchievement.achievement.requirements).map(([k, v]) => (
                                                <div key={k} className="flex items-start justify-between gap-4 pb-3 last:pb-0">
                                                    <span className="text-xs font-medium text-muted-foreground">{requirementTypeLabels[k] || k}</span>
                                                    <span className="max-w-[60%] break-words text-right text-sm text-foreground/85 font-semibold">
                                                        {typeof v === 'string'
                                                            ? (requirementValueLabels[v] || v)
                                                            : typeof v === 'number' || typeof v === 'boolean'
                                                                ? String(v)
                                                                : JSON.stringify(v)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">Chưa có dữ liệu điều kiện.</p>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : null}
                </DialogContent>
            </Dialog>
        </>
    )
}
