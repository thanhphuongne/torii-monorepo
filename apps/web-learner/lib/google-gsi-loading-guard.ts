/**
 * Google Identity Services: nếu user đóng UI chọn tài khoản mà không hoàn tất,
 * callback credential có thể không được gọi → cần tắt loading bằng:
 * - timer dự phòng
 * - `prompt((notification) => …)` + `shouldEndFlowFromPromptMoment`
 * - (tuỳ màn) listener `window` focus sau khi đóng popup
 *
 * @see https://developers.google.com/identity/gsi/web/reference/js-reference
 */

export type GooglePromptMoment = {
    isNotDisplayed?: () => boolean
    isSkippedMoment?: () => boolean
    isDismissedMoment?: () => boolean
}

export type GoogleGsiLoadingGuard = {
    /** Chỉ hủy timer an toàn; loading vẫn có thể bật — dùng khi cần tách bước. */
    disarm: () => void
    /** Hủy timer + `setLoading(false)` — gọi khi kết thúc flow (thành công / hủy / lỗi). */
    end: () => void
}

export function createGoogleGsiLoadingGuard(
    setLoading: (v: boolean) => void,
    safetyMs = 90_000,
): GoogleGsiLoadingGuard {
    if (typeof window === 'undefined') {
        return {
            disarm: () => {},
            end: () => setLoading(false),
        }
    }
    const timer = window.setTimeout(() => setLoading(false), safetyMs)
    const disarm = () => window.clearTimeout(timer)
    const end = () => {
        disarm()
        setLoading(false)
    }
    return { disarm, end }
}

/** Gọi trong `google.accounts.id.prompt(...)` khi One Tap / FedCM báo dismiss hoặc không hiển thị. */
export function shouldEndFlowFromPromptMoment(notification: unknown): boolean {
    const n = notification as GooglePromptMoment
    return (
        n?.isDismissedMoment?.() === true ||
        n?.isSkippedMoment?.() === true ||
        n?.isNotDisplayed?.() === true
    )
}
