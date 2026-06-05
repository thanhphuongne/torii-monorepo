import { apiClient } from '../api-client';
import type {
    CommentCreateDTO,
    CommentUpdateDTO,
    CommentQueryDTO,
    CommentResponseDTO,
    CommentPaginatedResponse,
    StandardApiResponse,
    PaginatedApiResponse,
    CommentTargetType,
} from '@workspace/schemas';

/**
 * Helper to transform backend Prisma response to frontend DTO
 * Handles mapping nulls to undefined/0
 */
const transformComment = (data: any): CommentResponseDTO => {
    if (!data) return data;
    try {
        return {
            ...data,
            parentId: data.parentCommentId || data.parentId || undefined,
            likeCount: data.likes || data.likeCount || 0,
            replies: data.replies?.map(transformComment),
        };
    } catch (error) {
        console.error('Error transforming comment:', error, data);
        return data;
    }
};

/**
 * API client for Comments (blog, feed, etc.)
 */
export const commentApi = {
    findAll: async (params: CommentQueryDTO): Promise<CommentPaginatedResponse> => {
        try {
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
                if (params.deliveryScopeId)
                    backendParams.deliveryScopeId = params.deliveryScopeId;
                if (params.courseId) backendParams.courseId = params.courseId;
            }

            const response = await apiClient.get<PaginatedApiResponse<CommentResponseDTO>>('/api/comments', {
                params: backendParams,
            });

            const responseData = response.data;
            if (!responseData?.success) {
                throw new Error('Invalid response format from server');
            }
            if (!Array.isArray(responseData.data)) {
                throw new Error('Response data is not an array');
            }

            return {
                data: responseData.data.map(transformComment),
                total: responseData.total || 0,
                page: responseData.page || 1,
                limit: responseData.limit || 20,
                totalPages: responseData.totalPages || 0,
            };
        } catch (error: any) {
            console.error('Error in commentApi.findAll:', error);
            throw error;
        }
    },

    getWithReplies: async (id: string, depth: number = 2): Promise<CommentResponseDTO> => {
        const response = await apiClient.get<StandardApiResponse<CommentResponseDTO>>(`/api/comments/${id}/replies`, {
            params: { depth },
        });
        const responseData = response.data;
        if (!responseData.success || !responseData.data) {
            throw new Error('Invalid response format from server');
        }
        return transformComment(responseData.data);
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
            if (dto.deliveryScopeId)
                backendDto.deliveryScopeId = dto.deliveryScopeId;
            if (dto.courseId) backendDto.courseId = dto.courseId;
        }

        const response = await apiClient.post<StandardApiResponse<CommentResponseDTO>>('/api/comments', backendDto);
        const responseData = response.data;
        if (!responseData.success || !responseData.data) {
            throw new Error('Invalid response format from server');
        }
        return transformComment(responseData.data);
    },

    update: async (id: string, dto: CommentUpdateDTO): Promise<CommentResponseDTO> => {
        const response = await apiClient.patch<StandardApiResponse<CommentResponseDTO>>(`/api/comments/${id}`, dto);
        const responseData = response.data;
        if (!responseData.success || !responseData.data) {
            throw new Error('Invalid response format from server');
        }
        return transformComment(responseData.data);
    },

    delete: async (id: string): Promise<{ success: boolean; message: string }> => {
        const response = await apiClient.delete<{ success: boolean; message: string }>(`/api/comments/${id}`);
        return response.data;
    },

    toggleLike: async (id: string): Promise<{ isLiked: boolean; likeCount: number }> => {
        const response = await apiClient.post<StandardApiResponse<{ isLiked: boolean; likeCount: number }>>(`/api/comments/${id}/like`);
        if (!response.data.data) {
            throw new Error('Invalid response format from server');
        }
        return response.data.data;
    },
};
