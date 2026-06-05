import { apiClient } from '../api-client';
import type { StandardApiResponse, UserResponseDTO } from '@workspace/schemas';
import { storageApi } from './storage-api';

export interface UpdateProfileDTO {
    displayName?: string;
    userMetadata?: Record<string, any>;
}

export const profileApi = {
    /**
     * Get current user profile
     */
    async getProfile(): Promise<UserResponseDTO> {
        const response = await apiClient.get<StandardApiResponse<{ user: UserResponseDTO }>>('/api/auth/me');
        if (response.data.success && response.data.data) {
            return response.data.data.user;
        }
        throw new Error(response.data.message || 'Failed to fetch profile');
    },

    /**
     * Update user profile
     */
    async updateProfile(data: UpdateProfileDTO): Promise<UserResponseDTO> {
        const response = await apiClient.patch<StandardApiResponse<{ user: UserResponseDTO }>>('/api/auth/me', data);
        if (response.data.success && response.data.data) {
            return response.data.data.user;
        }
        throw new Error(response.data.message || 'Failed to update profile');
    },

    /**
     * Upload avatar
     */
    async uploadAvatar(file: File): Promise<UserResponseDTO> {
        // 1. Upload file to storage
        const uploadResult = await storageApi.uploadFile(file, 'avatars', {
            type: 'avatar',
        });

        // 2. Update user avatar
        const response = await apiClient.patch<StandardApiResponse<{ user: UserResponseDTO }>>('/api/auth/me/avatar', {
            fileId: uploadResult.fileId,
        });

        if (response.data.success && response.data.data) {
            return response.data.data.user;
        }
        throw new Error(response.data.message || 'Failed to update avatar');
    },

    /**
     * Get public profile by user ID (instructor/lecturer)
     */
    async getPublicProfile(id: string): Promise<any> {
        const response = await apiClient.get<StandardApiResponse<{ user: any }>>(`/api/profiles/${id}`);
        if (response.data.success && response.data.data) {
            return response.data.data.user;
        }
        throw new Error(response.data.message || 'Failed to fetch public profile');
    },
};
