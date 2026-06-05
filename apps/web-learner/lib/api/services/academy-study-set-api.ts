import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query"
import { apiClient } from "../api-client"
import type {
    AcademyStudySetCreateDTO,
    AcademyStudySetUpdateDTO,
    AcademyStudySetShareDTO,
    AcademyClonePublicStudySetDTO,
    AcademyPublicStudySetModel,
    AcademySetCardCreateDTO,
    AcademySetCardUpdateDTO,
    AcademySetCardReviewDTO,
    AcademyStudySetModel,
    AcademySetCardModel,
    StandardApiResponse,
} from "@workspace/schemas"

export type AcademyStudySetWithCards = AcademyStudySetModel & { setCards: AcademySetCardModel[] }

export const academyStudySetApi = {
    // Sets
    async createSet(payload: AcademyStudySetCreateDTO) {
        const res = await apiClient.post<StandardApiResponse<{ item: AcademyStudySetModel }>>(
            "/api/academy/study-sets",
            payload,
        )
        return res.data.data!.item
    },

    async findAllSets() {
        const res = await apiClient.get<StandardApiResponse<{ items: AcademyStudySetModel[] }>>(
            "/api/academy/study-sets",
        )
        return res.data.data!.items
    },

    async findPublicCatalogSets(q?: string) {
        const res = await apiClient.get<StandardApiResponse<{ items: AcademyStudySetModel[] }>>(
            "/api/academy/study-set-catalogs",
            { params: { q } }
        )
        return (res.data.data!.items || []).map((item) => ({ ...item, isCatalog: item.sourceType === 'SYSTEM' }))
    },

    async findSetById(id: string) {
        const res = await apiClient.get<StandardApiResponse<{ item: AcademyStudySetWithCards }>>(
            `/api/academy/study-sets/${id}`,
        )
        return res.data.data!.item
    },

    async findPublicCatalogSetById(id: string) {
        const res = await apiClient.get<StandardApiResponse<{ item: AcademyStudySetWithCards }>>(
            `/api/academy/study-set-catalogs/${id}`,
        )
        return { ...res.data.data!.item, isCatalog: true }
    },

    async clonePublicSet(payload: AcademyClonePublicStudySetDTO) {
        const res = await apiClient.post<StandardApiResponse<{ item: AcademyStudySetModel }>>(
            `/api/academy/study-set-catalogs/${payload.sourceSetId}/clone`,
            { title: payload.title },
        )
        return res.data.data!.item
    },

    async updateSet(id: string, payload: AcademyStudySetUpdateDTO) {
        const res = await apiClient.patch<StandardApiResponse<{ item: AcademyStudySetModel }>>(
            `/api/academy/study-sets/${id}`,
            payload,
        )
        return res.data.data!.item
    },

    async deleteSet(id: string) {
        const res = await apiClient.delete<StandardApiResponse<{ result: boolean }>>(
            `/api/academy/study-sets/${id}`,
        )
        return res.data.data!.result
    },

    async updateSetSharing(id: string, payload: AcademyStudySetShareDTO) {
        const res = await apiClient.patch<StandardApiResponse<{ item: AcademyStudySetModel }>>(
            `/api/academy/study-sets/${id}/share`,
            payload,
        )
        return res.data.data!.item
    },

    async findPublicSharedSetByToken(token: string) {
        const res = await apiClient.get<StandardApiResponse<{ item: AcademyPublicStudySetModel }>>(
            `/api/academy/study-sets/public/${token}`,
        )
        return res.data.data!.item
    },

    // Cards
    async createCard(setId: string, payload: AcademySetCardCreateDTO) {
        const res = await apiClient.post<StandardApiResponse<{ item: AcademySetCardModel }>>(
            `/api/academy/study-sets/${setId}/cards`,
            payload,
        )
        return res.data.data!.item
    },

    async updateCard(cardId: string, payload: AcademySetCardUpdateDTO) {
        const res = await apiClient.patch<StandardApiResponse<{ item: AcademySetCardModel }>>(
            `/api/academy/set-cards/${cardId}`,
            payload,
        )
        return res.data.data!.item
    },

    async deleteCard(cardId: string) {
        const res = await apiClient.delete<StandardApiResponse<{ result: boolean }>>(
            `/api/academy/set-cards/${cardId}`,
        )
        return res.data.data!.result
    },

    // Study Phase
    async getStudyCards(setId: string) {
        const res = await apiClient.get<StandardApiResponse<{ items: AcademySetCardModel[] }>>(
            `/api/academy/study-sets/${setId}/study`,
        )
        return res.data.data!.items
    },

    async reviewCard(cardId: string, payload: AcademySetCardReviewDTO) {
        const res = await apiClient.post<StandardApiResponse<{ item: AcademySetCardModel }>>(
            `/api/academy/set-cards/${cardId}/review`,
            payload,
        )
        return res.data.data!.item
    },

    // Extra Study Modes
    async getTestQuiz(setId: string, count?: number) {
        const res = await apiClient.get<StandardApiResponse<{ items: any[] }>>(
            `/api/academy/study-sets/${setId}/study-modes/test`,
            { params: { count } },
        )
        return res.data.data!.items
    },

    async getMatchGame(setId: string, count?: number) {
        const res = await apiClient.get<StandardApiResponse<{ items: any[] }>>(
            `/api/academy/study-sets/${setId}/study-modes/match`,
            { params: { count } },
        )
        return res.data.data!.items
    },
}

