import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TicketQueryDTO, TicketResponseDTO, UpdateTicketStatusDTO, StandardApiResponse, PaginatedApiResponse } from '@workspace/schemas';
import { apiClient } from '../api-client.ts';

export const ticketApi = {
    findAll: async (query: TicketQueryDTO): Promise<PaginatedApiResponse<TicketResponseDTO>> => {
        const response = await apiClient.get<PaginatedApiResponse<TicketResponseDTO>>('/api/tickets', { params: query });
        return response.data;
    },

    findById: async (id: string): Promise<TicketResponseDTO> => {
        const response = await apiClient.get<StandardApiResponse<TicketResponseDTO>>(`/api/tickets/${id}`);
        return response.data.data!;
    },

    updateStatus: async (id: string, dto: UpdateTicketStatusDTO): Promise<TicketResponseDTO> => {
        const response = await apiClient.patch<StandardApiResponse<TicketResponseDTO>>(`/api/tickets/${id}/status`, dto);
        return response.data.data!;
    },

    getStats: async (): Promise<{ pendingCount: number; refundCount: number; totalCount: number }> => {
        const response = await apiClient.get<StandardApiResponse<{ pendingCount: number; refundCount: number; totalCount: number }>>('/api/tickets/stats');
        return response.data.data!;
    }
};

export const useUpdateTicketStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...dto }: { id: string } & UpdateTicketStatusDTO) => ticketApi.updateStatus(id, dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
            queryClient.invalidateQueries({ queryKey: ['ticketStats'] });
        },
    });
};

export const useTicketStats = () => {
    return useQuery({
        queryKey: ['ticketStats'],
        queryFn: ticketApi.getStats,
    });
};
