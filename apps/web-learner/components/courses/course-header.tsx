import type { AcademyCourseProfileCreateDTO } from '@workspace/schemas'
import { Badge } from '@workspace/ui/components/badge'
import { Star, Users } from 'lucide-react'
import Image from 'next/image'
import { Avatar, AvatarFallback, AvatarImage } from '@workspace/ui/components/avatar'
import { formatNumber } from '@/utils/format-utils'

interface CourseHeaderProps {
    course: AcademyCourseProfileCreateDTO & {
        id: string;
        jlptLevel?: string;
        lecturer?: any;
        shortDescription?: string;
    }
}

export function CourseHeader({ course }: CourseHeaderProps) {
    const getLevelLabel = (jlptLevel?: string) => {
        const levelMap: Record<string, string> = {
            'N5': 'Sơ cấp',
            'N4': 'Sơ trung cấp',
            'N3': 'Trung cấp',
            'N2': 'Trung cao cấp',
            'N1': 'Cao cấp',
        }
        return (jlptLevel && levelMap[jlptLevel]) || 'Sơ cấp'
    }

    const lecturer = course.lecturer

    return (
        <section className="space-y-6">
            {/* Hero Image */}
            <div className="relative aspect-video w-full overflow-hidden rounded-xl shadow-2xl">
                <Image
                    src={course.thumbnailUrl || '/default-course-thumbnail.jpg'}
                    alt={course.title}
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent flex flex-col justify-end p-6 md:p-8">
                    <Badge className="inline-flex items-center w-fit mb-4 text-xs font-bold uppercase tracking-wider">
                        {getLevelLabel(course.jlptLevel)}
                    </Badge>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight mb-2">
                        {course.title}
                    </h1>
                    {course.shortDescription && (
                        <p className="text-lg md:text-xl font-semibold text-white/90">
                            {course.shortDescription}
                        </p>
                    )}
                </div>
            </div>

            {/* Instructor & Rating Info */}
            <div className="flex flex-wrap items-center gap-6">
                {/* Instructor */}
                {lecturer && (
                    <div className="flex items-center gap-3">
                        <Avatar className="size-12 ring-2 ring-primary/20">
                            <AvatarImage src={lecturer.avatarUrl ?? undefined} className="object-cover" />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                {lecturer.displayName?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">
                                Giảng viên
                            </p>
                            <p className="font-semibold">{lecturer.displayName}</p>
                        </div>
                    </div>
                )}

                {/* Divider */}
                <div className="h-8 w-px bg-border hidden sm:block" />

                {/* Rating */}
                <div className="flex flex-col">
                    <div className="flex items-center gap-1">
                        <Star className="size-4 fill-amber-500 text-amber-500" />
                        <span className="font-bold">{/* (course as any).averageRating?.toFixed(1) || '4.8' */ '4.8'}</span>
                        <span className="text-muted-foreground font-normal ml-1">
                            ({/* formatNumber((course as any).totalReviews || 0) */ formatNumber(12)} đánh giá)
                        </span>
                    </div>
                </div>

                {/* Students */}
                <div className="flex items-center gap-2">
                    <Users className="size-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                        {/* formatNumber((course as any).totalStudents || 0) */ formatNumber(120)} học viên
                    </span>
                </div>
            </div>

            {/* Description */}
            {course.shortDescription && (
                <p className="text-lg leading-relaxed text-muted-foreground">
                    {course.shortDescription}
                </p>
            )}
        </section>
    )
}
