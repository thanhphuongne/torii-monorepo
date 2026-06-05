'use client'

import { Label } from '@workspace/ui/components/label'
import { BookOpen, Award, Clock, Star, MapPin, User, Calendar, Quote } from 'lucide-react'
import { cn } from '@workspace/ui/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Item, ItemContent, ItemMedia, ItemTitle, ItemDescription } from '@workspace/ui/components/item'
import { Separator } from '@workspace/ui/components/separator'

interface ProfileInfoProps {
    profile: any
}

export function ProfileInfo({ profile }: ProfileInfoProps) {
    const stats = [
        { label: 'Khóa học', value: profile.stats.totalCourses.toString(), icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { label: 'Hoàn thành', value: profile.stats.completedCourses.toString(), icon: Award, color: 'text-amber-500', bg: 'bg-amber-500/10' },
        { label: 'Giờ học', value: `${profile.stats.totalLearningHours}h`, icon: Clock, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        { label: 'Tiến độ TB', value: `${profile.stats.averageProgress}%`, icon: Star, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    ]

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, index) => (
                    <Card
                        key={index}
                        className="group relative overflow-hidden transition-all hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 bg-card border shadow-none"
                    >
                        <CardContent className="p-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className={cn("p-2 rounded-xl transition-all group-hover:scale-110 group-hover:rotate-3 shadow-sm border border-transparent", stat.bg, stat.color, "border-current/20")}>
                                    <stat.icon className="size-5" />
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                                    <span className="text-2xl font-bold tracking-normal text-foreground">{stat.value}</span>
                                </div>
                            </div>
                            <div className="h-1 w-full bg-muted rounded-full overflow-hidden border border-border/50">
                                <div className={cn("h-full rounded-full transition-all duration-1000 w-2/3 shadow-[0_0_8px_-1px_rgba(0,0,0,0.1)]", stat.bg.replace('/10', ''))} />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Biography & Details */}
            <div className="grid md:grid-cols-3 gap-6">
                <Card className="md:col-span-2 border shadow-none">
                    <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                            <User className="size-5" />
                        </div>
                        <div>
                            <CardTitle className="text-base font-bold uppercase tracking-widest">Tiểu sử</CardTitle>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase leading-none tracking-normal"> Câu chuyện của bạn </p>
                        </div>
                    </CardHeader>
                    <Separator className="mx-6 w-auto" />
                    <CardContent className="p-6 relative">
                        <Quote className="absolute left-6 top-6 size-10 text-primary/5 -translate-x-2 -translate-y-2" />
                        <p className="text-sm text-muted-foreground leading-relaxed italic relative z-10 pl-6 border-l-2 border-primary/20 py-2">
                            "{profile.bio}"
                        </p>
                    </CardContent>
                </Card>

                <Card className="border shadow-none">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-base font-bold uppercase tracking-widest">Chi tiết</CardTitle>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase leading-none tracking-normal"> Thông tin cá nhân </p>
                    </CardHeader>
                    <Separator className="mx-6 w-auto" />
                    <CardContent className="p-6 space-y-4">
                        <Item variant="default" className="p-0 hover:bg-transparent shadow-none border-none">
                            <ItemMedia className="size-10 rounded-xl bg-muted text-muted-foreground border border-transparent group-hover:border-primary/20 transition-all">
                                <MapPin className="size-5" />
                            </ItemMedia>
                            <ItemContent className="pl-1">
                                <ItemTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pt-1">Vị trí</ItemTitle>
                                <ItemDescription className="text-sm font-bold text-foreground">
                                    {profile.location || 'Chưa cập nhật'}
                                </ItemDescription>
                            </ItemContent>
                        </Item>

                        <Item variant="default" className="p-0 hover:bg-transparent shadow-none border-none">
                            <ItemMedia className="size-10 rounded-xl bg-muted text-muted-foreground border border-transparent group-hover:border-primary/20 transition-all">
                                <Calendar className="size-5" />
                            </ItemMedia>
                            <ItemContent className="pl-1">
                                <ItemTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pt-1">Ngày tham gia</ItemTitle>
                                <ItemDescription className="text-sm font-bold text-foreground">
                                    {profile.joinedDate}
                                </ItemDescription>
                            </ItemContent>
                        </Item>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
