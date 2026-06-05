import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/api-client.ts';
import type { StandardApiResponse } from '@workspace/schemas';

// ============================================================================
// Types
// ============================================================================

export interface RoomInfo {
    roomId: string;
    roomTitle: string;
    sid: string;
    createdAt: string;
    ended: boolean;
    creationTime: string;
    metadata: string;
    welcomeMessage: string;
    maxParticipants: number;
    emptyTimeout: number;
    creationTimeMillis: string;
    turnPassword: string;
    enabledE2ee: boolean;
    allowRecording: boolean;
    allowRtmp: boolean;
    allowViewOtherWebcams: boolean;
    allowViewOtherUsersList: boolean;
    adminOnlyWebcams: boolean;
    muteOnStart: boolean;
    roomDuration: string;
}

export interface PastRoomInfo {
    roomId: string;
    roomTitle: string;
    sid: string;
    roomCreationTime: string;
    roomEndedTime: string;
    roomDuration: string;
    participants: number;
    analyticsFileId: string;
    recordingFiles?: RecordingFile[];
}

export interface RecordingFile {
    fileId: string;
    fileName: string;
    filePath: string;
    fileSize: string;
    recordingType: string;
    creationTime: string;
}

export interface FetchPastRoomsParams {
    from?: number;
    limit?: number;
    orderBy?: 'ASC' | 'DESC';
}

export interface FetchPastRoomsResult {
    totalRooms: string;
    from: string;
    limit: string;
    orderBy: string;
    roomsList: PastRoomInfo[];
}

// ============================================================================
// API Functions
// ============================================================================

export const roomsApi = {
    // GET active rooms info
    async getActiveRooms(): Promise<RoomInfo[]> {
        const response = await apiClient.get<StandardApiResponse<RoomInfo[]>>('/api/rooms/active');
        return response.data.data || [];
    },

    // GET single active room info
    async getActiveRoomInfo(roomId: string): Promise<RoomInfo | null> {
        const response = await apiClient.get<StandardApiResponse<RoomInfo>>(`/api/rooms/active/${roomId}`);
        return response.data.data || null;
    },

    // Check if room is active
    async isRoomActive(roomId: string): Promise<boolean> {
        const response = await apiClient.get<StandardApiResponse<{ isActive: boolean }>>(`/api/rooms/${roomId}/is-active`);
        return response.data.data?.isActive || false;
    },

    // Fetch past rooms
    async fetchPastRooms(params?: FetchPastRoomsParams): Promise<FetchPastRoomsResult> {
        const response = await apiClient.get<StandardApiResponse<FetchPastRoomsResult>>('/api/rooms/past', {
            params: {
                from: params?.from || 0,
                limit: params?.limit || 20,
                orderBy: params?.orderBy || 'DESC',
            }
        });
        return response.data.data || {
            totalRooms: '0',
            from: '0',
            limit: '20',
            orderBy: 'DESC',
            roomsList: [],
        };
    },

    // End a room
    async endRoom(roomId: string): Promise<boolean> {
        const response = await apiClient.post<StandardApiResponse<boolean>>(`/api/rooms/${roomId}/end`);
        return response.data.success;
    },
};

// ============================================================================
// React Query Hooks
// ============================================================================

export function useActiveRooms() {
    return useQuery({
        queryKey: ['rooms', 'active'],
        queryFn: () => roomsApi.getActiveRooms(),
        refetchInterval: 10000, // Refresh every 10 seconds
    });
}

export function useActiveRoomInfo(roomId: string) {
    return useQuery({
        queryKey: ['rooms', 'active', roomId],
        queryFn: () => roomsApi.getActiveRoomInfo(roomId),
        enabled: !!roomId,
        refetchInterval: 5000, // Refresh every 5 seconds
    });
}

export function usePastRooms(params?: FetchPastRoomsParams) {
    return useQuery({
        queryKey: ['rooms', 'past', params],
        queryFn: () => roomsApi.fetchPastRooms(params),
    });
}

export function useEndRoom() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (roomId: string) => roomsApi.endRoom(roomId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rooms', 'active'] });
            queryClient.invalidateQueries({ queryKey: ['rooms', 'past'] });
        },
    });
}
