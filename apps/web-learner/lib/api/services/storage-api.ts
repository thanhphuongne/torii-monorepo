import { apiClient } from '../api-client';
import type {
    StandardApiResponse,
    StoragePresignedUrlRequestDTO,
    StoragePresignedUrlResponseDTO,
    StorageConfirmUploadRequestDTO,
    StorageConfirmUploadResponseDTO,
    StorageGetSignedUrlRequestDTO,
    StorageGetSignedUrlResponseDTO,
} from '@workspace/schemas';

export const storageApi = {
    /**
     * Lấy Signed URL để hiển thị file/avatar (tài liệu, ảnh) — thời hạn có giới hạn.
     */
    async getSignedUrl(params: StorageGetSignedUrlRequestDTO): Promise<StorageGetSignedUrlResponseDTO> {
        const { fileId, expiresIn } = params;
        const q = new URLSearchParams({ fileId });
        if (expiresIn != null) q.set('expiresIn', String(expiresIn));
        const response = await apiClient.get<StandardApiResponse<StorageGetSignedUrlResponseDTO>>(
            `/api/storage/signed-url?${q.toString()}`
        );
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to get signed URL');
    },

    /**
     * Generate presigned upload URL
     */
    async generateUploadUrl(data: StoragePresignedUrlRequestDTO): Promise<StoragePresignedUrlResponseDTO> {
        const response = await apiClient.post<StandardApiResponse<StoragePresignedUrlResponseDTO>>('/api/storage/upload-url', data);
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to generate upload URL');
    },

    /**
     * Confirm file upload
     */
    async confirmUpload(data: StorageConfirmUploadRequestDTO): Promise<StorageConfirmUploadResponseDTO> {
        const response = await apiClient.post<StandardApiResponse<StorageConfirmUploadResponseDTO>>('/api/storage/confirm-upload', data);
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to confirm upload');
    },

    /**
     * Helper: Upload file (Get URL -> Upload -> Confirm)
     */
    async uploadFile(file: File, module: string = 'general', metadata?: Record<string, any>, ownerId?: string): Promise<StorageConfirmUploadResponseDTO> {
        // 1. Get presigned URL
        const presignedData = await this.generateUploadUrl({
            contentType: file.type,
            filename: file.name,
            module,
            metadata,
            ownerId,
        });

        // 2. Upload file to signed URL (direct to S3/R2)
        const uploadResponse = await fetch(presignedData.uploadUrl, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': file.type || 'application/octet-stream',
            },
        });

        if (!uploadResponse.ok) {
            const text = await uploadResponse.text();
            throw new Error(
                `Upload thất bại (${uploadResponse.status}): ${text || uploadResponse.statusText}`
            );
        }

        // 3. Confirm upload (lưu trạng thái uploaded vào DB storage)
        return this.confirmUpload({
            fileId: presignedData.fileId,
        });
    },
};
