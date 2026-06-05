import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/api-client.ts';
import { toast } from '@workspace/ui/components/sonner';
import type { StandardApiResponse } from '@workspace/schemas';

// Types
export interface RoleDefinition {
    code: string;
    name: string;
    description?: string | null;
    extends?: string;
}

export interface PermissionDefinition {
    code: string;
    description: string;
    category: string;
}

export interface PermissionsResponse {
    all: PermissionDefinition[];
    byCategory: Record<string, PermissionDefinition[]>;
}

// API calls
const permissionsApi = {
    async getRoles() {
        const res = await apiClient.get<StandardApiResponse<RoleDefinition[]>>('/api/authorization/roles');
        return res.data.data!;
    },

    async getPermissions() {
        const res = await apiClient.get<StandardApiResponse<PermissionsResponse>>('/api/authorization/permissions');
        return res.data.data!;
    },

    async updateRolePermissions(roleCode: string, permissions: string[]) {
        const res = await apiClient.put<StandardApiResponse<any>>(`/api/authorization/roles/${roleCode}/permissions`, {
            permissions,
        });
        return res.data.data;
    },

    async createRole(data: { code: string; name: string; description?: string | null }) {
        const res = await apiClient.post<StandardApiResponse<RoleDefinition>>('/api/authorization/roles', data);
        return res.data.data!;
    },

    async updateRole(
        roleCode: string,
        data: { name?: string; description?: string | null },
    ) {
        const res = await apiClient.patch<StandardApiResponse<RoleDefinition>>(
            `/api/authorization/roles/${encodeURIComponent(roleCode)}`,
            data,
        );
        return res.data.data!;
    },

    async deleteRole(roleCode: string) {
        const res = await apiClient.delete<StandardApiResponse<{ code: string; deleted: boolean }>>(
            `/api/authorization/roles/${encodeURIComponent(roleCode)}`,
        );
        return res.data.data!;
    },
};

// React Query hooks
export function useRoles() {
    return useQuery({
        queryKey: ['authorization', 'roles'],
        queryFn: () => permissionsApi.getRoles(),
    });
}

export function useFetchPermissions() {
    return useQuery({
        queryKey: ['authorization', 'permissions'],
        queryFn: () => permissionsApi.getPermissions(),
    });
}

export function useUpdateRolePermissions() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            roleCode,
            permissions,
        }: {
            roleCode: string;
            permissions: string[];
        }) => permissionsApi.updateRolePermissions(roleCode, permissions),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ['authorization', 'role-permissions', variables.roleCode],
            });
            toast.success('Permissions updated successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to update permissions');
        },
    });
}

export function useCreateRole() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { code: string; name: string; description?: string | null }) =>
            permissionsApi.createRole(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['authorization', 'roles'] });
            queryClient.invalidateQueries({ queryKey: ['authorization'] });
            toast.success('Đã tạo vai trò mới');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Không thể tạo vai trò');
        },
    });
}

export function useUpdateRole() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            roleCode,
            data,
        }: {
            roleCode: string;
            data: { name?: string; description?: string | null };
        }) => permissionsApi.updateRole(roleCode, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['authorization', 'roles'] });
            toast.success('Đã cập nhật vai trò');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Không thể cập nhật vai trò');
        },
    });
}

export function useDeleteRole() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (roleCode: string) => permissionsApi.deleteRole(roleCode),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['authorization'] });
            toast.success('Đã xóa vai trò');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Không thể xóa vai trò');
        },
    });
}

