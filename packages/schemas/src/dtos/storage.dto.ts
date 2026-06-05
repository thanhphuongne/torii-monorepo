import { z } from 'zod';

export const storagePresignedUrlRequestDTOSchema = z.object({
    filename: z.string().min(1),
    contentType: z.string().min(1),
    module: z.string().min(1),
    ownerId: z.string().optional(),
    metadata: z.record(z.any()).optional(),
});

export type StoragePresignedUrlRequestDTO = z.infer<typeof storagePresignedUrlRequestDTOSchema>;

export const storagePresignedUrlResponseDTOSchema = z.object({
    uploadUrl: z.string().url(),
    fileId: z.string(),
    fileUrl: z.string().url(),
    expiresIn: z.number(),
});

export type StoragePresignedUrlResponseDTO = z.infer<typeof storagePresignedUrlResponseDTOSchema>;

export const storageConfirmUploadRequestDTOSchema = z.object({
    fileId: z.string().min(1),
});

export type StorageConfirmUploadRequestDTO = z.infer<typeof storageConfirmUploadRequestDTOSchema>;

export const storageConfirmUploadResponseDTOSchema = z.object({
    success: z.boolean(),
    fileId: z.string(),
    fileUrl: z.string().url(),
});

export type StorageConfirmUploadResponseDTO = z.infer<typeof storageConfirmUploadResponseDTOSchema>;

// Direct Upload
export const storageDirectUploadRequestDTOSchema = z.object({
    filename: z.string().min(1),
    contentType: z.string().min(1),
    module: z.string().min(1),
    ownerId: z.string().optional(),
    metadata: z.record(z.any()).optional(),
    fileData: z.string().min(1), // Base64
});

export type StorageDirectUploadRequestDTO = z.infer<typeof storageDirectUploadRequestDTOSchema>;

export const storageDirectUploadResponseDTOSchema = z.object({
    success: z.boolean(),
    fileId: z.string(),
    fileUrl: z.string().url(),
    fileSize: z.number(),
});

export type StorageDirectUploadResponseDTO = z.infer<typeof storageDirectUploadResponseDTOSchema>;

// Delete
export const storageDeleteFileRequestDTOSchema = z.object({
    fileId: z.string().min(1),
});

export type StorageDeleteFileRequestDTO = z.infer<typeof storageDeleteFileRequestDTOSchema>;

export const storageDeleteFileResponseDTOSchema = z.object({
    success: z.boolean(),
    message: z.string(),
});

export type StorageDeleteFileResponseDTO = z.infer<typeof storageDeleteFileResponseDTOSchema>;

// Get Signed URL
export const storageGetSignedUrlRequestDTOSchema = z.object({
    fileId: z.string().min(1),
    expiresIn: z.number().optional(),
});

export type StorageGetSignedUrlRequestDTO = z.infer<typeof storageGetSignedUrlRequestDTOSchema>;

export const storageGetSignedUrlResponseDTOSchema = z.object({
    fileId: z.string(),
    signedUrl: z.string().url(),
    expiresIn: z.number(),
});

export type StorageGetSignedUrlResponseDTO = z.infer<typeof storageGetSignedUrlResponseDTOSchema>;
