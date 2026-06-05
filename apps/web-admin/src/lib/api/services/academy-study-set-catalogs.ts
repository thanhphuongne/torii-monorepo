import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/api-client'
import type {
  AcademyStudySetCreateDTO,
  AcademyStudySetUpdateDTO,
  AcademyStudySetModel,
  StandardApiResponse,
} from '@workspace/schemas'

// Infer card shape from the model (no dedicated DTO type exported)
export interface SetCardInput {
  term: string
  definition: string
  hint?: string
  mediaUrl?: string
  tags?: string[]
  languageDetails?: Record<string, any>
}

export const academyStudySetCatalogsApi = {
  async findAll() {
    const res = await apiClient.get<StandardApiResponse<{ items: AcademyStudySetModel[] }>>(
      '/api/academy/study-set-catalogs/admin',
    )
    return res.data.data!.items
  },

  async findById(id: string) {
    const res = await apiClient.get<StandardApiResponse<{ item: AcademyStudySetModel & { setCards: any[] } }>>(
      `/api/academy/study-set-catalogs/admin/${id}`,
    )
    return res.data.data!.item
  },

  async create(input: AcademyStudySetCreateDTO) {
    const res = await apiClient.post<StandardApiResponse<{ item: AcademyStudySetModel }>>(
      '/api/academy/study-set-catalogs/admin',
      input,
    )
    return res.data.data!.item
  },

  async update(id: string, input: AcademyStudySetUpdateDTO) {
    const res = await apiClient.patch<StandardApiResponse<{ item: AcademyStudySetModel }>>(
      `/api/academy/study-set-catalogs/admin/${id}`,
      input,
    )
    return res.data.data!.item
  },

  async remove(id: string) {
    const res = await apiClient.delete<StandardApiResponse<{ result: boolean }>>(
      `/api/academy/study-set-catalogs/admin/${id}`,
    )
    return res.data.data!.result
  },

  async createCard(setId: string, input: SetCardInput) {
    const res = await apiClient.post<StandardApiResponse<{ item: any }>>(
      `/api/academy/study-set-catalogs/admin/${setId}/cards`,
      input,
    )
    return res.data.data!.item
  },

  async updateCard(cardId: string, input: Partial<SetCardInput>) {
    const res = await apiClient.patch<StandardApiResponse<{ item: any }>>(
      `/api/academy/study-set-catalogs/admin/cards/${cardId}`,
      input,
    )
    return res.data.data!.item
  },

  async deleteCard(cardId: string) {
    const res = await apiClient.delete<StandardApiResponse<{ ok: boolean }>>(
      `/api/academy/study-set-catalogs/admin/cards/${cardId}`,
    )
    return res.data
  },
}

export function useAcademyStudySetCatalogs() {
  return useQuery({
    queryKey: ['academy-study-set-catalogs-admin'],
    queryFn: academyStudySetCatalogsApi.findAll,
  })
}

export function useAcademyStudySetCatalogById(id: string) {
  return useQuery({
    queryKey: ['academy-study-set-catalog-detail', id],
    queryFn: () => academyStudySetCatalogsApi.findById(id),
    enabled: !!id,
  })
}

export function useCreateAcademyStudySetCatalog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: academyStudySetCatalogsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academy-study-set-catalogs-admin'] }),
  })
}

export function useUpdateAcademyStudySetCatalog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AcademyStudySetUpdateDTO }) =>
      academyStudySetCatalogsApi.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academy-study-set-catalogs-admin'] }),
  })
}

export function useDeleteAcademyStudySetCatalog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => academyStudySetCatalogsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academy-study-set-catalogs-admin'] }),
  })
}

export function useAdminCreateSetCard(setId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SetCardInput) => academyStudySetCatalogsApi.createCard(setId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academy-study-set-catalog-detail', setId] }),
  })
}

export function useAdminUpdateSetCard(setId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ cardId, input }: { cardId: string; input: Partial<SetCardInput> }) =>
      academyStudySetCatalogsApi.updateCard(cardId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academy-study-set-catalog-detail', setId] }),
  })
}

export function useAdminDeleteSetCard(setId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (cardId: string) => academyStudySetCatalogsApi.deleteCard(cardId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academy-study-set-catalog-detail', setId] }),
  })
}
