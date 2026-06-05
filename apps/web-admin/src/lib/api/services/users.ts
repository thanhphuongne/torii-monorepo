import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/api-client.ts';
import type {
    PaginatedApiResponse,
    UserResponseDTO,
    UserCreateDTO,
    UserAdminUpdateDTO,
    AdminCreateInternalUserDTO,
    StandardApiResponse,
    UserChangeStatusDTO
} from '@workspace/schemas';

export interface FindAllUsersParams {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// API Functions
// ============================================================================

export const usersApi = {
    // POST /api/admin/users/search
    async findAll(params: FindAllUsersParams): Promise<PaginatedApiResponse<UserResponseDTO>> {
        const response = await apiClient.post<PaginatedApiResponse<UserResponseDTO>>('/api/admin/users/search', params);
        if (!response.data.success || !response.data.data) {
            throw new Error(response.data.message || 'Failed to fetch users');
        }
        return response.data;
    },

    // GET /api/admin/users/:id
    async findById(id: string): Promise<UserResponseDTO> {
        const response = await apiClient.get<StandardApiResponse<{ user: UserResponseDTO }>>(`/api/admin/users/${id}`);
        if (response.data.success && response.data.data) {
            return response.data.data.user;
        }
        throw new Error(response.data.message || 'Failed to fetch user');
    },

    // POST /api/admin/users
    async create(user: UserCreateDTO): Promise<UserResponseDTO> {
        const response = await apiClient.post<StandardApiResponse<{ user: UserResponseDTO }>>('/api/admin/users', user);
        if (response.data.success && response.data.data) {
            return response.data.data.user;
        }
        throw new Error(response.data.message || 'Failed to create user');
    },

    // POST /api/admin/users/internal
    async createInternal(user: AdminCreateInternalUserDTO): Promise<UserResponseDTO> {
        const response = await apiClient.post<StandardApiResponse<{ user: UserResponseDTO }>>('/api/admin/users/internal', user);
        if (response.data.success && response.data.data) {
            return response.data.data.user;
        }
        throw new Error(response.data.message || 'Failed to create user');
    },

    // PATCH /api/admin/users/:id
    async update(id: string, user: UserAdminUpdateDTO): Promise<UserResponseDTO> {
        const response = await apiClient.patch<StandardApiResponse<{ user: UserResponseDTO }>>(`/api/admin/users/${id}`, user);
        if (response.data.success && response.data.data) {
            return response.data.data.user;
        }
        throw new Error(response.data.message || 'Failed to update user');
    },

    // DELETE /api/admin/users/:id
    async delete(params: { id: string; hardDelete?: boolean }): Promise<void> {
        const { id, hardDelete } = params;
        const response = await apiClient.delete<StandardApiResponse<void>>(`/api/admin/users/${id}`, {
            params: hardDelete !== undefined ? { hardDelete } : undefined,
        });
        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to delete user');
        }
    },

    // PATCH /api/admin/users/:id/status
    async changeStatus(id: string, dto: UserChangeStatusDTO): Promise<UserResponseDTO> {
        const response = await apiClient.patch<StandardApiResponse<{ user: UserResponseDTO }>>(`/api/admin/users/${id}/status`, dto);
        if (response.data.success && response.data.data) {
            return response.data.data.user;
        }
        throw new Error(response.data.message || 'Failed to update user status');
    },
};

// ============================================================================
// React Query Hooks
// ============================================================================

/**
 * Hook: Get users list with pagination
 */
export function useUsers(params: FindAllUsersParams) {
    return useQuery({
        queryKey: ['users', params],
        queryFn: () => usersApi.findAll(params),
        staleTime: 30000,
    });
}

export function useUsersQuery(
    params: FindAllUsersParams,
    options?: Omit<UseQueryOptions<PaginatedApiResponse<UserResponseDTO>>, 'queryKey' | 'queryFn'>,
) {
    return useQuery({
        queryKey: ['users', params],
        queryFn: () => usersApi.findAll(params),
        staleTime: 30000,
        ...options,
    });
}

/**
 * Hook: Get single user by ID
 */
export function useUser(id: string) {
    return useQuery({
        queryKey: ['users', id],
        queryFn: () => usersApi.findById(id),
        enabled: !!id,
    });
}

/**
 * Hook: Create new user
 */
export function useCreateUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (user: UserCreateDTO) => usersApi.create(user),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });
}

/**
 * Hook: Create internal user (lecturer / staff-academic / staff-operations) with invite email
 */
export function useCreateInternalUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (user: AdminCreateInternalUserDTO) => usersApi.createInternal(user),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });
}

/**
 * Hook: Update user
 */
export function useUpdateUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, user }: { id: string; user: UserAdminUpdateDTO }) =>
            usersApi.update(id, user),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['users', variables.id] });
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });
}

/**
 * Hook: Delete user
 */
export function useDeleteUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (params: { id: string; hardDelete?: boolean }) => usersApi.delete(params),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });
}

/**
 * Hook: Change user status
 */
export function useChangeUserStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: UserChangeStatusDTO }) =>
            usersApi.changeStatus(id, dto),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['users', variables.id] });
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });
}
