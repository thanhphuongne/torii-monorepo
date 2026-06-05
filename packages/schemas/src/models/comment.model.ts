import { z } from 'zod';

export enum CommentTargetType {
    BLOG = 'BLOG',
    FEED = 'FEED',
    DISCUSSION = 'DISCUSSION',
    LESSON = 'LESSON',
    CLASS = 'CLASS',
    COURSE = 'COURSE',
}

export const commentSchema = z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    parentCommentId: z.string().uuid().optional().nullable(),
    content: z.string().min(1),
    status: z.string().default('approved'),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export type Comment = z.infer<typeof commentSchema>;

