'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@workspace/ui/components/button'
import { formatDate } from '@/utils/format-utils'
import { Card, CardContent } from '@workspace/ui/components/card'
import { ArrowLeft, Download, Share2 } from 'lucide-react'
import { academyCourseApi as courseApi } from '@/lib/api/services/academy-course-api'
import { certificateApi } from '@/lib/api/services/certificate-api'
import { useAcademyEnrollmentCheck } from '@/lib/api/services/academy-enrollment-api'
import { isVodDeliveryFromEnrollment } from '@/lib/academy/is-vod-delivery'
import { toast } from 'sonner'

export default function CourseCertificatePage() {
    const params = useParams()
    const router = useRouter()
    const searchParams = useSearchParams()
    const courseId = params.courseId as string
    const requestedMode = searchParams.get('mode')

    const { data: enrollmentData, error: enrollmentError, isLoading: enrollmentLoading } =
        useAcademyEnrollmentCheck(courseId)

    const enrollment = enrollmentData?.enrollment
    const isModeDetermined = !!enrollmentData
    const isVod = isVodDeliveryFromEnrollment(enrollment, requestedMode)
    const learnHref = `/courses/${courseId}/learn${isVod ? '?mode=VOD' : ''}`

    const [course, setCourse] = useState<{ title: string } | null>(null)
    const [certificate, setCertificate] = useState<any>(null)
    const [detailLoading, setDetailLoading] = useState(false)
    const [downloading, setDownloading] = useState(false)
    const handledGateRef = useRef(false)

    useEffect(() => {
        const forbidden =
            (enrollmentError as any)?.response?.status === 403 ||
            (isModeDetermined && enrollmentData && !enrollmentData.isEnrolled)
        if (!handledGateRef.current && forbidden) {
            handledGateRef.current = true
            toast.error('Bạn không có quyền truy cập hoặc chưa được ghi danh vào khóa học này.')
            router.replace('/dashboard/my-courses')
        }
    }, [enrollmentData, enrollmentError, isModeDetermined, router])

    useEffect(() => {
        if (!courseId || !isModeDetermined || !enrollmentData?.isEnrolled) return

        let cancelled = false
        ;(async () => {
            try {
                setDetailLoading(true)
                setCertificate(null)
                setCourse(null)

                const profileId = enrollment?.courseProfileId
                const certQuery = isVod ? { vodPackageId: courseId } : { liveClassId: courseId }

                const [certs, courseData] = await Promise.all([
                    certificateApi.getAllCertificates(certQuery),
                    profileId ? courseApi.getCourseById(profileId).catch(() => null) : Promise.resolve(null),
                ])
                if (cancelled) return

                if (certs.data?.length) setCertificate(certs.data[0])
                const resolvedTitle =
                    courseData?.title ?? courseData?.name ?? enrollment?.courseTitle
                if (resolvedTitle) setCourse({ title: resolvedTitle })
            } catch (e) {
                console.error('Certificate page load error:', e)
            } finally {
                if (!cancelled) setDetailLoading(false)
            }
        })()

        return () => {
            cancelled = true
        }
    }, [
        courseId,
        isModeDetermined,
        enrollmentData?.isEnrolled,
        enrollment?.courseProfileId,
        enrollment?.courseTitle,
        isVod,
    ])

    const loading = enrollmentLoading || !isModeDetermined || detailLoading

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-muted-foreground">Đang tải...</p>
            </div>
        )
    }

    if (!enrollmentData?.isEnrolled) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-muted-foreground">Đang chuyển hướng...</p>
            </div>
        )
    }

    if (!course) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-muted-foreground">Không tìm thấy khóa học</p>
            </div>
        )
    }

    const handleDownload = async () => {
        if (!certificate) {
            toast.error('Chưa có thông tin chứng chỉ để tải xuống')
            return
        }

        try {
            setDownloading(true)
            const blob = await certificateApi.downloadCertificatePdfById(certificate.id)
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `certificate-${certificate.certificateCode || certificate.id}.pdf`)
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)
            toast.success('Đã tải xuống chứng chỉ thành công')
        } catch (error) {
            console.error('Download error:', error)
            toast.error('Có lỗi xảy ra khi tải xuống chứng chỉ')
        } finally {
            setDownloading(false)
        }
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="border-b border-border bg-background">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center gap-4">
                        <Link href={learnHref}>
                            <Button variant="ghost" size="icon" className="rounded-full">
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-foreground">Chứng chỉ hoàn thành</h1>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-4xl">
                <Card className="border-2">
                    <CardContent className="p-12">
                        <div className="text-center space-y-6">
                            <div className="border-b-2 border-primary pb-6">
                                <h2 className="text-3xl font-bold text-foreground mb-2">
                                    Chứng chỉ hoàn thành
                                </h2>
                                <p className="text-muted-foreground">
                                    Chứng nhận rằng học viên đã hoàn thành thành công khóa học
                                </p>
                            </div>

                            <div className="py-8">
                                <h3 className="text-2xl font-semibold text-foreground mb-4">
                                    {course.title}
                                </h3>
                                <p className="text-muted-foreground mb-2">
                                    Ngày hoàn thành: {formatDate(new Date())}
                                </p>
                            </div>

                            <div className="border-t-2 border-primary pt-6">
                                <p className="text-sm text-muted-foreground">
                                    Chứng chỉ này được cấp bởi Torii Nihongo
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex items-center justify-center gap-4 mt-6">
                    <Button size="lg" onClick={handleDownload} disabled={downloading || !certificate}>
                        <Download className="mr-2 w-4 h-4" />
                        {downloading ? 'Đang xử lý...' : 'Tải xuống PDF'}
                    </Button>
                    <Button variant="outline" size="lg">
                        <Share2 className="mr-2 w-4 h-4" />
                        Chia sẻ
                    </Button>
                </div>
            </div>
        </div>
    )
}
