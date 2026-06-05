'use client'

import React, { useMemo, useRef, useState } from 'react'
import { Button } from '@workspace/ui/components/button'
import { Badge } from '@workspace/ui/components/badge'
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@workspace/ui/components/collapsible'
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Clock, BookOpen, Users } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from '@workspace/ui/components/avatar'
import { useAcademyClassCatalog } from '@/lib/api/services/academy-course-api'
import { Spinner } from '@workspace/ui/components/spinner'
import { formatNumber } from '@/utils/format-utils'
import { Card, CardContent } from '@workspace/ui/components/card'
import { cn } from '@workspace/ui/lib/utils'

/** Desktop-only horizontal scroll carousel with prev/next buttons. */
function HorizontalScrollCarousel({ children, cardCount, scrollRef }: { children: React.ReactNode; cardCount: number; scrollRef: React.RefObject<HTMLDivElement | null> }) {
    if (cardCount === 0) return <>{children}</>

    return (
        <div className="relative w-full min-w-0 max-w-full overflow-hidden">
            <div
                ref={scrollRef}
                className="flex w-full min-w-0 max-w-full gap-6 overflow-x-auto pb-6 pt-2 snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
                {children}
            </div>
        </div>
    )
}

function SectionHeader({
    title,
    description,
    scrollRef,
    cardCount
}: {
    title: string;
    description: string;
    scrollRef: React.RefObject<HTMLDivElement | null>;
    cardCount: number;
}) {
    const scroll = (direction: 'left' | 'right') => {
        if (!scrollRef.current) return
        const amount = scrollRef.current.clientWidth * 0.8
        scrollRef.current.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' })
    }

    return (
        <div className="flex flex-col gap-4 border-b border-border/20 pb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
            <div className="space-y-1.5 flex-1 min-w-0">
                <h2 className="text-xl font-bold tracking-tight text-foreground border-l-4 border-primary pl-4 leading-none">
                    {title}
                </h2>
                <p className="text-xs font-semibold text-muted-foreground/60 pl-5 max-w-2xl">
                    {description}
                </p>
            </div>

            {cardCount > 0 && (
                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-xl border-border/50 hover:bg-muted hover:text-primary transition-all shadow-none"
                        onClick={() => scroll('left')}
                        aria-label="Previous"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-xl border-border/50 hover:bg-muted hover:text-primary transition-all shadow-none"
                        onClick={() => scroll('right')}
                        aria-label="Next"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    )
}

const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'] as const

function currentMonthLabel() {
    const d = new Date()
    return `${d.getMonth() + 2}/${d.getFullYear()}`
}

const WEEKDAY_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

type CatalogListItem = {
    id: string
    code: string
    title?: string
    name?: string
    price: number
    discountPrice: number | null
    thumbnailUrl?: string | null
    courseProfile?: {
        thumbnailUrl?: string | null
        title?: string
        level?: string | null
    } | null
    cohort?: {
        courseProfile?: CatalogListItem['courseProfile']
        startDate?: string | null
        enrollmentOpenAt?: string | null
        name?: string
        code?: string
    } | null
    instructor?: { id: string; displayName: string; avatarUrl?: string }
    liveSchedules?: Array<{
        id: string
        weekday: number
        startTime: string
        endTime: string
    }>
    maxStudents?: number | null
    _count?: { enrollments: number }
    term?: { openingDate?: string | null; name?: string; code?: string }
}

function catalogPriceParts(row: Pick<CatalogListItem, 'price' | 'discountPrice'>) {
    const basePrice = row.price
    const d = row.discountPrice
    const hasDiscount = d != null && d > 0 && d < basePrice
    return {
        basePrice,
        displayPrice: hasDiscount ? d : basePrice,
        hasDiscount,
    }
}

export default function DashboardCoursesPage() {
    const [level, setLevel] = useState<string>('all')
    const searchParams = useSearchParams()
    const typeParam = (searchParams.get('type') ?? '').toLowerCase()
    const showLive = typeParam !== 'vod'
    const showVod = typeParam !== 'live'

    const monthLabel = useMemo(() => currentMonthLabel(), [])
    const levelParam = level === 'all' ? undefined : level

    const liveQuery = useAcademyClassCatalog({
        mode: 'LIVE',
        level: levelParam,
        upcomingRegistration: true,
    })
    const vodQuery = useAcademyClassCatalog({
        mode: 'VOD',
        level: levelParam,
    })

    const liveItems = liveQuery.data?.items ?? []
    const vodItems = vodQuery.data?.items ?? []
    const liveScrollRef = useRef<HTMLDivElement>(null)
    const vodScrollRef = useRef<HTMLDivElement>(null)

    return (
        <div className="w-full min-w-0 max-w-full overflow-x-clip px-4 pb-8 space-y-8 animate-in fade-in duration-700">
            {/* Standard Header */}
            <div className="flex min-w-0 flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-border">
                <div className="min-w-0 space-y-4">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Khám phá lộ trình</h1>
                    <p className="text-sm font-medium text-muted-foreground w-full max-w-xl">
                        Lựa chọn hình thức học tập tối ưu: lớp trực tiếp tương tác hoặc khóa tự học chủ động thời gian.
                    </p>
                </div>

                {/* Level filter - Modern segment picker */}
                <div className="flex max-w-full items-center gap-2 pb-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <button
                        onClick={() => setLevel('all')}
                        className={cn(
                            "group flex flex-col items-center justify-center min-w-[56px] h-14 rounded-2xl border transition-all duration-300 shrink-0",
                            level === 'all'
                                ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/10"
                                : "bg-muted/30 border-transparent text-muted-foreground/50 hover:bg-primary/5 hover:text-primary hover:border-primary/20"
                        )}
                    >
                        <span className="text-[9px] font-bold uppercase tracking-tighter opacity-50 group-hover:opacity-100">Lộ trình</span>
                        <span className="text-sm font-bold tracking-tight">Tất cả</span>
                    </button>
                    {LEVELS.map((lv) => (
                        <button
                            key={lv}
                            onClick={() => setLevel(lv)}
                            className={cn(
                                "group flex flex-col items-center justify-center min-w-[56px] h-14 rounded-2xl border transition-all duration-300 shrink-0",
                                level === lv
                                    ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/10"
                                    : "bg-muted/30 border-transparent text-muted-foreground/50 hover:bg-primary/5 hover:text-primary hover:border-primary/20"
                            )}
                        >
                            <span className="text-[9px] font-bold uppercase tracking-tighter opacity-50 group-hover:opacity-100">JLPT</span>
                            <span className="text-sm font-bold tracking-tight">{lv}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="min-w-0 max-w-full space-y-20 overflow-x-hidden">
                {showLive && (
                    <section className="min-w-0 space-y-8">
                        <SectionHeader
                            title="Lớp trực tiếp đang tuyển sinh"
                            description={`Các lớp học trực tuyến sắp khai giảng trong tháng ${monthLabel}`}
                            scrollRef={liveScrollRef}
                            cardCount={liveItems.length}
                        />
                        {liveQuery.isLoading ? (
                            <div className="flex justify-center py-20">
                                <Spinner className="size-6 text-primary/40" />
                            </div>
                        ) : liveItems.length === 0 ? (
                            <NoItemsFound text="Chưa có lớp trực tiếp phù hợp với tiêu chí tìm kiếm." />
                        ) : (
                            <HorizontalScrollCarousel cardCount={liveItems.length} scrollRef={liveScrollRef}>
                                {liveItems.map((klass: CatalogListItem) => (
                                    <div key={klass.id} className="snap-start w-[88%] max-w-[380px] min-w-0 shrink-0 sm:w-[340px] lg:w-[380px]">
                                        <ClassLiveCard klass={klass} />
                                    </div>
                                ))}
                            </HorizontalScrollCarousel>
                        )}
                    </section>
                )}

                {showVod && (
                    <section className="min-w-0 space-y-8">
                        <SectionHeader
                            title="Khóa học tự học"
                            description="Học tập chủ động với hệ thống video bài giảng chuyên sâu"
                            scrollRef={vodScrollRef}
                            cardCount={vodItems.length}
                        />
                        {vodQuery.isLoading ? (
                            <div className="flex justify-center py-20">
                                <Spinner className="size-6 text-primary/40" />
                            </div>
                        ) : vodItems.length === 0 ? (
                            <NoItemsFound text="Chưa có khóa học tự học phù hợp với tiêu chí tìm kiếm." />
                        ) : (
                            <HorizontalScrollCarousel cardCount={vodItems.length} scrollRef={vodScrollRef}>
                                {vodItems.map((klass: CatalogListItem) => (
                                    <div key={klass.id} className="snap-start w-[88%] max-w-[380px] min-w-0 shrink-0 sm:w-[340px] lg:w-[380px]">
                                        <ClassVodCard klass={klass} />
                                    </div>
                                ))}
                            </HorizontalScrollCarousel>
                        )}
                    </section>
                )}
            </div>
        </div>
    )
}

function NoItemsFound({ text }: { text: string }) {
    return (
        <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border/50 py-20 text-center bg-muted/5">
            <div className="size-16 items-center justify-center rounded-2xl bg-muted/10 flex text-muted-foreground/20">
                <BookOpen className="size-8" />
            </div>
            <div className="space-y-1 px-6">
                <p className="text-sm font-bold text-foreground/60">{text}</p>
                <p className="text-xs font-semibold text-muted-foreground/30">Hãy kiểm tra lại bộ lọc hoặc quay lại sau.</p>
            </div>
        </div>
    )
}

function ClassVodCard({ klass }: { klass: CatalogListItem }) {
    const profile = klass.courseProfile
    const thumb = klass.thumbnailUrl || profile?.thumbnailUrl || '/course-placeholder.jpg'
    const title = klass.title || klass.name || profile?.title || 'Khóa học'
    const level = profile?.level || '—'
    const { basePrice, displayPrice, hasDiscount } = catalogPriceParts(klass)

    return (
        <Card className="group border-border/40 bg-card hover:bg-muted/5 hover:border-primary/20 transition-all duration-300 rounded-2xl overflow-hidden shadow-none h-full min-w-0 max-w-full flex flex-col p-0">
            <CardContent className="p-0 flex h-full min-w-0 max-w-full flex-col">
                <div className="relative aspect-[16/10] w-full bg-muted/10 overflow-hidden">
                    <Image src={thumb} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 640px) 300px, 400px" />
                    <div className="absolute top-4 left-4 flex gap-2">
                        <Badge className="bg-white text-primary border-none px-2.5 py-1 rounded-lg font-bold text-[10px] shadow-sm">
                            {level}
                        </Badge>
                        <Badge className="bg-primary text-white border-none px-2.5 py-1 rounded-lg font-bold text-[10px] shadow-sm">
                            Tự học
                        </Badge>
                    </div>
                </div>
                <div className="p-5 flex flex-col min-w-0 space-y-3">
                    <div className="space-y-1 min-w-0">
                        <h3 className="text-lg font-bold tracking-tight text-foreground/90 leading-tight group-hover:text-primary transition-colors line-clamp-2">{title}</h3>
                        <p className="truncate text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em]">{klass.code}</p>
                    </div>

                    <div className="space-y-4 pt-3 border-t border-border/20">
                        {klass.instructor?.id && (
                            <Link
                                href={`/dashboard/instructors/${klass.instructor.id}?name=${encodeURIComponent(klass.instructor.displayName || '')}`}
                                className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group/instructor"
                            >
                                <Avatar className="size-5 border border-border/40">
                                    <AvatarImage src={klass.instructor.avatarUrl} alt={klass.instructor.displayName || 'Giảng viên'} />
                                    <AvatarFallback className="text-[9px] font-bold">
                                        {(klass.instructor.displayName || 'I').slice(0, 1).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="truncate">Giảng viên: {klass.instructor.displayName}</span>
                            </Link>
                        )}

                        <div className="flex min-w-0 items-center justify-between gap-3 pt-1">
                            <div className="flex flex-col">
                                <span className={cn(
                                    "text-lg font-bold tabular-nums tracking-tighter",
                                    hasDiscount ? "text-destructive" : "text-primary",
                                )}>
                                    {formatNumber(displayPrice)} <span className="text-[10px] uppercase ml-0.5">đ</span>
                                </span>
                                {hasDiscount && (
                                    <span className="text-[11px] text-muted-foreground/50 line-through tabular-nums font-bold">{formatNumber(basePrice)} đ</span>
                                )}
                            </div>
                            <Button size="sm" className="h-9 px-5 rounded-xl font-bold text-[10px] uppercase tracking-wider shadow-none group-hover:scale-[1.02] transition-transform" asChild>
                                <Link href={`/dashboard/available-courses/class/${klass.id}?mode=VOD`}>Chi tiết</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function ClassLiveCard({ klass }: { klass: CatalogListItem }) {
    const profile = klass.cohort?.courseProfile ?? klass.courseProfile
    const thumb = klass.thumbnailUrl || profile?.thumbnailUrl || '/course-placeholder.jpg'
    const title = klass.name || profile?.title || 'Lớp học trực tiếp'
    const level = profile?.level || '—'
    const { basePrice, displayPrice, hasDiscount } = catalogPriceParts(klass)
    const term = klass.term ?? (klass.cohort ? {
        openingDate: klass.cohort.startDate ?? klass.cohort.enrollmentOpenAt ?? null,
        name: klass.cohort.name,
        code: klass.cohort.code,
    } : null)
    const schedules = Array.isArray(klass.liveSchedules) ? klass.liveSchedules : []
    const activeCount = klass._count?.enrollments ?? 0
    const maxStudents = klass.maxStudents ?? null
    const liveEnrollment = maxStudents != null || activeCount > 0 ? {
        maxStudents,
        activeEnrollmentCount: activeCount,
        isFull: maxStudents != null ? activeCount >= maxStudents : false,
    } : null

    return (
        <Card className="group border-border/40 bg-card hover:bg-muted/5 hover:border-primary/20 transition-all duration-300 rounded-2xl overflow-hidden shadow-none h-full min-w-0 max-w-full flex flex-col p-0">
            <CardContent className="p-0 flex h-full min-w-0 max-w-full flex-col">
                <div className="relative aspect-[16/10] w-full bg-muted/10 overflow-hidden">
                    <Image src={thumb} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 640px) 300px, 400px" />
                    <div className="absolute top-4 left-4 flex gap-2">
                        <Badge className="bg-white text-primary border-none px-2.5 py-1 rounded-lg font-bold text-[10px] shadow-sm">
                            {level}
                        </Badge>
                        <Badge className="bg-red-500 text-white border-none px-2.5 py-1 rounded-lg font-bold text-[10px] shadow-sm">
                            Tuyển sinh
                        </Badge>
                    </div>
                </div>
                <div className="p-5 flex flex-col min-w-0 space-y-4">
                    <div className="space-y-1 min-w-0">
                        <h3 className="text-lg font-bold tracking-tight text-foreground/90 leading-tight group-hover:text-primary transition-colors line-clamp-2">{title}</h3>
                        <p className="truncate text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em]">{klass.code}</p>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-border/20">
                        {klass.instructor?.id && (
                            <Link
                                href={`/dashboard/instructors/${klass.instructor.id}?name=${encodeURIComponent(klass.instructor.displayName || '')}`}
                                className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group/instructor"
                            >
                                <Avatar className="size-5 border border-border/40">
                                    <AvatarImage src={klass.instructor.avatarUrl} alt={klass.instructor.displayName || 'Giảng viên'} />
                                    <AvatarFallback className="text-[9px] font-bold">
                                        {(klass.instructor.displayName || 'I').slice(0, 1).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="truncate">Giảng viên: {klass.instructor.displayName}</span>
                            </Link>
                        )}

                        {term?.openingDate && (
                            <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="size-4 text-primary/60" />
                                <span className="truncate">Khai giảng: {new Date(term.openingDate).toLocaleDateString('vi-VN')}</span>
                            </div>
                        )}

                        <Collapsible>
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="w-full justify-between h-auto p-0 hover:bg-transparent text-muted-foreground/60 transition-colors group/btn">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground group-hover/btn:text-foreground transition-colors">
                                        <Clock className="size-4 text-primary/60" />
                                        <span>Lịch học & Sĩ số</span>
                                    </div>
                                    <ChevronDown className="size-3.5 opacity-40 group-hover/btn:opacity-100 transition-opacity" />
                                </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="space-y-3 pt-3">
                                {schedules.length > 0 ? (
                                    <div className="rounded-xl border border-border/20 bg-muted/20 p-3 space-y-1.5">
                                        {schedules.map((s) => (
                                            <div key={s.id} className="flex min-w-0 items-center justify-between gap-2 text-sm text-muted-foreground">
                                                <span className="shrink-0">{WEEKDAY_VI[s.weekday ?? 0] ?? '?'}</span>
                                                <span className="min-w-0 truncate text-foreground">{s.startTime} – {s.endTime}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">Chưa cập nhật lịch</p>
                                )}

                                {liveEnrollment && (
                                    <div className="flex min-w-0 items-center gap-2 text-sm">
                                        <Users className="size-4 shrink-0 text-primary/60" />
                                        <span className={cn(
                                            "truncate",
                                            liveEnrollment.isFull ? "text-destructive" : "text-muted-foreground",
                                        )}>
                                            {liveEnrollment.maxStudents == null
                                                ? `${liveEnrollment.activeEnrollmentCount ?? 0} học viên đang học`
                                                : `Đã nộp: ${liveEnrollment.activeEnrollmentCount ?? 0}/${liveEnrollment.maxStudents} chỗ`}
                                            {liveEnrollment.isFull ? ' (Đã hết chỗ)' : ''}
                                        </span>
                                    </div>
                                )}
                            </CollapsibleContent>
                        </Collapsible>

                        <div className="flex min-w-0 items-center justify-between gap-3 pt-0">
                            <div className="flex flex-col">
                                <span className={cn(
                                    "text-lg font-bold tabular-nums tracking-tighter",
                                    hasDiscount ? "text-destructive" : "text-primary",
                                )}>
                                    {formatNumber(displayPrice)} <span className="text-[10px] uppercase ml-0.5">đ</span>
                                </span>
                                {hasDiscount && (
                                    <span className="text-[11px] text-muted-foreground/50 line-through tabular-nums font-bold">{formatNumber(basePrice)} đ</span>
                                )}
                            </div>
                            <Button size="sm" className="h-9 shrink-0 px-5 rounded-xl font-bold text-[10px] uppercase tracking-wider shadow-none group-hover:scale-[1.02] transition-transform" asChild>
                                <Link href={`/dashboard/available-courses/class/${klass.id}?mode=LIVE`}>Chi tiết</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
