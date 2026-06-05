import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/api-client.ts';
import type { StandardApiResponse } from '@workspace/schemas';

// Types
export interface AuditLog {
    id: string;
    userId: string;
    action: string;
    entity: string;
    entityId: string | null;
    description: string;
    metadata: Record<string, any> | null;
    oldValues: Record<string, any> | null;
    newValues: Record<string, any> | null;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
    user?: {
        id: string;
        email: string;
        displayName: string;
        role: string;
    };
}

export interface AuditLogFilters {
    userId?: string;
    action?: string;
    entity?: string;
    entityId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
}

export interface PaginatedAuditLogs {
    data: AuditLog[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

// API calls
const auditLogsApi = {
    async query(params: AuditLogFilters = {}) {
        const res = await apiClient.post<PaginatedAuditLogs>('/api/admin/audit-logs/search', params);
        return res.data;
    },
    async getEntityActivity(entity: string, entityId: string, limit: number = 20) {
        const res = await apiClient.get<StandardApiResponse<AuditLog[]>>(`/api/admin/audit-logs/entity/${entity}/${entityId}`, {
            params: { limit }
        });
        return res.data.data!;
    },
};

// React Query hooks
export function useAuditLogs(filters: AuditLogFilters) {
    return useQuery({
        queryKey: ['audit-logs', filters],
        queryFn: () => auditLogsApi.query(filters),
    });
}

export function useEntityActivity(entity: string, entityId: string, limit: number = 20) {
    return useQuery({
        queryKey: ['audit-logs', 'entity', entity, entityId, limit],
        queryFn: () => auditLogsApi.getEntityActivity(entity, entityId, limit),
        enabled: !!entityId,
    });
}
