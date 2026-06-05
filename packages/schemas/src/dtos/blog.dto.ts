import { z } from 'zod';
import { BlogStatus, blogSchema } from '../models/blog.model';
import { paginatedResponseSchema } from './common.dto';

export const blogCreateDTOSchema = blogSchema
    .pick({
        title: true,
        slug: true,
        excerpt: true,
        content: true,
        coverImageUrl: true,
        authorId: true,
        status: true,
        publishedAt: true,
        tags: true,
    })
    .partial({
        slug: true,
        excerpt: true,
        coverImageUrl: true,
        status: true,
        publishedAt: true,
        tags: true,
    });

export type BlogCreateDTO = z.infer<typeof blogCreateDTOSchema>;

export const blogUpdateDTOSchema = blogCreateDTOSchema.partial().omit({ authorId: true });

export type BlogUpdateDTO = z.infer<typeof blogUpdateDTOSchema>;

export const blogQueryDTOSchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(10),
    search: z.string().optional(),
    status: z.nativeEnum(BlogStatus).optional(),
    authorId: z.string().uuid().optional(),
    tagId: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    showScheduled: z.coerce.boolean().optional(),
});

export type BlogQueryDTO = z.infer<typeof blogQueryDTOSchema>;

export const blogResponseDTOSchema = blogSchema.extend({
    author: z.object({
        id: z.string().uuid(),
        displayName: z.string(),
        email: z.string(),
        avatarUrl: z.string().optional(),
    }).optional(),
});

export type BlogResponseDTO = z.infer<typeof blogResponseDTOSchema>;

export const blogPaginatedResponseSchema = paginatedResponseSchema(blogResponseDTOSchema);

export type BlogPaginatedResponse = z.infer<typeof blogPaginatedResponseSchema>;

export const uploadImageBase64DTOSchema = z.object({
    imageData: z.string().min(1),
    filename: z.string().optional(),
    contentType: z.string().optional(),
    ownerId: z.string().optional(),
});

export type UploadImageBase64DTO = z.infer<typeof uploadImageBase64DTOSchema>;
