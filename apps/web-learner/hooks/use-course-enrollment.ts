import { useState, useEffect } from 'react'
import { academyEnrollmentApi as enrollmentApi } from '@/lib/api/services/academy-enrollment-api'
import { useAppSelector } from '@/hooks/hooks'
import { toast } from '@workspace/ui/components/sonner'
import { useRouter } from 'next/navigation'
import { type AcademyEnrollmentModel as EnrollmentResponseDTO } from '@workspace/schemas'

/** Trang marketing course profile: không tự POST ghi danh — học viên qua checkout / discovery. */
export function useCourseEnrollment(courseProfileId: string, courseSlug: string) {
    const [isEnrolled, setIsEnrolled] = useState(false)
    const [isExpired, setIsExpired] = useState(false)
    const [enrollment, setEnrollment] = useState<EnrollmentResponseDTO | null>(null)
    const [hasNewerVersion, setHasNewerVersion] = useState(false)
    const [isLoadingEnrollment, setIsLoadingEnrollment] = useState(false)
    const [isToggling, setIsToggling] = useState(false)
    const [isEnrolling, setIsEnrolling] = useState(false)

    const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated)
    const user = useAppSelector((state) => state.auth.user)
    const router = useRouter()

    useEffect(() => {
        if (isAuthenticated && user?.id && courseProfileId) {
            checkEnrollmentStatus()
        }
    }, [isAuthenticated, user?.id, courseProfileId])

    const checkEnrollmentStatus = async () => {
        try {
            setIsLoadingEnrollment(true)
            const list = await enrollmentApi.getMyEnrollments({ page: 1, limit: 100 })
            const rows = list.data ?? []
            const match = rows.find(
                (e) =>
                    e.courseProfileId === courseProfileId &&
                    (e.status === 'ACTIVE' || e.status === 'COMPLETED'),
            )
            const cancelled = rows.find(
                (e) =>
                    e.courseProfileId === courseProfileId &&
                    e.status === 'CANCELLED',
            )
            const expiredOnly = rows.find(
                (e) =>
                    e.courseProfileId === courseProfileId &&
                    e.status === 'EXPIRED',
            )
            if (cancelled && !match) {
                setIsEnrolled(false)
                setEnrollment(null)
                setIsExpired(false)
            } else if (match) {
                setIsEnrolled(true)
                setEnrollment(match)
                if (match.expiresAt) {
                    const expiresAt = new Date(match.expiresAt)
                    setIsExpired(expiresAt < new Date() || match.status === 'EXPIRED')
                } else if (match.status === 'EXPIRED') {
                    setIsExpired(true)
                } else {
                    setIsExpired(false)
                }
            } else if (expiredOnly) {
                setIsEnrolled(false)
                setEnrollment(expiredOnly)
                setIsExpired(true)
            } else {
                setIsEnrolled(false)
                setEnrollment(null)
                setIsExpired(false)
            }
            // Mocking as hasNewerVersion is not yet in the refined schema
            // if (result.hasNewerVersion) {
            //     setHasNewerVersion(result.hasNewerVersion)
            // }
            setHasNewerVersion(false)
        } catch (error) {
            console.error('Failed to check enrollment status:', error)
        } finally {
            setIsLoadingEnrollment(false)
        }
    }

    const handleEnroll = async () => {
        if (!isAuthenticated) {
            toast.error('Vui lòng đăng nhập để đăng ký khóa học')
            router.push('/login')
            return
        }

        try {
            setIsEnrolling(true)
            toast.info('Vui lòng chọn gói tự học hoặc lớp trực tiếp và hoàn tất đăng ký qua thanh toán.', {
                description: 'Trang giới thiệu khóa học không tự ghi danh. Hệ thống sẽ chuyển bạn tới Khám phá hoặc trang thanh toán.',
            })
            router.push('/discovery')
        } catch (error: any) {
            console.error('Failed to enroll:', error)
            toast.error(error?.response?.data?.message || 'Không thể đăng ký khóa học')
        } finally {
            setIsEnrolling(false)
        }
    }

    return {
        isEnrolled,
        isExpired,
        enrollment,
        hasNewerVersion,
        isLoadingEnrollment,
        isToggling,
        isEnrolling,
        isAuthenticated,
        handleEnroll
    }
}
