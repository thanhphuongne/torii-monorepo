import type { AcademyEnrollmentModel } from '@workspace/schemas'

/**
 * Cùng quy tắc với trang learn: ưu tiên enrollment (vodPackageId / liveClassId / type / mode),
 * chỉ dùng ?mode=VOD khi enrollment chưa phân loại được.
 */
export function isVodDeliveryFromEnrollment(
    enrollment: AcademyEnrollmentModel | undefined | null,
    requestedMode?: string | null,
): boolean {
    const modeUpper = String(requestedMode ?? '').toUpperCase()
    if (!enrollment) return modeUpper === 'VOD'

    const enrollmentType = String(enrollment.type ?? '').toLowerCase()
    const enrollmentMode = String(enrollment.mode ?? '').toUpperCase()
    const isVodByEnrollment =
        !!enrollment.vodPackageId || enrollmentType === 'vod' || enrollmentMode === 'VOD'
    const isLiveByEnrollment =
        !!enrollment.liveClassId || enrollmentType === 'live' || enrollmentMode === 'LIVE'

    if (isVodByEnrollment) return true
    if (isLiveByEnrollment) return false
    return modeUpper === 'VOD'
}
