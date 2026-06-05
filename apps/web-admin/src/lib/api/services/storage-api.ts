import { apiClient } from '../api-client.ts';
import type { StoragePresignedUrlRequestDTO, StoragePresignedUrlResponseDTO, StorageConfirmUploadRequestDTO, StorageConfirmUploadResponseDTO, StandardApiResponse } from '@workspace/schemas';

// ============================================================================
// API Functions
// ============================================================================

export const storageApi = {
    // POST /api/storage/upload-url
    async generateUploadUrl(data: StoragePresignedUrlRequestDTO): Promise<StoragePresignedUrlResponseDTO> {
        const response = await apiClient.post<StandardApiResponse<StoragePresignedUrlResponseDTO>>('/api/storage/upload-url', data);
        if (!response.data.success) throw new Error(response.data.message || 'Failed to generate upload URL');
        return response.data.data!;
    },

    // POST /api/storage/confirm-upload
    async confirmUpload(data: StorageConfirmUploadRequestDTO): Promise<StorageConfirmUploadResponseDTO> {
        const response = await apiClient.post<StandardApiResponse<StorageConfirmUploadResponseDTO>>('/api/storage/confirm-upload', data);
        return response.data.data!;
    },

    // GET /api/storage/signed-url?fileId=...
    async getSignedUrl(params: { fileId: string }): Promise<{ signedUrl: string }> {
        const response = await apiClient.get<StandardApiResponse<{ signedUrl: string }>>('/api/storage/signed-url', {
            params,
        });
        return response.data.data!;
    },
    // Helper: Upload file (Get URL -> Upload -> Confirm)
    async uploadFile(file: File, module: string = 'courses', metadata?: Record<string, any>, ownerId?: string): Promise<StorageConfirmUploadResponseDTO> {
        // 1. Get presigned URL
        const presignedData = await this.generateUploadUrl({
            contentType: file.type,
            filename: file.name,
            module,
            metadata,
            ownerId,
        });

        // 2. Upload file to signed URL
        await fetch(presignedData.uploadUrl, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': file.type,
            },
        });

        // 3. Confirm upload
        return this.confirmUpload({
            fileId: presignedData.fileId,
        });
    },
};

