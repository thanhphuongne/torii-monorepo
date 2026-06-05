'use client'

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useMemo } from 'react'
import { Button } from '@workspace/ui/components/button'
import { Badge } from '@workspace/ui/components/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@workspace/ui/components/card'
import { Spinner } from '@workspace/ui/components/spinner'
import { useAcademyClassCatalog } from '@/lib/api/services/academy-course-api'
import { cn } from '@workspace/ui/lib/utils'
import { formatNumber } from '@/utils/format-utils'

type CatalogItem = {
  id: string
  code?: string
  mode?: 'LIVE' | 'VOD'
  name?: string
  title?: string
  price?: number
  discountPrice?: number | null
  thumbnailUrl?: string | null
  instructor?: { id: string; displayName: string; avatarUrl?: string }
  courseProfile?: { title?: string; level?: string | null; thumbnailUrl?: string | null } | null
  cohort?: { courseProfile?: CatalogItem['courseProfile'] | null } | null
}

function getLevelFromJlptTarget(jlptTarget: string): string | undefined {
  const raw = (jlptTarget || '').toUpperCase().trim()
  const match = raw.match(/\bN[1-5]\b/)
  return match?.[0]
}

function CourseCard({ item, mode }: { item: CatalogItem; mode: 'LIVE' | 'VOD' }) {
  const profile = mode === 'LIVE' ? item.cohort?.courseProfile ?? item.courseProfile : item.courseProfile
  const title = item.name || item.title || profile?.title || 'Khóa học'
  const level = profile?.level || '—'
  const thumb = item.thumbnailUrl || profile?.thumbnailUrl || '/course-placeholder.jpg'
  const basePrice = item.price ?? 0
  const hasDiscount = !!(item.discountPrice && item.discountPrice > 0 && item.discountPrice < basePrice)
  const displayPrice = hasDiscount ? (item.discountPrice ?? basePrice) : basePrice

  return (
    <Card className="group border-border/40 bg-card hover:bg-muted/5 hover:border-primary/20 transition-all duration-300 rounded-2xl overflow-hidden shadow-none h-full min-w-0 max-w-full flex flex-col p-0">
      <CardContent className="p-0 flex h-full min-w-0 max-w-full flex-col">
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted/10">
          <Image
            src={thumb}
            alt=""
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 1024px) 90vw, 480px"
          />
          <div className="absolute left-4 top-4 flex gap-2">
            <Badge className="bg-white text-primary border-none px-2.5 py-1 rounded-lg font-bold text-[10px] shadow-sm">
              {level}
            </Badge>
            <Badge
              className={cn(
                'border-none px-2.5 py-1 rounded-lg font-bold text-[10px] shadow-sm text-white',
                mode === 'LIVE' ? 'bg-red-500' : 'bg-primary'
              )}
            >
              {mode === 'LIVE' ? 'Tuyển sinh' : 'Tự học'}
            </Badge>
          </div>
        </div>
        <div className="p-5 flex flex-col min-w-0 space-y-4">
          <div className="space-y-1 min-w-0">
            <p className="line-clamp-2 text-lg font-bold tracking-tight text-foreground/90 leading-tight group-hover:text-primary transition-colors">
              {title}
            </p>
            {item.code ? (
              <p className="truncate text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em]">
                {item.code}
              </p>
            ) : null}
          </div>

          <div className="space-y-3 pt-3 border-t border-border/20">
            {item.instructor?.id ? (
              <Link
                href={`/dashboard/instructors/${item.instructor.id}?name=${encodeURIComponent(item.instructor.displayName || '')}`}
                className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <span className="truncate">Giảng viên: {item.instructor.displayName}</span>
              </Link>
            ) : null}

            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="min-w-0">
                <div className={cn("text-lg font-bold tabular-nums tracking-tighter", hasDiscount ? "text-destructive" : "text-primary")}>
                {formatNumber(displayPrice)} <span className="text-[10px] uppercase ml-0.5">đ</span>
                </div>
                {hasDiscount ? (
                  <div className="text-[11px] font-bold tabular-nums text-muted-foreground/50 line-through">
                    {formatNumber(basePrice)} đ
                  </div>
                ) : null}
              </div>
              <Button size="sm" className="h-9 px-5 rounded-xl font-bold text-[10px] uppercase tracking-wider shadow-none group-hover:scale-[1.02] transition-transform" asChild>
                <Link href={`/dashboard/available-courses/class/${item.id}?mode=${mode}`}>Chi tiết</Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function RecommendedCoursesSection({ jlptTarget }: { jlptTarget: string }) {
  const level = useMemo(() => getLevelFromJlptTarget(jlptTarget), [jlptTarget])

  const liveQuery = useAcademyClassCatalog({
    mode: 'LIVE',
    level,
    upcomingRegistration: true,
    limit: 6,
  } as any)

  const vodQuery = useAcademyClassCatalog({
    mode: 'VOD',
    level,
    limit: 6,
  } as any)

  const liveItems: CatalogItem[] = (liveQuery.data?.items ?? []).slice(0, 3)
  const vodItems: CatalogItem[] = (vodQuery.data?.items ?? []).slice(0, 3)

  return (
    <Card className="rounded-2xl border-border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Khóa học đề xuất theo mục tiêu của bạn</CardTitle>
        <CardDescription>
          {level ? `Ưu tiên lộ trình ${level}.` : 'Chọn một khóa học phù hợp để bắt đầu.'} Ghi danh khóa học để mở đầy đủ gợi ý học tập cá nhân hóa.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(liveQuery.isLoading || vodQuery.isLoading) && (
          <div className="flex items-center justify-center py-10">
            <Spinner className="size-6 text-primary/40" />
          </div>
        )}

        {!liveQuery.isLoading && !vodQuery.isLoading && liveItems.length === 0 && vodItems.length === 0 && (
          <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
            Chưa có khóa học phù hợp ở thời điểm này.
          </div>
        )}

        {liveItems.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">Lớp trực tiếp đang tuyển sinh</div>
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs font-bold" asChild>
                <Link href={level ? `/dashboard/available-courses?level=${level}` : '/dashboard/available-courses'}>Xem tất cả</Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {liveItems.map((it) => (
                <CourseCard key={it.id} item={it} mode="LIVE" />
              ))}
            </div>
          </div>
        )}

        {vodItems.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">Khóa học tự học</div>
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs font-bold" asChild>
                <Link href={level ? `/dashboard/available-courses?type=vod&level=${level}` : '/dashboard/available-courses?type=vod'}>Xem tất cả</Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {vodItems.map((it) => (
                <CourseCard key={it.id} item={it} mode="VOD" />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

