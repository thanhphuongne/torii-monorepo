'use client'

/**
 * Trả về URL dùng cho Avatar (OAuth hoặc R2 public). avatarUrl luôn là URL hợp lệ.
 */
export function useAvatarUrl(avatarUrl: string | null | undefined): string | undefined {
    return avatarUrl || undefined
}
