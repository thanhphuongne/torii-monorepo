'use client'

import type { AcademyCourseProfileCreateDTO } from '@workspace/schemas'
import { useRouter } from 'next/navigation'
import { Button } from '@workspace/ui/components/button'
import { Award, BookOpen, Clock, Sparkles, Signal } from 'lucide-react'
import Link from 'next/link'
import { toast } from '@workspace/ui/components/sonner'
import { useCourseEnrollment } from '@/hooks/use-course-enrollment'
import { formatCurrency } from '@/utils/format-utils'

interface CourseSidebarProps {
    course: AcademyCourseProfileCreateDTO & {
        id: string;
        slug?: string;
        price?: number | null;
        discountPrice?: number | null;
        validForMonths?: number;
        jlptLevel?: string;
        durationWeeks?: number;
        totalLessons?: number;
    };
}

export function CourseSidebar({ course }: CourseSidebarProps) {
    const router = useRouter()
    const isFree = !course.price || course.price === 0
    const {
        isEnrolled,
        isExpired,
        enrollment,
        isLoadingEnrollment,
        isToggling,
        isEnrolling,
        isAuthenticated,
        handleEnroll,
    } = useCourseEnrollment(course.id, course.slug || '')

    const handlePurchase = async () => {
        if (!isAuthenticated) {
            toast.error('Vui lòng đăng nhập để đăng ký học ngay')
            router.push('/login')
            return
        }

        if (isFree) {
            await handleEnroll()
            return
        }

        router.push(`/checkout/${course.id}`)
    }

    const calculateDiscount = () => {
        if (!course.discountPrice || course.price === 0)
            return null
        const discount = ((Number(course.price) - Number(course.discountPrice)) / Number(course.price)) * 100
        return Math.round(discount)
    }

    const discount = calculateDiscount()

    const getLevelLabel = (jlptLevel?: string) => {
        const levelMap: Record<string, string> = {
            'N5': 'N5',
            'N4': 'N4',
            'N3': 'N3',
            'N2': 'N2',
            'N1': 'N1',
        }
        return (jlptLevel && levelMap[jlptLevel]) || 'N5'
    }

    return (
        <div className="space-y-6">
            {/* Enrollment Card */}
            <div className="bg-card p-6 rounded-2xl border shadow-xl space-y-6">
                <div className="space-y-1">
                    <p className="text-3xl font-bold">
                        {isFree
                            ? 'MIỄN PHÍ'
                            : course.discountPrice
                                ? formatCurrency(Number(course.discountPrice))
                                : formatCurrency(Number(course.price))}
                    </p>
                    {!isFree && course.discountPrice && (
                        <p className="text-sm text-muted-foreground line-through">
                            {formatCurrency(Number(course.price))}
                            {discount && ` (${discount}% OFF)`}
                        </p>
                    )}
                </div>

                <div className="space-y-3">
                    {isEnrolled
                        ? (
                            <div className="flex flex-col gap-3">
                                {isExpired
                                    ? (
                                        <p className="text-center text-sm text-muted-foreground leading-relaxed px-1">
                                            Khóa học đã hết hạn. Bạn không thể tiếp tục truy cập nội dung học tập.
                                        </p>
                                    )
                                    : (
                                        <Button
                                            className="w-full h-12 font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                                            onClick={() => router.push(`/courses/${course.id}/learn`)}
                                        >
                                            Tiếp tục học tập
                                        </Button>
                                    )}

                                {enrollment && enrollment.progress !== undefined && enrollment.progress >= 100 && !isExpired && (
                                    <Button
                                        asChild
                                        variant="outline"
                                        className="w-full h-12 font-bold"
                                    >
                                        <Link href="/dashboard/certificates">
                                            <Award className="mr-2 size-4" /> Tải chứng chỉ
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        )
                        : (
                            <>
                                <Button
                                    className="w-full h-12 bg-primary hover:bg-primary/90 font-bold shadow-lg shadow-primary/20"
                                    onClick={handlePurchase}
                                    disabled={isEnrolling || isLoadingEnrollment}
                                >
                                    {isEnrolling ? 'Đang xử lý...' : isFree ? 'Bắt đầu ngay' : 'Đăng ký học ngay'}
                                </Button>
                            </>
                        )}
                </div>

                <div className="pt-6 border-t space-y-4">
                    <p className="font-bold text-sm">Khóa học bao gồm:</p>
                    <div className="grid gap-3">
                        <div className="flex items-center gap-3 text-sm">
                            <Signal className="size-5 text-primary shrink-0" />
                            <span className="font-medium text-muted-foreground">
                                Trình độ: <span className="text-foreground">JLPT {getLevelLabel(course.jlptLevel)}</span>
                            </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <Clock className="size-5 text-primary shrink-0" />
                            <span className="font-medium text-muted-foreground">
                                Thời lượng: <span className="text-foreground">{course.durationWeeks ? `${course.durationWeeks} tuần` : 'Linh hoạt'}</span>
                            </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <BookOpen className="size-5 text-primary shrink-0" />
                            <span className="font-medium text-muted-foreground">
                                Bài học: <span className="text-foreground">{course.totalLessons} bài học</span>
                            </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <Award className="size-5 text-primary shrink-0" />
                            <span className="font-medium text-muted-foreground">
                                Chứng chỉ hoàn thành
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Related Courses */}
            <div className="space-y-4">
                <h4 className="font-bold text-lg">Khóa học liên quan</h4>
                <div className="space-y-4">
                    {/* Placeholder Card 1 */}
                    <div className="group bg-card rounded-xl overflow-hidden border hover:border-primary/50 transition-all cursor-pointer">
                        <div className="aspect-video relative overflow-hidden bg-muted">
                            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />
                        </div>
                        <div className="p-4 space-y-2">
                            <p className="text-xs font-bold text-primary uppercase">Trung cấp</p>
                            <p className="font-bold text-sm line-clamp-1">Khóa học tiếng Nhật N3</p>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1 text-xs text-yellow-500">
                                    <Sparkles className="size-3 fill-current" />
                                    <span className="text-foreground">4.9</span>
                                </div>
                                <p className="font-bold text-sm">350.000đ</p>
                            </div>
                        </div>
                    </div>

                    {/* Placeholder Card 2 */}
                    <div className="group bg-card rounded-xl overflow-hidden border hover:border-primary/50 transition-all cursor-pointer">
                        <div className="aspect-video relative overflow-hidden bg-muted">
                            <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5" />
                        </div>
                        <div className="p-4 space-y-2">
                            <p className="text-xs font-bold text-primary uppercase">Sơ cấp</p>
                            <p className="font-bold text-sm line-clamp-1">Tiếng Nhật cơ bản cho người mới</p>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1 text-xs text-yellow-500">
                                    <Sparkles className="size-3 fill-current" />
                                    <span className="text-foreground">4.7</span>
                                </div>
                                <p className="font-bold text-sm">250.000đ</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
