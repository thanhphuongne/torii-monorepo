import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api-client';
import type {
    CommentQueryDTO,
    CommentCreateDTO,
    CommentUpdateDTO,
    CommentResponseDTO,
    StandardApiResponse,
    PaginatedApiResponse
} from '@workspace/schemas';

export const commentApi = {
    findAll: async (params: CommentQueryDTO): Promise<PaginatedApiResponse<CommentResponseDTO>> => {
        // Adjust params to match backend expectations if needed (like in web-learner)
        const backendParams: any = { ...params };

        if (params.blogId) {
            backendParams.entityId = params.blogId;
            backendParams.targetType = 'BLOG';
            delete backendParams.blogId;
        } else if (params.feedId) {
            backendParams.entityId = params.feedId;
            backendParams.targetType = 'FEED';
            delete backendParams.feedId;
        } else if (params.discussionId) {
            backendParams.entityId = params.discussionId;
            backendParams.targetType = 'DISCUSSION';
            delete backendParams.discussionId;
        }

        const response = await apiClient.get<PaginatedApiResponse<CommentResponseDTO>>('/api/comments', {
            params: backendParams,
        });
        return response.data;
    },

    create: async (dto: CommentCreateDTO): Promise<CommentResponseDTO> => {
        const backendDto: any = { ...dto };

        if (dto.blogId) {
            backendDto.entityId = dto.blogId;
            backendDto.targetType = 'BLOG';
            delete backendDto.blogId;
        } else if (dto.feedId) {
            backendDto.entityId = dto.feedId;
            backendDto.targetType = 'FEED';
            delete backendDto.feedId;
        } else if (dto.discussionId) {
            backendDto.entityId = dto.discussionId;
            backendDto.targetType = 'DISCUSSION';
            delete backendDto.discussionId;
        }

        const response = await apiClient.post<StandardApiResponse<CommentResponseDTO>>('/api/comments', backendDto);
        if (!response.data.success || !response.data.data) {
            throw new Error('Failed to create comment');
        }
        return response.data.data;
    },

    update: async (id: string, dto: CommentUpdateDTO): Promise<CommentResponseDTO> => {
        const response = await apiClient.patch<StandardApiResponse<CommentResponseDTO>>(`/api/comments/${id}`, dto);
        if (!response.data.success || !response.data.data) {
            throw new Error('Failed to update comment');
        }
        return response.data.data;
    },

    delete: async (id: string): Promise<boolean> => {
        const response = await apiClient.delete<StandardApiResponse<boolean>>(`/api/comments/${id}`);
        return !!response.data.success;
    },
};

export function useComments(params: CommentQueryDTO) {
    return useQuery({
        queryKey: ['comments', params],
        queryFn: () => commentApi.findAll(params),
        enabled: !!(params.blogId || params.feedId || params.discussionId),
    });
}

export function useCreateComment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (dto: CommentCreateDTO) => commentApi.create(dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['comments'] });
            queryClient.invalidateQueries({ queryKey: ['discussions'] });
        },
    });
}

export function useUpdateComment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: CommentUpdateDTO }) => commentApi.update(id, dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['comments'] });
            queryClient.invalidateQueries({ queryKey: ['discussions'] });
        },
    });
}

export function useDeleteComment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => commentApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['comments'] });
            queryClient.invalidateQueries({ queryKey: ['discussions'] });
        },
    });
}
