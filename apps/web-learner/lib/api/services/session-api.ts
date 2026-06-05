import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/api-client';
import type { StandardApiResponse } from '@workspace/schemas';

export interface SessionResponse {
    id: string;
    ipAddress: string;
    userAgent: string;
    deviceInfo: string;
    createdAt: string;
    isCurrent: boolean;
}

export const sessionsApi = {
    // GET /api/auth/sessions
    async getSessions(): Promise<SessionResponse[]> {
        const response = await apiClient.get<StandardApiResponse<{ sessions: SessionResponse[] }>>('/api/auth/sessions');
        if (response.data.success && response.data.data) {
            return response.data.data.sessions;
        }
        throw new Error(response.data.message || 'Failed to fetch sessions');
    },

    // DELETE /api/auth/sessions/:id
    async revokeSession(id: string): Promise<void> {
        const response = await apiClient.delete<StandardApiResponse<void>>(`/api/auth/sessions/${id}`);
        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to revoke session');
        }
    },

    // DELETE /api/auth/sessions/other
    async revokeOtherSessions(): Promise<void> {
        const response = await apiClient.delete<StandardApiResponse<void>>('/api/auth/sessions/other');
        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to revoke other sessions');
        }
    },
};

export function useSessions() {
    return useQuery({
        queryKey: ['sessions'],
        queryFn: () => sessionsApi.getSessions(),
    });
}

export function useRevokeSession() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => sessionsApi.revokeSession(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
        },
    });
}

export function useRevokeOtherSessions() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => sessionsApi.revokeOtherSessions(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
        },
    });
}
