'use client'

import React from 'react'
import {
    BookOpen,
    PlayCircle,
    Clock,
    TrendingUp,
    Calendar,
    ChevronRight,
    Target,
    Award,
    Star,
    Flame,
    Bot,
    Search,
    Check,
    History,
    MessageSquare,
    Users,
    Video
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@workspace/ui/lib/utils'
import { useAppSelector } from '@/hooks/hooks'
import { Progress } from '@workspace/ui/components/progress'
import { Button } from '@workspace/ui/components/button'
import { Card } from '@workspace/ui/components/card'
import { useAcademyMyCourses as useMyCourses, academyLearningProgressApi as learningProgressApi } from '@/lib/api/services/academy-learning-progress-api'
import { useGamificationProfile, useStreak, useAchievements, useLeaderboard } from '@/lib/api/services/gamification-api'
import { useQuery } from '@tanstack/react-query'
import { formatNumber } from '@/utils/format-utils'

export default function ModernDashboard() {
    const { user } = useAppSelector((state) => state.auth)
    const { data: courses } = useMyCourses()
    const { data: profile } = useGamificationProfile()
    const { data: streak } = useStreak()
    const { data: achievements } = useAchievements()
    const { data: statsData } = useQuery({
        queryKey: ['learning-stats'],
        queryFn: learningProgressApi.getStats
    })

    const recentCourses = courses?.slice(0, 3) || []
    const mainCourse = recentCourses[0]
    const jlptLevel = (user?.userMetadata as any)?.jlptTarget || 'N3'

    const stats = [
        { label: 'Khóa học', value: statsData?.totalCourses || 0, icon: BookOpen, color: 'text-blue-500' },
        { label: 'Giờ học', value: `${statsData?.totalLearningHours || 0}h`, icon: Clock, color: 'text-emerald-500' },
        { label: 'Thành tích', value: achievements?.length || 0, icon: Award, color: 'text-amber-500' },
        { label: 'Tiến độ', value: `${statsData?.averageProgress || 0}%`, icon: TrendingUp, color: 'text-purple-500' },
    ]

    const upcomingClasses = [
        {
            id: 1,
            title: 'Thành thạo kính ngữ Keigo',
            instructor: 'Sato Sensei',
            time: 'Hôm nay, 14:00',
            avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=100&auto=format&fit=crop'
        },
        {
            id: 2,
            title: 'Luyện nghe N2',
            instructor: 'Tanaka Sensei',
            time: 'Ngày mai, 10:30',
            avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=100&auto=format&fit=crop'
        }
    ]

    // Progress circle mapping
    const progressPercent = statsData?.averageProgress || 0
    const dashArray = 364.4
    const dashOffset = dashArray - (dashArray * progressPercent) / 100

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Welcome & Top Summary */}
            <div className="flex flex-col lg:flex-row gap-8">
                <div className="flex-1 space-y-6">
                    <div className="space-y-2">
                        <h1 className="text-4xl font-bold text-slate-900 dark:text-white tracking-normal">
                            Xin chào, <span className="text-primary">{user?.displayName?.split(' ')[0] || 'Học viên'}</span>!
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">
                            Bạn đang tiến bộ rất tốt hướng tới chứng chỉ {jlptLevel}. Đã hoàn thành {progressPercent}% mục tiêu tổng quát.
                        </p>
                    </div>

                    {/* Current Course Spotlight */}
                    {mainCourse ? (
                        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                            <div className="flex flex-col sm:flex-row h-full">
                                <div className="w-full sm:w-56 h-48 sm:h-auto overflow-hidden">
                                    <img
                                        src={mainCourse.thumbnailUrl || "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=400&auto=format&fit=crop"}
                                        alt={mainCourse.courseTitle}
                                        className="w-full h-full object-cover transition-transform hover:scale-105 duration-500"
                                    />
                                </div>
                                <div className="p-8 flex-1 flex flex-col justify-between space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-start">
                                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{mainCourse.courseTitle}</h3>
                                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold uppercase tracking-widest text-[10px]">
                                                Đang học
                                            </Badge>
                                        </div>
                                        <p className="text-slate-500 dark:text-slate-400 font-medium line-clamp-2">
                                            Giảng viên: {mainCourse.instructorName} • Tiếp tục để hoàn thành học phần này.
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1 overflow-hidden">
                                                <div className="flex justify-between text-xs font-bold mb-1.5">
                                                    <span className="text-slate-400">TIẾN ĐỘ KHÓA HỌC</span>
                                                    <span className="text-primary">{mainCourse.progress}%</span>
                                                </div>
                                                <Progress value={mainCourse.progress} className="h-2 bg-slate-100 dark:bg-slate-800" indicatorClassName="bg-primary" />
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-3">
                                            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 rounded-xl" asChild>
                                                <Link
                                                    href={`/courses/${mainCourse.liveClassId ?? mainCourse.vodPackageId ?? mainCourse.courseProfileId ?? mainCourse.id}/learn${mainCourse.vodPackageId ? '?mode=VOD' : ''}`}
                                                >
                                                    Tiếp tục học
                                                </Link>
                                            </Button>
                                            <Button variant="outline" className="rounded-xl font-bold px-8" asChild>
                                                <Link href={`/courses/${mainCourse.slug}`}>Xem chi tiết</Link>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ) : (
                        <Card className="p-12 text-center flex flex-col items-center justify-center bg-white dark:bg-slate-900 border-dashed border-2">
                            <BookOpen className="size-12 text-slate-300 mb-4" />
                            <h3 className="text-xl font-bold mb-2">Bạn chưa bắt đầu khóa học nào</h3>
                            <p className="text-slate-500 mb-6">Khám phá kho khóa học để bắt đầu hành trình chinh phục tiếng Nhật.</p>
                            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold px-10" asChild>
                                <Link href="/dashboard/available-courses">Khám phá khóa học</Link>
                            </Button>
                        </Card>
                    )}
                </div>

                {/* Right Info Column */}
                <div className="w-full lg:w-80 space-y-6">
                    {/* AI Sensei Card */}
                    <div className="bg-gradient-to-br from-primary to-primary/80 p-8 rounded-2xl text-primary-foreground shadow-xl relative overflow-hidden group">
                        <Bot className="absolute -right-6 -bottom-6 size-40 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-700" />
                        <div className="relative z-10 space-y-4">
                            <h3 className="text-xl font-bold">AI Sensei</h3>
                            <p className="text-sm text-white/80 leading-relaxed font-medium">
                                Cần giải đáp ngữ pháp hay luyện tập hội thoại? AI Sensei luôn sẵn sàng hỗ trợ bạn 24/7.
                            </p>
                            <Button variant="secondary" className="w-full bg-white/20 hover:bg-white/30 text-white border-white/20 backdrop-blur-sm rounded-xl font-bold py-6" asChild>
                                <Link href="/ai-sensei/chat">Hỏi ngay bây giờ</Link>
                            </Button>
                        </div>
                    </div>

                    {/* Achievement Mini Cards */}
                    <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Thành tích</h4>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="flex flex-col items-center gap-2 group">
                                <div className={cn(
                                    "size-14 rounded-full flex items-center justify-center transition-all group-hover:scale-110",
                                    streak?.currentStreak ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600" : "bg-slate-100 dark:bg-slate-800 text-slate-400 opacity-40 grayscale"
                                )}>
                                    <Flame className="size-7 fill-current" />
                                </div>
                                <span className="text-[10px] font-bold text-center leading-tight">{streak?.currentStreak || 0} ngày liên tiếp</span>
                            </div>
                            <div className="flex flex-col items-center gap-2 group">
                                <div className={cn(
                                    "size-14 rounded-full flex items-center justify-center transition-all group-hover:scale-110",
                                    (profile?.level || 0) > 5 ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600" : "bg-slate-100 dark:bg-slate-800 text-slate-400 opacity-40 grayscale"
                                )}>
                                    <Star className="size-7 fill-current" />
                                </div>
                                <span className="text-[10px] font-bold text-center leading-tight">Cấp độ {profile?.level || 1}</span>
                            </div>
                            <div className="flex flex-col items-center gap-2 group">
                                <div className={cn(
                                    "size-14 rounded-full flex items-center justify-center transition-all group-hover:scale-110",
                                    (achievements?.length || 0) > 0 ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600" : "bg-slate-100 dark:bg-slate-800 text-slate-400 opacity-40 grayscale"
                                )}>
                                    <Award className="size-7" />
                                </div>
                                <span className="text-[10px] font-bold text-center leading-tight">Thành tựu</span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Stats & Activity Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Progress Detailed Widget */}
                <div className="xl:col-span-2 space-y-8">
                    <Card className="p-8 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
                        <div className="flex justify-between items-center mb-10">
                            <h3 className="text-xl font-bold">Tổng quan tiến độ</h3>
                            <Button variant="ghost" className="text-xs font-bold text-primary hover:bg-primary/10" asChild>
                                <Link href="/analytics">Xem báo cáo chi tiết <ChevronRight className="ml-1 size-3" /></Link>
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                            {/* Radial Progress */}
                            <div className="md:col-span-4 flex flex-col items-center space-y-4">
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Tổng thể JLPT</p>
                                <div className="relative size-40">
                                    <svg className="size-full transform -rotate-90">
                                        <circle className="text-slate-100 dark:text-slate-800" cx="80" cy="80" r="74" stroke="currentColor" strokeWidth="12" fill="transparent" />
                                        <circle
                                            className="text-primary transition-all duration-1000 ease-out"
                                            cx="80" cy="80" r="74"
                                            fill="transparent"
                                            stroke="currentColor"
                                            strokeWidth="12"
                                            strokeLinecap="round"
                                            strokeDasharray={dashArray}
                                            strokeDashoffset={dashOffset}
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-3xl font-bold">{progressPercent}%</span>
                                    </div>
                                </div>
                            </div>

                            {/* Progress Bars */}
                            <div className="md:col-span-5 space-y-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-slate-500">Từ vựng</span>
                                        <span>{formatNumber(statsData?.averageProgress || 0)} / 100</span>
                                    </div>
                                    <Progress value={statsData?.averageProgress || 0} className="h-2 bg-slate-100 dark:bg-slate-800" indicatorClassName="bg-primary" />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-slate-500">Ngữ pháp</span>
                                        <span>{formatNumber(statsData?.averageProgress || 0)} / 100</span>
                                    </div>
                                    <Progress value={Math.min(100, (statsData?.averageProgress || 0) + 5)} className="h-2 bg-slate-100 dark:bg-slate-800" indicatorClassName="bg-primary" />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-slate-500">Kanji</span>
                                        <span>{formatNumber(statsData?.averageProgress || 0)} / 100</span>
                                    </div>
                                    <Progress value={Math.max(0, (statsData?.averageProgress || 0) - 10)} className="h-2 bg-slate-100 dark:bg-slate-800" indicatorClassName="bg-primary" />
                                </div>
                            </div>

                            {/* Quick Stats Column */}
                            <div className="md:col-span-3 flex flex-col justify-center gap-4">
                                <div className="p-4 rounded-2xl bg-primary/5 dark:bg-primary/10 border border-primary/10">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Thời gian học</p>
                                    <p className="text-2xl font-bold text-primary">{statsData?.totalLearningHours || 0} <span className="text-sm font-bold opacity-70">giờ</span></p>
                                </div>
                                <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Điểm</p>
                                    <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{formatNumber(profile?.points || 0)}</p>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* WebRTC Table Widget */}
                    <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/20">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-lg">
                                    <Video className="size-4" />
                                </div>
                                <h3 className="font-bold">Buổi học trực tiếp sắp tới</h3>
                            </div>
                            <Button variant="ghost" size="icon" className="hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-full" asChild>
                                <Link href="/dashboard/schedule"><Calendar className="size-4" /></Link>
                            </Button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Chủ đề</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Giảng viên</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Thời gian</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {upcomingClasses.map((session) => (
                                        <tr key={session.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-2 rounded-full bg-primary animate-pulse" />
                                                    <span className="font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{session.title}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <img src={session.avatar} alt={session.instructor} className="size-7 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800" />
                                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{session.instructor}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <span className="text-sm font-bold text-slate-900 dark:text-white">{session.time}</span>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg text-xs px-4">Vào phòng</Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>

                {/* Recent Activity Column */}
                <div className="space-y-8">
                    <Card className="p-8 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm h-full">
                        <h3 className="text-xl font-bold mb-8">Hoạt động gần đây</h3>
                        <div className="space-y-8 relative">
                            <div className="absolute left-[11px] top-2 bottom-4 w-[2px] bg-slate-100 dark:bg-slate-800" />

                            <div className="relative flex gap-5 group">
                                <div className="size-6 bg-emerald-500 rounded-full flex items-center justify-center text-white ring-4 ring-white dark:ring-slate-900 z-10 transition-transform group-hover:scale-110">
                                    <Check className="size-3.5 stroke-[3]" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">Đã hoàn thành bài kiểm tra: Kanji N2</p>
                                    <p className="text-xs text-slate-500 font-medium">Điểm: 94% • 2 giờ trước</p>
                                </div>
                            </div>

                            <div className="relative flex gap-5 group">
                                <div className="size-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground ring-4 ring-white dark:ring-slate-900 z-10 transition-transform group-hover:scale-110">
                                    <PlayCircle className="size-3.5" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">Bắt đầu bài học "Kính ngữ trong công việc"</p>
                                    <p className="text-xs text-slate-500 font-medium">Học phần 4 • 4 giờ trước</p>
                                </div>
                            </div>

                            <div className="relative flex gap-5 group">
                                <div className="size-6 bg-indigo-500 rounded-full flex items-center justify-center text-white ring-4 ring-white dark:ring-slate-900 z-10 transition-transform group-hover:scale-110">
                                    <MessageSquare className="size-3.5" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">Trao đổi với AI Sensei</p>
                                    <p className="text-xs text-slate-500 font-medium">Trợ từ "wa" và "ga" • Hôm qua</p>
                                </div>
                            </div>

                            <div className="relative flex gap-5 group">
                                <div className="size-6 bg-amber-500 rounded-full flex items-center justify-center text-white ring-4 ring-white dark:ring-slate-900 z-10 transition-transform group-hover:scale-110">
                                    <Award className="size-3.5" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">Mở khóa thành tích: Kanji Master</p>
                                    <p className="text-xs text-slate-500 font-medium">+500 XP • 2 ngày trước</p>
                                </div>
                            </div>

                            <div className="relative flex gap-5 group">
                                <div className="size-6 bg-slate-400 rounded-full flex items-center justify-center text-white ring-4 ring-white dark:ring-slate-900 z-10 transition-transform group-hover:scale-110">
                                    <History className="size-3.5" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">Ôn tập thẻ ghi nhớ</p>
                                    <p className="text-xs text-slate-500 font-medium">Đã ôn 50 thẻ • 3 ngày trước</p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    )
}

function Badge({ children, variant = "outline", className }: { children: React.ReactNode, variant?: "outline" | "secondary", className?: string }) {
    return (
        <span className={cn(
            "px-2.5 py-1 rounded-full text-[10px] font-bold",
            variant === "outline" ? "border" : "bg-muted",
            className
        )}>
            {children}
        </span>
    )
}
