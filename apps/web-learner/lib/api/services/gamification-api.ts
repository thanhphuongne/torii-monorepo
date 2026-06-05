import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api-client';
import type {
    StandardApiResponse,
    UserAchievementDTO,
    StreakStatusDTO,
    LeaderboardDTO,
    UserGamificationDTO,
    GamificationHistoryPaginatedResponseDTO
} from '@workspace/schemas';
import { toast } from 'sonner';
import { useEffect, useRef } from 'react';

export const gamificationApi = {
    /**
     * Get user achievements
     */
    async getAchievements(): Promise<UserAchievementDTO[]> {
        const response = await apiClient.get<StandardApiResponse<{ achievements: UserAchievementDTO[] }>>('/api/gamification/achievements');
        if (response.data.success && response.data.data) {
            return response.data.data.achievements;
        }
        throw new Error(response.data.message || 'Failed to fetch achievements');
    },

    /**
     * Get user streak status
     */
    async getStreak(): Promise<StreakStatusDTO> {
        const response = await apiClient.get<StandardApiResponse<StreakStatusDTO>>('/api/gamification/streak');
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to fetch streak');
    },

    /**
     * Record user activity
     */
    async recordActivity(activityType: string, meta?: any): Promise<any> {
        const response = await apiClient.post<StandardApiResponse<any>>('/api/gamification/record-activity', {
            activityType,
            meta
        });
        return response.data;
    },

    /**
     * Mark streak toast as shown for today
     */
    async markToastShown(): Promise<any> {
        const response = await apiClient.post<StandardApiResponse<any>>('/api/gamification/mark-toast-shown');
        return response.data;
    },

    /**
     * Get user's full gamification profile
     */
    async getGamificationProfile(): Promise<UserGamificationDTO> {
        const response = await apiClient.get<StandardApiResponse<UserGamificationDTO>>('/api/gamification/profile');
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to fetch gamification profile');
    },

    /**
     * Get leaderboard
     */
    async getLeaderboard(type: 'global' | 'streak' | 'active' = 'global'): Promise<LeaderboardDTO> {
        const response = await apiClient.get<StandardApiResponse<LeaderboardDTO>>(`/api/gamification/leaderboard?type=${type}`);
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to fetch leaderboard');
    },

    /**
     * Get gamification history (points)
     */
    async getHistory(
        params: { page?: number; limit?: number; type?: string } = {}
    ): Promise<GamificationHistoryPaginatedResponseDTO> {
        const queryParams = new URLSearchParams();

        if (params.page) queryParams.append('page', params.page.toString());
        if (params.limit) queryParams.append('limit', params.limit.toString());
        if (params.type) queryParams.append('type', params.type);

        const response =
            await apiClient.get<
                StandardApiResponse<GamificationHistoryPaginatedResponseDTO>
            >(`/api/gamification/history?${queryParams.toString()}`);

        if (response.data.success && response.data.data) {
            return response.data.data;
        }

        throw new Error(
            response.data.message || 'Failed to fetch gamification history'
        );
    },

    /**
     * Get available point redemption rewards
     */
    async getRewards(): Promise<any[]> {
        const response =
            await apiClient.get<StandardApiResponse<any[]>>(
                '/api/gamification/rewards'
            );

        if (response.data.success && response.data.data) {
            return response.data.data;
        }

        throw new Error(
            response.data.message || 'Failed to fetch rewards'
        );
    },

    /**
     * Redeem points for a reward
     */
    async redeemPoints(rewardId: string): Promise<any> {
        const response =
            await apiClient.post<StandardApiResponse<any>>(
                '/api/gamification/redeem',
                { rewardId }
            );

        if (response.data.success && response.data.data) {
            return response.data.data;
        }

        throw new Error(
            response.data.message || 'Failed to redeem points'
        );
    },

};

/**
 * Hook: Get leaderboard
 */
export function useLeaderboard(type: 'global' | 'streak' | 'active' = 'global') {
    return useQuery({
        queryKey: ['leaderboard', type],
        queryFn: () => gamificationApi.getLeaderboard(type),
        staleTime: 60000, // 1 minute
    });
}

/**
 * Hook: Get user achievements
 */
export function useAchievements() {
    return useQuery({
        queryKey: ['achievements'],
        queryFn: gamificationApi.getAchievements,
    });
}

/**
 * Hook: Get user streak with optional auto-refetch and celebration toasts
 * 
 * Note: Daily check-in happens automatically when users complete learning activities
 * (lessons, quizzes, etc.). This hook just displays the streak status and celebrates
 * milestones when detected.
 */
