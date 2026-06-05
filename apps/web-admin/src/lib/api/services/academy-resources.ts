import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/api-client"
import type {
    AcademyFolderCreateDTO,
    AcademyResourceCreateDTO,
    AcademyResourceUpdateDTO,
    AcademyFolderResponseDTO,
    AcademyResourceResponseDTO,
    StandardApiResponse,
} from "@workspace/schemas"

export const academyResourcesApi = {
    /**
     * Folders
     */
    async getFoldersByOwner(ownerId: string, ownerType: string) {
        const res = await apiClient.get<StandardApiResponse<AcademyFolderResponseDTO[]>>(
            `/api/academy/folders/${ownerType}/${ownerId}`,
        )
        return res.data.data!
    },

    async createFolder(input: AcademyFolderCreateDTO) {
        const res = await apiClient.post<StandardApiResponse<AcademyFolderResponseDTO>>(
            "/api/academy/folders",
            input,
        )
        return res.data.data!
    },

    /**
     * Resources
     */
    async getResourcesByFolder(folderId: string) {
        const res = await apiClient.get<StandardApiResponse<AcademyResourceResponseDTO[]>>(
            `/api/academy/folders/${folderId}/resources`,
        )
        return res.data.data!
    },

    async createResource(input: AcademyResourceCreateDTO) {
        const res = await apiClient.post<StandardApiResponse<AcademyResourceResponseDTO>>(
            "/api/academy/resources",
            input,
        )
        return res.data.data!
    },

    async updateResource(id: string, input: AcademyResourceUpdateDTO) {
        const res = await apiClient.put<StandardApiResponse<AcademyResourceResponseDTO>>(
            `/api/academy/resources/${id}`,
            input,
        )
        return res.data.data!
    },

    async deleteResource(id: string) {
        const res = await apiClient.delete<StandardApiResponse<{ ok: boolean }>>(
            `/api/academy/resources/${id}`,
        )
        return res.data
    },

    async deleteFolder(id: string) {
        const res = await apiClient.delete<StandardApiResponse<{ ok: boolean }>>(
            `/api/academy/folders/${id}`,
        )
        return res.data
    },
}

/**
 * Hooks
 */
export function useAcademyFolders(ownerId: string, ownerType: string) {
    return useQuery({
        queryKey: ["academy-folders", ownerType, ownerId],
        queryFn: () => academyResourcesApi.getFoldersByOwner(ownerId, ownerType),
        enabled: !!ownerId,
    })
}

export function useCreateAcademyFolder() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: academyResourcesApi.createFolder,
        onSuccess: (_, variables) => {
            qc.invalidateQueries({ queryKey: ["academy-folders", variables.ownerType, variables.ownerId] })
        },
    })
}

export function useAcademyResources(folderId?: string) {
    return useQuery({
        queryKey: ["academy-resources", folderId],
        queryFn: () => academyResourcesApi.getResourcesByFolder(folderId!),
        enabled: !!folderId,
    })
}

export function useCreateAcademyResource() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: academyResourcesApi.createResource,
        onSuccess: (_, variables) => {
            qc.invalidateQueries({ queryKey: ["academy-resources", variables.folderId] })
            qc.invalidateQueries({ queryKey: ["academy-folders"] })
        },
    })
}

export function useUpdateAcademyResource() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: AcademyResourceUpdateDTO }) =>
            academyResourcesApi.updateResource(id, input),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["academy-resources"] })
            qc.invalidateQueries({ queryKey: ["academy-folders"] })
        },
    })
}

export function useDeleteAcademyResource() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => academyResourcesApi.deleteResource(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["academy-resources"] })
            qc.invalidateQueries({ queryKey: ["academy-folders"] })
        },
    })
}
export function useDeleteAcademyFolder() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => academyResourcesApi.deleteFolder(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["academy-folders"] })
        },
    })
}
