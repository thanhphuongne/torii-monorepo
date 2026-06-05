import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api-client.ts';
import type {
    StandardApiResponse,
    PointRewardDTO,
    CreatePointRewardDTO,
    UpdatePointRewardDTO,
    AchievementDTO,
} from '@workspace/schemas';

export const gamificationApi = {
    // GET /api/gamification/admin/rewards
    async findAllRewards(): Promise<PointRewardDTO[]> {
        const response = await apiClient.get<StandardApiResponse<PointRewardDTO[]>>('/api/gamification/admin/rewards');
        return response.data.data || [];
    },

    // POST /api/gamification/admin/rewards
    async createReward(data: CreatePointRewardDTO): Promise<PointRewardDTO> {
        const response = await apiClient.post<StandardApiResponse<PointRewardDTO>>('/api/gamification/admin/rewards', data);
        return response.data.data!;
    },

    // PUT /api/gamification/admin/rewards/:id
    async updateReward(id: string, data: UpdatePointRewardDTO): Promise<PointRewardDTO> {
        const response = await apiClient.patch<StandardApiResponse<PointRewardDTO>>(`/api/gamification/admin/rewards/${id}`, data);
        return response.data.data!;
    },

    async deleteReward(id: string): Promise<boolean> {
        const response = await apiClient.delete<StandardApiResponse<any>>(`/api/gamification/admin/rewards/${id}`);
        return response.data.success;
    },

    // --- Achievements ---

    // GET /api/gamification/admin/achievements
    async findAllAchievements(): Promise<AchievementDTO[]> {
        const response = await apiClient.get<StandardApiResponse<AchievementDTO[]>>('/api/gamification/admin/achievements');
        return response.data.data || [];
    },

    // POST /api/gamification/admin/achievements
    async createAchievement(data: any): Promise<AchievementDTO> {
        const response = await apiClient.post<StandardApiResponse<AchievementDTO>>('/api/gamification/admin/achievements', data);
        return response.data.data!;
    },

    // PATCH /api/gamification/admin/achievements/:id
    async updateAchievement(id: string, data: any): Promise<AchievementDTO> {
        const response = await apiClient.patch<StandardApiResponse<AchievementDTO>>(`/api/gamification/admin/achievements/${id}`, data);
        return response.data.data!;
    },

    // DELETE /api/gamification/admin/achievements/:id
    async deleteAchievement(id: string): Promise<boolean> {
        const response = await apiClient.delete<StandardApiResponse<any>>(`/api/gamification/admin/achievements/${id}`);
        return response.data.success;
    }
};

// ============================================================================
// React Query Hooks
// ============================================================================

export function useAdminRewards() {
    return useQuery({
        queryKey: ['admin-rewards'],
        queryFn: () => gamificationApi.findAllRewards(),
    });
}

export function useCreateReward() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreatePointRewardDTO) => gamificationApi.createReward(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-rewards'] });
        },
    });
}

export function useUpdateReward() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdatePointRewardDTO }) =>
            gamificationApi.updateReward(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-rewards'] });
        },
    });
}

export function useDeleteReward() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => gamificationApi.deleteReward(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-rewards'] });
        },
    });
}

// --- Achievement Hooks ---

export function useAdminAchievements() {
    return useQuery({
        queryKey: ['admin-achievements'],
        queryFn: () => gamificationApi.findAllAchievements(),
    });
}

export function useCreateAchievement() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: any) => gamificationApi.createAchievement(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-achievements'] });
        },
    });
}

export function useUpdateAchievement() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            gamificationApi.updateAchievement(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-achievements'] });
        },
    });
}

export function useDeleteAchievement() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => gamificationApi.deleteAchievement(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-achievements'] });
        },
    });
}
