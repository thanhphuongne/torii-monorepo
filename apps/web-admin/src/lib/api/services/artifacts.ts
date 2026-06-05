/**
 * Artifacts API Service for Web Admin
 * 
 * Wraps meet artifacts API with standard JWT auth and JSON responses
 */

import { apiClient } from '../api-client.ts';

// Standard API Response type
type ApiResponse<T = any> = {
    success: boolean;
    data?: T;
    message?: string;
};

export interface ArtifactFileInfo {
    filePath: string;
    fileSize: string;
    mimeType?: string;
}

export interface ArtifactUsageDetails {
    // Duration usage (transcription)
    durationSec?: number;
    durationSecEstimatedCost?: number;

    // Character count usage (translation, TTS)
    totalCharacters?: number;
    totalCharactersEstimatedCost?: number;

    // Token usage (AI chat)
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    promptTokensEstimatedCost?: number;
    completionTokensEstimatedCost?: number;
    totalTokensEstimatedCost?: number;

    // Summary
    summaryText?: string;

    breakdown?: Record<string, string>;
}

export interface ArtifactMetadata {
    fileInfo?: ArtifactFileInfo;
    usageDetails?: ArtifactUsageDetails;
    referenceArtifactId?: string;
}

export type ArtifactType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export const ArtifactTypeEnum = {
    UNKNOWN: 0 as ArtifactType,
    MEETING_ANALYTICS: 1 as ArtifactType,
    MEETING_SUMMARY: 2 as ArtifactType,
    SPEECH_TRANSCRIPTION: 3 as ArtifactType,
    SPEECH_TRANSCRIPTION_USAGE: 4 as ArtifactType,
    CHAT_TRANSLATION_USAGE: 5 as ArtifactType,
    SYNTHESIZED_SPEECH_USAGE: 6 as ArtifactType,
    AI_TEXT_CHAT_INTERACTION_USAGE: 7 as ArtifactType,
    AI_TEXT_CHAT_SUMMARIZATION_USAGE: 8 as ArtifactType,
    CLOUD_RECORDING: 9 as ArtifactType,
    RTMP_RECORDING: 10 as ArtifactType,
} as const;

export interface ArtifactInfo {
    artifactId: string;
    roomId: string;
    type: ArtifactType;
    metadata: ArtifactMetadata;
    created: string;
}

export interface FetchArtifactsParams {
    roomIds?: string[];
    roomSid?: string;
    type?: ArtifactType;
    limit?: number;
    from?: number;
    orderBy?: 'ASC' | 'DESC';
}

export interface FetchArtifactsResponse {
    artifacts: ArtifactInfo[];
    totalArtifacts: number;
    from: number;
    limit: number;
}

export interface ArtifactInfoResponse {
    artifact: ArtifactInfo;
    roomInfo?: {
        roomTitle: string;
        roomId: string;
        roomSid: string;
        joinedParticipants: number;
        created: string;
        ended?: string;
    };
}

export interface DownloadTokenResponse {
    token: string;
    expiresIn: number;
}

class ArtifactsApiService {
    /**
     * Fetch artifacts with filters and pagination
     */
    async fetchArtifacts(params: FetchArtifactsParams = {}): Promise<ApiResponse<FetchArtifactsResponse>> {
        const response = await apiClient.post<ApiResponse<FetchArtifactsResponse>>(
            '/meet/artifacts/fetch',
            {
                roomIds: params.roomIds || [],
                roomSid: params.roomSid,
                type: params.type,
                limit: params.limit?.toString() || '20',
                from: params.from?.toString() || '0',
                orderBy: params.orderBy || 'DESC',
            }
        );
        return response.data;
    }

    /**
     * Get detailed information about a specific artifact
     */
    async getArtifactInfo(artifactId: string): Promise<ApiResponse<ArtifactInfoResponse>> {
        const response = await apiClient.post<ApiResponse<ArtifactInfoResponse>>(
            '/meet/artifacts/info',
            { artifactId }
        );
        return response.data;
    }

    /**
     * Get download token for an artifact file
     */
    async getDownloadToken(artifactId: string): Promise<ApiResponse<DownloadTokenResponse>> {
        const response = await apiClient.post<ApiResponse<DownloadTokenResponse>>(
            '/meet/artifacts/download-token',
            { artifactId }
        );
        return response.data;
    }

    /**
     * Download artifact file using token
     */
    async downloadArtifact(token: string): Promise<Blob> {
        const response = await apiClient.get(`/meet/artifacts/download`, {
            params: { token },
            responseType: 'blob',
        });
        return response.data;
    }

    /**
     * Delete an artifact
     */
    async deleteArtifact(artifactId: string): Promise<ApiResponse<void>> {
        const response = await apiClient.post<ApiResponse<void>>(
            '/meet/artifacts/delete',
            { artifactId }
        );
        return response.data;
    }

    /**
     * Get artifacts for a specific room
     */
    async getRoomArtifacts(roomId: string, type?: ArtifactType): Promise<ApiResponse<FetchArtifactsResponse>> {
        return this.fetchArtifacts({
            roomIds: [roomId],
            type,
            limit: 100,
        });
    }

    /**
     * Get artifact type label
     */
    getArtifactTypeLabel(type: ArtifactType): string {
        const labels: Record<number, string> = {
            [ArtifactTypeEnum.UNKNOWN]: 'Unknown',
            [ArtifactTypeEnum.MEETING_ANALYTICS]: 'Meeting Analytics',
            [ArtifactTypeEnum.MEETING_SUMMARY]: 'Meeting Summary',
            [ArtifactTypeEnum.SPEECH_TRANSCRIPTION]: 'Speech Transcription',
            [ArtifactTypeEnum.SPEECH_TRANSCRIPTION_USAGE]: 'Transcription Usage',
            [ArtifactTypeEnum.CHAT_TRANSLATION_USAGE]: 'Chat Translation Usage',
            [ArtifactTypeEnum.SYNTHESIZED_SPEECH_USAGE]: 'Synthesized Speech Usage',
            [ArtifactTypeEnum.AI_TEXT_CHAT_INTERACTION_USAGE]: 'AI Chat Interaction',
            [ArtifactTypeEnum.AI_TEXT_CHAT_SUMMARIZATION_USAGE]: 'AI Chat Summarization',
            [ArtifactTypeEnum.CLOUD_RECORDING]: 'Cloud Recording',
            [ArtifactTypeEnum.RTMP_RECORDING]: 'RTMP Recording',
        };
        return labels[type] || 'Unknown';
    }

    /**
     * Check if artifact is downloadable
     */
    isDownloadable(type: ArtifactType): boolean {
        return [
            ArtifactTypeEnum.MEETING_ANALYTICS,
            ArtifactTypeEnum.MEETING_SUMMARY,
            ArtifactTypeEnum.SPEECH_TRANSCRIPTION,
            ArtifactTypeEnum.CLOUD_RECORDING,
            ArtifactTypeEnum.RTMP_RECORDING,
        ].includes(type);
    }
}

export const artifactsApi = new ArtifactsApiService();
