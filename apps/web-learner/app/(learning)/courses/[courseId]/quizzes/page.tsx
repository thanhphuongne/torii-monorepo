'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@workspace/ui/components/card'
import { Button } from '@workspace/ui/components/button'
import { ArrowLeft } from 'lucide-react'
import { useAcademyClass } from '@/lib/api/services/academy-classes'
import { useAcademyCourseById } from '@/lib/api/services/academy-course-api'

export default function CourseQuizzesPage() {
    const params = useParams()
    const courseId = params.courseId as string
    const { data: classData, isLoading: classLoading } = useAcademyClass(courseId)
    const { data: course, isLoading: courseLoading } = useAcademyCourseById(classData?.courseProfileId)

    const loading = classLoading || courseLoading

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <p className="text-muted-foreground">Đang tải...</p>
            </div>
        )
    }

    if (!course) {
        return (
            <div className="flex justify-center items-center h-screen">
                <p className="text-muted-foreground">Không tìm thấy khóa học</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="border-b border-border bg-background">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center gap-4">
                        <Link href={`/courses/${courseId}/learn`}>
                            <Button variant="ghost" size="icon" className="rounded-full">
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-foreground">Bài kiểm tra</h1>
                            <p className="text-sm text-muted-foreground">{course.title}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-4xl">
                <Card>
                    <CardContent className="p-12 text-center">
                        <p className="text-muted-foreground">Chưa có bài kiểm tra được phát hành</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