// Hooks
export function useAcademyStudySets(options?: Omit<UseQueryOptions<AcademyStudySetModel[]>, "queryKey" | "queryFn">) {
    return useQuery({
        queryKey: ["academy-study-sets"],
        queryFn: academyStudySetApi.findAllSets,
        ...options,
    })
}

export function usePublicCatalogStudySets(q?: string, options?: Omit<UseQueryOptions<AcademyStudySetModel[]>, "queryKey" | "queryFn">) {
    return useQuery({
        queryKey: ["academy-public-study-set-catalogs", q],
        queryFn: () => academyStudySetApi.findPublicCatalogSets(q),
        ...options,
    })
}

export function useAcademyStudySet(id?: string, options?: Omit<UseQueryOptions<AcademyStudySetWithCards>, "queryKey" | "queryFn">) {
    return useQuery({
        enabled: !!id,
        queryKey: ["academy-study-set", id],
        queryFn: () => academyStudySetApi.findSetById(id!),
        ...options,
    })
}

export function usePublicCatalogStudySet(id?: string, options?: Omit<UseQueryOptions<AcademyStudySetWithCards>, "queryKey" | "queryFn">) {
    return useQuery({
        enabled: !!id,
        queryKey: ["academy-public-study-set-catalog", id],
        queryFn: () => academyStudySetApi.findPublicCatalogSetById(id!),
        ...options,
    })
}

export function useCreateAcademyStudySet() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: academyStudySetApi.createSet,
        onSuccess: () => qc.invalidateQueries({ queryKey: ["academy-study-sets"] }),
    })
}

export function useClonePublicStudySet() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: academyStudySetApi.clonePublicSet,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["academy-study-sets"] })
            qc.invalidateQueries({ queryKey: ["academy-public-study-set-catalogs"] })
        },
    })
}

export function useUpdateAcademyStudySet() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: AcademyStudySetUpdateDTO }) =>
            academyStudySetApi.updateSet(id, payload),
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: ["academy-study-sets"] })
            qc.invalidateQueries({ queryKey: ["academy-study-set", data.id] })
        },
    })
}

export function useDeleteAcademyStudySet() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: academyStudySetApi.deleteSet,
        onSuccess: () => qc.invalidateQueries({ queryKey: ["academy-study-sets"] }),
    })
}

export function useShareAcademyStudySet() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: AcademyStudySetShareDTO }) =>
            academyStudySetApi.updateSetSharing(id, payload),
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: ["academy-study-sets"] })
            qc.invalidateQueries({ queryKey: ["academy-study-set", data.id] })
            qc.invalidateQueries({ queryKey: ["academy-public-study-set-catalogs"] })
        },
    })
}

export function useCreateAcademySetCard() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ setId, payload }: { setId: string; payload: AcademySetCardCreateDTO }) =>
            academyStudySetApi.createCard(setId, payload),
        onSuccess: (_, variables) => {
            qc.invalidateQueries({ queryKey: ["academy-study-set", variables.setId] })
        },
    })
}

export function useUpdateAcademySetCard() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ cardId, payload }: { cardId: string; setId?: string; payload: AcademySetCardUpdateDTO }) =>
            academyStudySetApi.updateCard(cardId, payload),
        onSuccess: (data: AcademySetCardModel) => {
            qc.invalidateQueries({ queryKey: ["academy-study-set", data.studySetId] })
        },
    })
}

export function useDeleteAcademySetCard() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ cardId, setId }: { cardId: string; setId: string }) =>
            academyStudySetApi.deleteCard(cardId),
        onSuccess: (_, variables) => {
            qc.invalidateQueries({ queryKey: ["academy-study-set", variables.setId] })
        },
    })
}

export function useAcademyStudyCards(setId?: string, options?: Omit<UseQueryOptions<AcademySetCardModel[]>, "queryKey" | "queryFn">) {
    return useQuery({
        enabled: !!setId,
        queryKey: ["academy-study-cards", setId],
        queryFn: () => academyStudySetApi.getStudyCards(setId!),
        ...options,
    })
}

export function useReviewAcademyCard() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ cardId, payload, setId }: { cardId: string; payload: AcademySetCardReviewDTO; setId?: string }) =>
            academyStudySetApi.reviewCard(cardId, payload),
        onSuccess: (data: AcademySetCardModel) => {
            qc.invalidateQueries({ queryKey: ["academy-study-cards", data.studySetId] })
        },
    })
}

export function useAcademyTestQuiz(setId?: string, count?: number, options?: Omit<UseQueryOptions<any[]>, "queryKey" | "queryFn">) {
    return useQuery({
        enabled: !!setId,
        queryKey: ["academy-study-mode-test", setId, count],
        queryFn: () => academyStudySetApi.getTestQuiz(setId!, count),
        ...options,
    })
}

export function useAcademyMatchGame(setId?: string, count?: number, options?: Omit<UseQueryOptions<any[]>, "queryKey" | "queryFn">) {
    return useQuery({
        enabled: !!setId,
        queryKey: ["academy-study-mode-match", setId, count],
        queryFn: () => academyStudySetApi.getMatchGame(setId!, count),
        ...options,
    })
}

export function usePublicSharedStudySet(token?: string, options?: Omit<UseQueryOptions<AcademyPublicStudySetModel>, "queryKey" | "queryFn">) {
    return useQuery({
        enabled: !!token,
        queryKey: ["academy-public-shared-study-set", token],
        queryFn: () => academyStudySetApi.findPublicSharedSetByToken(token!),
        ...options,
    })
}

