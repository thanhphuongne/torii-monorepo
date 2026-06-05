'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'

import { useAcademyClassCatalogById } from '@/lib/api/services/academy-course-api'
import { Button } from '@workspace/ui/components/button'
import { Badge } from '@workspace/ui/components/badge'
import { Card, CardContent } from '@workspace/ui/components/card'
import { Spinner } from '@workspace/ui/components/spinner'
import { Progress } from '@workspace/ui/components/progress'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@workspace/ui/components/accordion'
import { useAcademyEnrollmentCheck } from '@/lib/api/services/academy-enrollment-api'
import { academyClassReviewHooks } from '@/lib/api/services/academy-class-reviews'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  Clock,
  FileText,
  PlayCircle,
  Users,
  ShieldCheck,
  Star,
  Zap,
  ChevronRight,
  GraduationCap,
  Gift
} from 'lucide-react'
import { formatNumber } from '@/utils/format-utils'
import { useAppSelector } from '@/hooks/hooks'
import { Avatar, AvatarFallback, AvatarImage } from '@workspace/ui/components/avatar'
import { Separator } from '@workspace/ui/components/separator'
import { cn } from '@workspace/ui/lib/utils'
import { CourseInstructor } from '@/components/courses/course-instructor'

const WEEKDAY_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

export default function ClassCatalogDetailPage() {
  const params = useParams<{ deliveryScopeId: string }>()
  const searchParams = useSearchParams()
  const deliveryScopeId = typeof params?.deliveryScopeId === 'string' ? params.deliveryScopeId : ''
  const modeParam = (searchParams.get('mode') || '').toUpperCase()

  const mode = modeParam === 'LIVE' || modeParam === 'VOD' ? (modeParam as 'LIVE' | 'VOD') : undefined
  const { data: klass, isLoading } = useAcademyClassCatalogById(deliveryScopeId || undefined, mode)
  const { isAuthenticated } = useAppSelector((state) => state.auth)

  const enrollmentCheckTargetId = isAuthenticated && deliveryScopeId ? deliveryScopeId : ''
  const { data: enrollmentData, isLoading: enrollmentLoading } = useAcademyEnrollmentCheck(enrollmentCheckTargetId)

  const isLIVE = mode === 'LIVE' || klass?.mode === 'LIVE'
  const isVOD = mode === 'VOD' || klass?.mode === 'VOD'

  const { data: liveReviewsResponse } = academyClassReviewHooks.useListByLiveClass(deliveryScopeId, { limit: 10, offset: 0 })
  const { data: vodReviewsResponse } = academyClassReviewHooks.useListByVodPackage(deliveryScopeId, { limit: 10, offset: 0 })

  const reviews = isLIVE
    ? (liveReviewsResponse?.data?.data?.items ?? [] as any[])
    : (vodReviewsResponse?.data?.data?.items ?? [] as any[])

  const totalReviews = isLIVE
    ? (liveReviewsResponse?.data?.data?.total ?? 0)
    : (vodReviewsResponse?.data?.data?.total ?? 0)

  const avgRating = reviews && reviews.length > 0
    ? (reviews.reduce((acc: number, r: any) => acc + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : "5.0"

  const profile = klass?.courseProfile
  const chapters = Array.isArray(profile?.modules)
    ? profile.modules.map((mod: any) => ({
      id: mod.id,
      title: mod.title,
      items: (mod.lessons ?? []).map((lesson: any) => ({
        id: lesson.id,
        title: lesson.title,
        kind: lesson.type || 'VIDEO',
      })),
    }))
    : []

  const lessonCount = chapters.reduce((acc: number, chapter: any) => {
    const chapterItems = Array.isArray(chapter?.items) ? chapter.items : []
    return acc + chapterItems.length
  }, 0)

  const schedules = Array.isArray(klass?.liveSchedules) ? klass.liveSchedules : []
  const activeEnrollmentCount =
    klass?.liveEnrollment?.activeEnrollmentCount ?? klass?._count?.enrollments ?? 0

  const checkoutHref =
    klass && deliveryScopeId
      ? isLIVE
        ? `/checkout/${klass.cohortId ?? deliveryScopeId}?type=LIVE&liveClassId=${encodeURIComponent(deliveryScopeId)}`
        : `/checkout/${deliveryScopeId}?type=VOD`
      : '#'

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="size-10 rounded-2xl border-2 border-primary/20 border-t-primary animate-spin" />
        <p className="text-xs font-bold text-muted-foreground animate-pulse">Đang tải thông tin khóa học...</p>
      </div>
    )
  }

  if (!klass) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-card border border-dashed rounded-3xl">
        <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <ShieldCheck className="size-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold">Không tìm thấy lớp</h2>
        <p className="text-muted-foreground text-sm mt-2 max-w-md">Lớp không tồn tại hoặc đã ngừng mở bán.</p>
        <Button className="mt-8 font-bold rounded-xl px-8" variant="default" asChild>
          <Link href="/dashboard/available-courses">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại danh sách
          </Link>
        </Button>
      </div>
    )
  }

  const thumb = klass.thumbnailUrl || profile?.thumbnailUrl || "https://images.unsplash.com/photo-1544928147-79a2dbc1f389?q=80&w=1974&auto=format&fit=crop"
  const jlptLevel = profile?.level
  const title = klass.name || klass.title || profile?.title || 'Khóa học'
  const subtitle = profile?.title && title !== profile.title ? profile.title : null
  const isEnrolled = !!enrollmentData?.isEnrolled
  const enrollment = enrollmentData?.enrollment as any;
  const progress = enrollment?.progress || (enrollmentData as any)?.progress || 0;

  const openingDate = klass.cohort?.startDate || klass.term?.openingDate;
  const instructorName = klass.instructor?.displayName || profile?.instructorName || "Torii Instructor";

  const ctaButton = (() => {
    const giftHref = `${checkoutHref}${checkoutHref.includes('?') ? '&' : '?'}gift=true`

    if (isVOD) {
      if (enrollmentLoading) {
        return (
          <Button className="w-full h-12 font-bold rounded-xl" size="lg" disabled>
            Đang kiểm tra...
          </Button>
        )
      }

      if (isEnrolled) {
        return (
          <div className="space-y-3">
            <Button className="w-full h-12 font-bold rounded-xl" size="lg" asChild>
              <Link href={deliveryScopeId ? `/courses/${deliveryScopeId}/learn` : '#'}>
                Tiếp tục học <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button className="w-full h-12 font-bold rounded-xl border-primary text-primary hover:bg-primary/5" variant="outline" size="lg" asChild>
              <Link href={giftHref}>
                Tặng khóa học <Gift className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        )
      }
    }

    if (isEnrolled) {
      return (
        <div className="space-y-3">
          <Button
            className="w-full h-12 font-bold rounded-xl text-md shadow-lg shadow-primary/20"
            size="lg"
            asChild
          >
            <Link href={deliveryScopeId ? `/courses/${deliveryScopeId}/learn` : '#'}>
              Tiếp tục học <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button className="w-full h-12 font-bold rounded-xl border-primary text-primary hover:bg-primary/5" variant="outline" size="lg" asChild>
            <Link href={giftHref}>
              Tặng khóa học <Gift className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      )
    }

    return (
      <Button
        className="w-full h-12 font-bold rounded-xl text-md shadow-lg shadow-primary/20"
        size="lg"
        asChild
      >
        <Link href={checkoutHref}>
          Đăng ký học ngay
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    )
  })()

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      {/* 0. Top Navigation & Header */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4">
          <Button variant="ghost" size="sm" className="w-fit -ml-2 text-muted-foreground/60 hover:text-foreground text-[10px] font-bold uppercase tracking-wider h-8" asChild>
            <Link href="/dashboard/available-courses">
              <ArrowLeft className="mr-2 h-3 w-3" />
              Quay lại danh sách
            </Link>
          </Button>

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-10 pb-8 border-b border-border/60">
            <div className="flex-1 space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={isLIVE ? "destructive" : "default"} className="rounded-md font-bold text-[9px] uppercase tracking-tighter px-2 py-0.5">
                  {isLIVE ? 'Lớp học trực tiếp' : 'Khóa học tự học'}
                </Badge>
                {jlptLevel && (
                  <Badge variant="secondary" className="rounded-md font-bold text-[9px] uppercase tracking-tighter px-2 py-0.5">
                    JLPT {jlptLevel}
                  </Badge>
                )}
                <span className="text-[9px] font-bold text-muted-foreground/40 bg-muted/20 px-2 py-0.5 rounded-md border border-border/5">
                  {klass.code}
                </span>
              </div>

              <div className="space-y-1">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground leading-tight">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-sm md:text-base text-muted-foreground/60 font-medium">
                    {subtitle}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-8 gap-y-3 py-2">
                <div className="flex items-center gap-2.5">
                  <div className="size-6 rounded-lg bg-primary/5 flex items-center justify-center text-primary/40 border border-primary/10">
                    <Users className="size-2.5" />
                  </div>
                  <div className="space-y-0">
                    <p className="text-[8px] font-bold text-muted-foreground/40 leading-none uppercase tracking-tight">Giảng viên</p>
                    {klass.instructor?.id ? (
                      <Link
                        href={`/dashboard/instructors/${klass.instructor.id}?name=${encodeURIComponent(instructorName)}`}
                        className="text-xs font-bold text-foreground/80 hover:text-primary transition-colors"
                      >
                        {instructorName}
                      </Link>
                    ) : (
                      <p className="text-xs font-bold text-foreground/80">{instructorName}</p>
                    )}
                  </div>
                </div>

                {openingDate && (
                  <div className="flex items-center gap-2.5">
                    <div className="size-6 rounded-lg bg-primary/5 flex items-center justify-center text-primary/40 border border-primary/10">
                      <Calendar className="size-2.5" />
                    </div>
                    <div className="space-y-0">
                      <p className="text-[8px] font-bold text-muted-foreground/40 leading-none uppercase tracking-tight">Khai giảng</p>
                      <p className="text-xs font-bold text-foreground/80">{new Date(openingDate).toLocaleDateString('vi-VN')}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2.5">
                  <div className="size-6 rounded-lg bg-primary/5 flex items-center justify-center text-primary/40 border border-primary/10">
                    <BookOpen className="size-2.5" />
                  </div>
                  <div className="space-y-0">
                    <p className="text-[8px] font-bold text-muted-foreground/40 leading-none uppercase tracking-tight">Nội dung</p>
                    <p className="text-xs font-bold text-foreground/80">{lessonCount} bài giảng</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="size-6 rounded-lg bg-primary/5 flex items-center justify-center text-primary/40 border border-primary/10">
                    <Star className="size-2.5" />
                  </div>
                  <div className="space-y-0">
                    <p className="text-[8px] font-bold text-muted-foreground/40 leading-none uppercase tracking-tight">Học viên</p>
                    <p className="text-xs font-bold text-foreground/80">{activeEnrollmentCount} đã học</p>
                  </div>
                </div>
              </div>

              <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground/70 leading-relaxed font-medium line-clamp-4">
                {profile?.description ? (
                  <div dangerouslySetInnerHTML={{ __html: profile.description }} />
                ) : (
                  <p>Khóa học này được thiết kế để cung cấp cho bạn một lộ trình học tập hiệu quả, tập trung vào thực tế và các kiến thức trọng tâm.</p>
                )}
              </div>
            </div>

            <div className="w-full md:w-[320px] aspect-video relative rounded-2xl overflow-hidden border border-border/40 bg-muted/5 group shrink-0 shadow-lg">
              <Image src={thumb} alt="" fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main content Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        <div className="xl:col-span-2 space-y-10">

          {/* Section: Instructor */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-6 w-1 rounded-full bg-primary/40" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-foreground/80">Thông tin giảng viên</h2>
            </div>
            <CourseInstructor course={{ ...profile, lecturer: klass.instructor } as any} />
          </section>

          {/* Section: Curriculum */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-6 w-1 rounded-full bg-primary/40" />
                <h2 className="text-sm font-bold uppercase tracking-widest text-foreground/80">Chương trình đào tạo</h2>
              </div>
              <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">{lessonCount} bài học</span>
            </div>

            <Accordion type="single" collapsible className="w-full space-y-3">
              {chapters.map((chapter: any, index: number) => (
                <AccordionItem
                  key={chapter.id || index}
                  value={`item-${index}`}
                  className="border-border/40 rounded-xl bg-card/50 overflow-hidden shadow-none px-4"
                >
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-4 text-left">
                      <span className="text-xs font-bold text-primary/40 tabular-nums">{(index + 1).toString().padStart(2, '0')}</span>
                      <span className="text-sm font-bold text-foreground/80">{chapter.title}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 space-y-1">
                    {chapter.items?.map((item: any, itemIdx: number) => (
                      <div key={item.id || itemIdx} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group">
                        <div className="size-7 rounded-lg bg-muted/20 flex items-center justify-center text-muted-foreground/40 group-hover:text-primary/60 transition-colors border border-border/10">
                          {item.kind === 'VIDEO' ? <PlayCircle className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                        </div>
                        <p className="flex-1 text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors truncate">
                          {item.title}
                        </p>
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>

          {/* Section: Reviews */}
          <section className="space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-6 w-1 rounded-full bg-primary/40" />
                <h2 className="text-sm font-bold uppercase tracking-widest text-foreground/80">Đánh giá</h2>
              </div>
              <div className="flex items-center gap-1 text-sm font-bold text-primary/60">
                <Star className="size-4 fill-primary/20" />
                <span>{avgRating} <span className="opacity-40">({totalReviews})</span></span>
              </div>
            </div>

            <div className="grid gap-4">
              {reviews.map((r: any) => (
                <Card key={r.id} className="shadow-none border-border/40 bg-card rounded-xl hover:bg-muted/5 transition-colors">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8 border border-border/40">
                          <AvatarImage src={r.user?.avatarUrl} />
                          <AvatarFallback className="text-[10px] font-bold">
                            {(r.user?.displayName || 'U')[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-xs font-bold text-foreground/80">{r.user?.displayName || 'Học viên'}</p>
                          <p className="text-[9px] font-bold text-muted-foreground/40">{new Date(r.createdAt).toLocaleDateString('vi-VN')}</p>
                        </div>
                      </div>
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={cn("size-3", i < r.rating ? "text-primary/60 fill-primary/20" : "text-muted-foreground/10")} />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs font-medium text-muted-foreground leading-relaxed">{r.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

        </div>

        {/* 3. Sidebar */}
        <aside className="space-y-6 xl:sticky xl:top-24 mt-0">
          {isEnrolled && (
            <Card className="shadow-none border-primary/20 bg-primary/5 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">Tiến trình</p>
                <p className="text-xs font-black text-primary">{progress}%</p>
              </div>
              <Progress value={progress} className="h-1 bg-primary/10" />
            </Card>
          )}

          <Card className="shadow-none border-border/40 bg-card rounded-2xl overflow-hidden">
            <CardContent className="p-6 space-y-8">
              <div className="space-y-1.5">
                <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">Học phí trọn gói</p>
                {(() => {
                  const basePrice = Number(klass?.price ?? 0)
                  const discountPrice = Number(klass?.discountPrice ?? 0)
                  const hasDiscount = discountPrice > 0 && discountPrice < basePrice
                  const displayPrice = hasDiscount ? discountPrice : basePrice
                  return (
                    <div className="space-y-1 text-left">
                      <p className="text-3xl font-bold text-foreground/90 tabular-nums">
                        {displayPrice === 0 ? 'Miễn phí' : `${formatNumber(displayPrice)}đ`}
                      </p>
                      {hasDiscount && (
                        <p className="text-sm text-muted-foreground/40 line-through font-bold">
                          {formatNumber(basePrice)}đ
                        </p>
                      )}
                    </div>
                  )
                })()}
              </div>

              <div className="space-y-3">
                {ctaButton}
                <div className="flex items-center justify-center gap-1.5 text-[9px] font-bold text-muted-foreground/30 uppercase tracking-widest">
                  <ShieldCheck className="size-3" /> Khóa học đã xác thực
                </div>
              </div>

              <div className="space-y-5 pt-6 border-t border-border/60">
                <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">Lợi ích đặc quyền</p>
                <div className="space-y-4">
                  {[
                    { icon: <Zap className="size-3.5" />, title: 'Học tập hiệu quả', desc: 'Tiết kiệm 50% thời gian' },
                    { icon: <GraduationCap className="size-3.5" />, title: 'Chứng chỉ Torii', desc: 'Cấp sau khi hoàn thành' },
                    { icon: <Gift className="size-3.5" />, title: 'Tài liệu độc quyền', desc: 'Sách bài tập và PDF' }
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <div className="size-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary/40 border border-primary/10 shrink-0">
                        {item.icon}
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-foreground/80">{item.title}</p>
                        <p className="text-[10px] text-muted-foreground/60">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div >
  )
}
