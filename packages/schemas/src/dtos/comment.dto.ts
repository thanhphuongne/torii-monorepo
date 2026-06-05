import { z } from 'zod';
import { commentSchema, CommentTargetType } from '../models/comment.model';
import { paginatedResponseSchema } from './common.dto';

// Use extend to add non-model fields or pick to select model fields
export const commentCreateDTOSchema = z.object({
    targetType: z.nativeEnum(CommentTargetType),
    entityId: z.string().uuid(),
    userId: z.string().uuid().optional(),
    content: z.string().min(1),
    parentId: z.string().uuid().optional(),
    authorId: z.string().uuid().optional(), // Alias
    blogId: z.string().uuid().optional(),
    feedId: z.string().uuid().optional(),
    discussionId: z.string().uuid().optional(),
    deliveryScopeId: z.string().uuid().optional(),
    courseId: z.string().uuid().optional(),
});

export type CommentCreateDTO = z.infer<typeof commentCreateDTOSchema>;

export const commentUpdateDTOSchema = commentSchema.pick({
    content: true,
});

export type CommentUpdateDTO = z.infer<typeof commentUpdateDTOSchema>;

export const commentQueryDTOSchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    entityId: z.string().uuid().optional(),
    targetType: z.nativeEnum(CommentTargetType).optional(),
    parentId: z.string().uuid().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    blogId: z.string().uuid().optional(),
    feedId: z.string().uuid().optional(),
    discussionId: z.string().uuid().optional(),
    deliveryScopeId: z.string().uuid().optional(),
    courseId: z.string().uuid().optional(),
});

export type CommentQueryDTO = z.infer<typeof commentQueryDTOSchema>;

// Use z.ZodType to handle circular referencing
export const commentResponseDTOSchema: z.ZodType<any> = commentSchema.extend({
    author: z.object({
        id: z.string().uuid(),
        displayName: z.string(),
        avatarUrl: z.string().optional(),
    }).optional(),
    blogId: z.string().uuid().optional(),
    feedId: z.string().uuid().optional(),
    discussionId: z.string().uuid().optional(),
    deliveryScopeId: z.string().uuid().optional(),
    courseId: z.string().uuid().optional(),
    authorRoleLabel: z.string().optional(),
    isOfficialReply: z.boolean().optional(),
    replyCount: z.number().optional().default(0),
    likeCount: z.number().optional().default(0),
    isLiked: z.boolean().optional().default(false),
    replies: z.array(z.lazy(() => commentResponseDTOSchema)).optional().default([]),
});

export type CommentResponseDTO = z.infer<typeof commentResponseDTOSchema>;

export const commentPaginatedResponseSchema = paginatedResponseSchema(commentResponseDTOSchema);

export type CommentPaginatedResponse = z.infer<typeof commentPaginatedResponseSchema>;
