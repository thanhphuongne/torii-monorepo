'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useParams, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { profileApi } from '@/lib/api/services/profile-api'
import { useAcademyClassCatalog } from '@/lib/api/services/academy-course-api'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { Spinner } from '@workspace/ui/components/spinner'
import { Avatar, AvatarFallback, AvatarImage } from '@workspace/ui/components/avatar'
import { Separator } from '@workspace/ui/components/separator'
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Star,
  GraduationCap,
  User,
} from 'lucide-react'
import { formatNumber } from '@/utils/format-utils'
import { cn } from '@workspace/ui/lib/utils'

export default function InstructorPublicPage() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const instructorId = params.id
  const fallbackName = searchParams.get('name')

  // 1. Fetch instructor profile
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['public-profile', instructorId],
    queryFn: () => profileApi.getPublicProfile(instructorId),
    enabled: !!instructorId,
  })

  // 2. Fetch instructor's live classes
  const { data: liveCourses, isLoading: isLiveLoading } = useAcademyClassCatalog({
    mode: 'LIVE',
    instructorId: instructorId,
  })

  // 3. Fetch instructor's VOD courses
  const { data: vodCourses, isLoading: isVodLoading } = useAcademyClassCatalog({
    mode: 'VOD',
    instructorId: instructorId,
  })

  const isLoading = isProfileLoading || isLiveLoading || isVodLoading
  const name = profile?.displayName || fallbackName || 'Giảng viên'
  const bio = profile?.userMetadata?.bio || 'Giảng viên giàu kinh nghiệm tại Torii Academy.'
  const avatarUrl = profile?.avatarUrl

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-4">
        <Spinner className="size-8 text-primary/40" />
        <p className="text-xs font-bold text-muted-foreground animate-pulse">Đang tải hồ sơ giảng viên...</p>
      </div>
    )
  }

  const liveItems = liveCourses?.items || []
  const vodItems = vodCourses?.items || []
  const totalCourses = liveItems.length + vodItems.length

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 pb-10 animate-in fade-in duration-500">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2" asChild>
          <Link href="/dashboard/available-courses">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại khám phá
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="space-y-5">
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            <Avatar className="size-24 border self-center">
              <AvatarImage src={avatarUrl ?? undefined} className="object-cover" />
              <AvatarFallback className="text-xl font-semibold">
                {name[0]}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1 space-y-2">
              <Badge variant="secondary" className="w-fit">
                Giảng viên
              </Badge>
              <CardTitle className="text-2xl md:text-3xl">
                {name}
              </CardTitle>
              <CardDescription className="text-sm md:text-base leading-relaxed text-muted-foreground">
                {bio}
              </CardDescription>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <BookOpen className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">Khóa học:</span>
              <span className="font-medium">{totalCourses}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Star className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">Đánh giá:</span>
              <span className="font-medium">4.9</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="space-y-8">
        {liveItems.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Lớp trực tiếp đang mở</h2>
              <Badge variant="outline">{liveItems.length} lớp</Badge>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {liveItems.map((klass: any) => (
                <CourseCard key={klass.id} klass={klass} mode="LIVE" />
              ))}
            </div>
          </section>
        )}

        {vodItems.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Khóa học tự học</h2>
              <Badge variant="outline">{vodItems.length} khóa</Badge>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {vodItems.map((klass: any) => (
                <CourseCard key={klass.id} klass={klass} mode="VOD" />
              ))}
            </div>
          </section>
        )}

        {liveItems.length === 0 && vodItems.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <BookOpen className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Giảng viên hiện chưa có khóa học nào được đăng tải.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function CourseCard({ klass, mode }: { klass: any; mode: 'LIVE' | 'VOD' }) {
  const profile = klass.cohort?.courseProfile ?? klass.courseProfile
  const thumb = klass.thumbnailUrl || profile?.thumbnailUrl || '/course-placeholder.jpg'
  const title = klass.name || klass.title || profile?.title || 'Khóa học'
  const level = profile?.level || '—'

  // Normalize price
  const basePrice = Number(klass.price || 0)
  const discountPrice = klass.discountPrice ? Number(klass.discountPrice) : null
  const hasDiscount = discountPrice !== null && discountPrice > 0 && discountPrice < basePrice
  const displayPrice = hasDiscount ? discountPrice : basePrice

  return (
    <Card className="group border-border/40 bg-card hover:bg-muted/5 hover:border-primary/20 transition-all duration-300 rounded-2xl overflow-hidden shadow-none h-full flex flex-col p-0">
      <CardContent className="p-0 flex h-full flex-col">
        <div className="relative aspect-[16/10] w-full bg-muted/10 overflow-hidden">
          <Image src={thumb} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px" />
          <div className="absolute top-4 left-4 flex gap-2">
            <Badge className="bg-white text-primary border-none px-2.5 py-1 rounded-lg font-bold text-[10px] shadow-sm">
              {level}
            </Badge>
            <Badge className={cn(
              "border-none px-2.5 py-1 rounded-lg font-bold text-[10px] shadow-sm text-white",
              mode === 'LIVE' ? 'bg-red-500' : 'bg-primary'
            )}>
              {mode === 'LIVE' ? 'Tuyển sinh' : 'Tự học'}
            </Badge>
          </div>
        </div>
        <div className="p-5 flex flex-col min-w-0 space-y-4">
          <div className="space-y-1">
            <h3 className="text-lg font-bold tracking-tight text-foreground/90 leading-tight group-hover:text-primary transition-colors line-clamp-2 min-h-[3.5rem]">{title}</h3>
            <p className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em]">{klass.code}</p>
          </div>

          {klass.instructor?.id ? (
            <Link
              href={`/dashboard/instructors/${klass.instructor.id}?name=${encodeURIComponent(klass.instructor.displayName || '')}`}
              className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <User className="size-4 text-primary/60" />
              <span className="truncate">Giảng viên: {klass.instructor.displayName}</span>
            </Link>
          ) : null}

          {mode === 'LIVE' && klass.term?.openingDate ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="size-4 text-primary/60" />
              <span>Khai giảng: {new Date(klass.term.openingDate).toLocaleDateString('vi-VN')}</span>
            </div>
          ) : null}

          <Separator />

          <div className="mt-auto flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className={cn(
                'text-lg font-bold tabular-nums tracking-tighter',
                hasDiscount ? 'text-destructive' : 'text-primary'
              )}>
                {formatNumber(displayPrice)} <span className="text-[10px] uppercase ml-0.5">đ</span>
              </span>
              {hasDiscount && (
                <span className="text-[11px] text-muted-foreground/50 line-through font-bold">{formatNumber(basePrice)} đ</span>
              )}
            </div>
            <Button size="sm" className="h-9 px-5 rounded-xl font-bold text-[10px] uppercase tracking-wider shadow-none group-hover:scale-[1.02] transition-transform" asChild>
              <Link href={`/dashboard/available-courses/class/${klass.id}?mode=${mode}`}>Chi tiết</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
