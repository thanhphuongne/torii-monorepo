import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api-client';
import type {
    BlogQueryDTO,
    BlogResponseDTO,
    StandardApiResponse,
    PaginatedApiResponse
} from '@workspace/schemas';

/**
 * API client for Blogs (Learner Side - Public APIs Only)
 */
export const blogApi = {
    /**
     * Get all published blogs with pagination and filters
     * This endpoint only returns published blogs for learners
     */
    findAll: async (params: BlogQueryDTO = { page: 1, limit: 12 }): Promise<PaginatedApiResponse<BlogResponseDTO>> => {
        const response = await apiClient.get<PaginatedApiResponse<BlogResponseDTO>>('/api/blogs', {
            params,
        });

        const responseData = response.data;
        if (!responseData.success || !responseData.data) {
            throw new Error('Invalid response format from server');
        }

        return response.data;
    },

    /**
     * Get blog by ID (public)
     */
    findById: async (id: string): Promise<BlogResponseDTO> => {
        const response = await apiClient.get<StandardApiResponse<{ blog: BlogResponseDTO }>>(`/api/blogs/${id}`);

        const responseData = response.data;
        if (!responseData.success || !responseData.data) {
            throw new Error('Invalid response format from server');
        }

        return responseData.data.blog;
    },

    /**
     * Get blog by slug (public) - Main method for learners
     */
    findBySlug: async (slug: string): Promise<BlogResponseDTO | null> => {
        try {
            const response = await apiClient.get<StandardApiResponse<{ blog: BlogResponseDTO }>>(`/api/blogs/slug/${encodeURIComponent(slug)}`);

            const responseData = response.data;
            if (!responseData.success || !responseData.data) {
                return null;
            }

            return responseData.data.blog;
        } catch (error) {
            console.error('Failed to fetch blog by slug:', error);
            return null;
        }
    },

    /**
     * Increment view count for a blog
     */
    incrementViewCount: async (id: string): Promise<void> => {
        try {
            await apiClient.patch(`/api/blogs/${id}/view`);
        } catch (error) {
            // Silent fail - don't block the UI if view count fails
            console.error('Failed to increment view count:', error);
        }
    },
};

/**
 * Hook to fetch paginated blogs list (for /blogs page)
 */
export const useBlogs = (params?: BlogQueryDTO) => {
    return useQuery({
        queryKey: ['blogs', params],
        queryFn: () => blogApi.findAll(params),
        staleTime: 60000, // 1 minute
    });
};

/**
 * Hook to fetch a single blog by slug (for /blogs/[slug] page)
 */
export const useBlogBySlug = (slug: string | null) => {
    return useQuery({
        queryKey: ['blog', 'slug', slug],
        queryFn: () => {
            if (!slug) throw new Error('Slug is required');
            return blogApi.findBySlug(slug);
        },
        enabled: !!slug,
        staleTime: 300000, // 5 minutes
    });
};

/**
 * Hook to fetch a single blog by ID
 */
export const useBlogById = (id: string | null) => {
    return useQuery({
        queryKey: ['blog', 'id', id],
        queryFn: () => {
            if (!id) throw new Error('ID is required');
            return blogApi.findById(id);
        },
        enabled: !!id,
        staleTime: 300000, // 5 minutes
    });
};
