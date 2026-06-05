import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateTicketDTO, TicketQueryDTO, TicketResponseDTO, PaginatedResponseDTO } from '@workspace/schemas';
import { apiClient } from '../api-client';

export const useTickets = (query: TicketQueryDTO) => {
    return useQuery<PaginatedResponseDTO<TicketResponseDTO>>({
        queryKey: ['tickets', query],
        queryFn: async () => {
            const { data } = await apiClient.get('/api/tickets/me', { params: query });
            return data;
        },
    });
};

export const useTicket = (id: string) => {
    return useQuery<TicketResponseDTO>({
        queryKey: ['ticket', id],
        queryFn: async () => {
            const { data } = await apiClient.get(`/api/tickets/${id}`);
            return data.data;
        },
        enabled: !!id,
    });
};

export const useCreateTicket = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (dto: CreateTicketDTO & { vodPackageId?: string }) => {
            const { data } = await apiClient.post('/api/tickets', dto);
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
        },
    });
};

export const useCancelTicket = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await apiClient.post(`/api/tickets/${id}/cancel`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
        },
    });
};