export function useStreak(options?: { refetchInterval?: number; enableCelebrations?: boolean }) {
    const celebratedRef = useRef<Set<number>>(new Set());

    const query = useQuery({
        queryKey: ['streak'],
        queryFn: gamificationApi.getStreak,
        refetchInterval: options?.refetchInterval,
        staleTime: 30000, // Consider data fresh for 30 seconds
    });

    // Celebrate milestones when streak updates
    useEffect(() => {
        if (!options?.enableCelebrations || !query.data) return;

        const { currentStreak, isActiveToday } = query.data;

        // Only celebrate if active today and haven't celebrated this streak yet
        if (isActiveToday && currentStreak > 0 && !celebratedRef.current.has(currentStreak)) {
            const milestones = [3, 7, 14, 30, 50, 100, 365];
            const isMilestone = milestones.includes(currentStreak);

            if (isMilestone) {
                // Big milestone celebration
                toast.success(`🏆 ${currentStreak}-Day Streak Milestone!`, {
                    description: 'Amazing achievement! Keep up the great work! 🎉',
                    duration: 5000,
                });

                // Trigger confetti animation (if available)
                if (typeof window !== 'undefined' && (window as any).confetti) {
                    (window as any).confetti({
                        particleCount: 100,
                        spread: 70,
                        origin: { y: 0.6 }
                    });
                }
            }

            // Mark as celebrated
            celebratedRef.current.add(currentStreak);
        }
    }, [query.data, options?.enableCelebrations]);

    return query;
}

const ACTIVITY_LABELS: Record<string, string> = {
    LESSON_COMPLETE: 'đã hoàn thành bài học',
    QUIZ_ANSWER: 'đã trả lời câu hỏi',
    VIDEO_WATCH: 'đã xem video bài giảng',
    REVIEW: 'đã xem lại kiến thức',
    PRACTICE: 'đã luyện tập',
    FLASHCARD_REVIEW: 'đã ôn tập thẻ từ',
    EXAM_COMPLETE: 'đã hoàn thành bài thi',
    BLOG_CREATE: 'đã viết bài blog mới',
    COMMENT_CREATE: 'đã để lại bình luận',
    LOGIN: 'đã đăng nhập hằng ngày',
};

/**
 * Hook: Record user activity
 */
export function useRecordActivity() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ type, meta }: { type: string; meta?: any }) =>
            gamificationApi.recordActivity(type, meta),
        onSuccess: (data) => {
            // Check if backend returned XP info
            if (data?.xpGained) {
                const activityLabel = ACTIVITY_LABELS[data.activityType] || 'đã hoàn thành một hoạt động';
                toast.success(`+${data.xpGained} XP: Bạn ${activityLabel}!`, {
                    description: data.streakUpdated ? `Chuỗi hiện tại: ${data.currentStreak} ngày 🔥` : undefined,
                    duration: 3000,
                });
            }

            queryClient.invalidateQueries({ queryKey: ['streak'] });
            queryClient.invalidateQueries({ queryKey: ['gamification-profile'] });
        },
    });
}

/**
 * Hook: Mark streak toast as shown
 */
export function useMarkToastShown() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: gamificationApi.markToastShown,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['streak'] });
        },
    });
}

/**
 * Hook: Manual "check-in" button (for UI purposes)
 * 
 * Since backend doesn't have a dedicated check-in endpoint, this creates
 * a motivational call-to-action that encourages users to do learning activities.
 * The actual streak update happens via backend NATS events when users complete
 * lessons, quizzes, flashcards, etc.
 */
export function useCheckIn() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            // Simulate a check-in action by refetching streak
            // In reality, users need to complete a learning activity to update streak
            await queryClient.invalidateQueries({ queryKey: ['streak'] });

            // Return mock success
            return {
                streakUpdated: false,
                currentStreak: 0,
                achievementsUnlocked: [],
            };
        },
        onMutate: async () => {
            toast.info('📚 Complete a lesson to check in!', {
                description: 'Start learning to build your streak',
                duration: 3000,
            });
        },
        onSuccess: () => {
            // Refetch to get latest streak
            queryClient.invalidateQueries({ queryKey: ['streak'] });
        },
    });
}

/**
 * Hook: Get user's full gamification profile
 */
export function useGamificationProfile() {
    return useQuery({
        queryKey: ['gamification-profile'],
        queryFn: gamificationApi.getGamificationProfile,
        staleTime: 30000,
    });
}

/**
 * Hook: Get gamification history
 */
export function useGamificationHistory(
    params: { page?: number; limit?: number; type?: string } = {}
) {
    return useQuery({
        queryKey: ['gamification-history', params],
        queryFn: () => gamificationApi.getHistory(params),
        staleTime: 30000,
    });
}

/**
 * Hook: Get available rewards
 */
export function useRewards() {
    return useQuery({
        queryKey: ['gamification-rewards'],
        queryFn: gamificationApi.getRewards,
    });
}

/**
 * Hook: Redeem points for a reward
 */
export function useRedeemPoints() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (rewardId: string) =>
            gamificationApi.redeemPoints(rewardId),
        onSuccess: () => {
            // Invalidate and refetch all related queries to ensure UI updates
            queryClient.invalidateQueries({
                queryKey: ['gamification-profile'],
            });
            queryClient.invalidateQueries({
                queryKey: ['gamification-history'],
            });
            queryClient.invalidateQueries({
                queryKey: ['streak'],
            });
            queryClient.invalidateQueries({
                queryKey: ['my-coupons']
            });
        },
    });
}

