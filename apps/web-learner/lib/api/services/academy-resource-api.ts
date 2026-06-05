import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api-client';
import {
    StandardApiResponse,
    AcademyFolderResponseDTO,
    AcademyResourceResponseDTO,
} from '@workspace/schemas';

export const academyResourceApi = {
    /**
     * Get live class folders for a specific class or all
     */
    getFolders: async (deliveryScopeId?: string): Promise<AcademyFolderResponseDTO[]> => {
        const response = await apiClient.get<StandardApiResponse<AcademyFolderResponseDTO[]>>(
            '/api/academy/my-folders/live-classes',
            { params: { deliveryScopeId } }
        );
        return response.data.data!;
    },

    /**
     * Get resources for a specific folder
     */
    getResourcesByFolder: async (folderId: string): Promise<AcademyResourceResponseDTO[]> => {
        const response = await apiClient.get<StandardApiResponse<AcademyResourceResponseDTO[]>>(
            `/api/academy/folders/${folderId}/resources`
        );
        return response.data.data!;
    },
};

/**
 * Hook: Get academy folders
 */
export function useAcademyFolders(deliveryScopeId?: string) {
    return useQuery({
        queryKey: ['academy', 'folders', deliveryScopeId],
        queryFn: () => academyResourceApi.getFolders(deliveryScopeId),
    });
}

/**
 * Hook: Get resources by folder ID
 */
export function useAcademyResources(folderId?: string) {
    return useQuery({
        queryKey: ['academy', 'resources', folderId],
        queryFn: () => academyResourceApi.getResourcesByFolder(folderId!),
        enabled: !!folderId,
    });
}
