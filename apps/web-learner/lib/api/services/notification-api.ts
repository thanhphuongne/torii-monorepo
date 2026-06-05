import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api-client';
import type {
    PaginatedApiResponse,
    NotificationResponseDTO,
    NotificationQueryDTO,
    NotificationUnreadCountResponseDTO,
    StandardApiResponse,
} from '@workspace/schemas';

// ============================================================================
// API Functions
// ============================================================================

export const notificationApi = {
    // GET /api/notifications
    async findAll(params?: NotificationQueryDTO): Promise<PaginatedApiResponse<NotificationResponseDTO>> {
        const response = await apiClient.get<PaginatedApiResponse<NotificationResponseDTO>>('/api/notifications', { params });
        if (!response.data.success || !response.data.data) {
            throw new Error(response.data.message || 'Failed to fetch notifications');
        }
        return response.data;
    },

    // GET /api/notifications/unread-count
    async getUnreadCount(): Promise<NotificationUnreadCountResponseDTO> {
        const response = await apiClient.get<StandardApiResponse<NotificationUnreadCountResponseDTO>>('/api/notifications/unread-count');
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to fetch unread count');
    },

    // PATCH /api/notifications/:id/read
    async markAsRead(id: string): Promise<NotificationResponseDTO> {
        const response = await apiClient.patch<StandardApiResponse<NotificationResponseDTO>>(`/api/notifications/${id}/read`);
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to mark notification as read');
    },

    // PATCH /api/notifications/read-all
    async markAllAsRead(): Promise<{ success: boolean; message: string; count: number }> {
        const response = await apiClient.patch<StandardApiResponse<{ success: boolean; message: string; count: number }>>('/api/notifications/read-all');
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to mark all notifications as read');
    },

    // DELETE /api/notifications/:id
    async delete(id: string): Promise<void> {
        const response = await apiClient.delete<StandardApiResponse<void>>(`/api/notifications/${id}`);
        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to delete notification');
        }
    },
};

// ============================================================================
// React Query Hooks
// ============================================================================

/**
 * Hook: Get notifications list with pagination
 */
export function useNotifications(params?: NotificationQueryDTO) {
    return useQuery({
        queryKey: ['notifications', params],
        queryFn: () => notificationApi.findAll(params),
        staleTime: 30000,
        retry: (failureCount, error: any) => {
            // Don't retry on 401 (authentication errors)
            if (error?.response?.status === 401) {
                return false;
            }
            return failureCount < 3;
        },
    });
}

/**
 * Hook: Get unread notifications count
 */
export function useUnreadNotificationsCount() {
    return useQuery({
        queryKey: ['notifications', 'unread-count'],
        queryFn: () => notificationApi.getUnreadCount(),
        staleTime: 30000, // Keep data fresh for 30 seconds
        retry: (failureCount, error: any) => {
            // Don't retry on 401 (authentication errors)
            if (error?.response?.status === 401) {
                return false;
            }
            return failureCount < 3;
        },
    });
}

/**
 * Hook: Mark notification as read
 */
export function useMarkNotificationAsRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => notificationApi.markAsRead(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
}

/**
 * Hook: Mark all notifications as read
 */
export function useMarkAllNotificationsAsRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => notificationApi.markAllAsRead(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
}

/**
 * Hook: Delete notification
 */
export function useDeleteNotification() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => notificationApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
}
