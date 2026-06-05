import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/api-client.ts';
import type {
    BlogResponseDTO,
    BlogCreateDTO,
    BlogUpdateDTO,
    BlogQueryDTO,
    StandardApiResponse,
    PaginatedApiResponse,
} from '@workspace/schemas';

// ============================================================================
// API Functions
// ============================================================================

export const blogApi = {
    // GET /api/blogs
    async findAll(params: BlogQueryDTO): Promise<PaginatedApiResponse<BlogResponseDTO>> {
        const response = await apiClient.get<PaginatedApiResponse<BlogResponseDTO>>('/api/blogs', { params });
        return response.data;
    },

    // GET /api/blogs/admin
    async findAllAdmin(params: BlogQueryDTO): Promise<PaginatedApiResponse<BlogResponseDTO>> {
        const response = await apiClient.get<PaginatedApiResponse<BlogResponseDTO>>('/api/blogs/admin', { params });
        return response.data;
    },

    // GET /api/blogs/:id
    async findById(id: string): Promise<BlogResponseDTO> {
        const response = await apiClient.get<StandardApiResponse<{ blog: BlogResponseDTO }>>(`/api/blogs/${id}`);
        return response.data.data!.blog;
    },

    // POST /api/blogs
    async create(blog: BlogCreateDTO): Promise<BlogResponseDTO> {
        const response = await apiClient.post<StandardApiResponse<{ blog: BlogResponseDTO }>>('/api/blogs', blog);
        return response.data.data!.blog;
    },

    // PATCH /api/blogs/:id
    async update(id: string, blog: BlogUpdateDTO): Promise<BlogResponseDTO> {
        const response = await apiClient.patch<StandardApiResponse<{ blog: BlogResponseDTO }>>(`/api/blogs/${id}`, blog);
        return response.data.data!.blog;
    },

    // DELETE /api/blogs/:id
    async delete(id: string): Promise<void> {
        await apiClient.delete<StandardApiResponse<any>>(`/api/blogs/${id}`);
    },
};

// ============================================================================
// React Query Hooks
// ============================================================================

/**
 * Hook: Get blog blogs list with pagination and filters
 */
export function useBlogs(params: BlogQueryDTO, isAdmin: boolean = true) {
    return useQuery({
        queryKey: ['blogs', params, isAdmin],
        queryFn: () => isAdmin ? blogApi.findAllAdmin(params) : blogApi.findAll(params),
        staleTime: 30000,
    });
}

/**
 * Hook: Get single blog blog by ID
 */
export function useBlog(id: string) {
    return useQuery({
        queryKey: ['blogs', id],
        queryFn: () => blogApi.findById(id),
        enabled: !!id,
    });
}

/**
 * Hook: Create new blog blog
 */
export function useCreateBlog() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (blog: BlogCreateDTO) => blogApi.create(blog),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['blogs'] });
        },
    });
}

/**
 * Hook: Update blog blog
 */
export function useUpdateBlog() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, blog }: { id: string; blog: BlogUpdateDTO }) =>
            blogApi.update(id, blog),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['blogs', variables.id] });
            queryClient.invalidateQueries({ queryKey: ['blogs'] });
        },
    });
}

/**
 * Hook: Delete blog blog
 */
export function useDeleteBlog() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => blogApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['blogs'] });
        },
    });
}
