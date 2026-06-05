'use client'

import { Button } from '@workspace/ui/components/button'
import { PlayCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCourseEnrollment } from '@/hooks/use-course-enrollment'

interface CourseHeroActionsProps {
    courseProfileId: string
    courseSlug: string
}

export function CourseHeroActions({ courseProfileId, courseSlug }: CourseHeroActionsProps) {
    const router = useRouter()
    const { isEnrolled, isExpired, isLoadingEnrollment } = useCourseEnrollment(courseProfileId, courseSlug)

    if (isLoadingEnrollment) {
        return <div className="h-12 w-40 bg-muted animate-pulse rounded-md" />
    }

    if (!isEnrolled || isExpired) {
        return null
    }

    return (
        <div className="pt-6">
<Button
                size="lg"
                className="gap-2 text-base font-semibold shadow-lg transition-all hover:shadow-xl"
                onClick={() => router.push(`/courses/${courseSlug}/learn`)}
            >
                <PlayCircle className="h-5 w-5" />
                Tiếp tục học
            </Button>
        </div>
    )
}
