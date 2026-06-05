import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api-client';
import type {
    CertificateResponseDTO,
    CertificateQueryDTO,
    StandardApiResponse,
    PaginatedApiResponse,
} from '@workspace/schemas';

export const certificateApi = {
    /**
     * Get all certificates (paginated)
     */
    async getAllCertificates(query?: CertificateQueryDTO): Promise<PaginatedApiResponse<CertificateResponseDTO>> {
        const response = await apiClient.get<PaginatedApiResponse<CertificateResponseDTO>>(
            '/api/certificates/me',
            { params: query }
        );
        return response.data;
    },

    /**
     * Get certificate by ID
     */
    async getCertificate(id: string): Promise<CertificateResponseDTO> {
        const response = await apiClient.get<StandardApiResponse<{ certificate: CertificateResponseDTO }>>(`/api/certificates/${id}`);
        return response.data.data!.certificate;
    },

    /**
     * Verify certificate by code
     */
    async verifyCertificate(code: string): Promise<{ valid: boolean; certificate?: CertificateResponseDTO }> {
        const response = await apiClient.get<StandardApiResponse<{ valid: boolean; certificate?: CertificateResponseDTO }>>(
            `/api/certificates/verify/${code}`
        );
        return response.data.data!;
    },

    async downloadCertificatePdfById(id: string): Promise<Blob> {
        const response = await apiClient.get<ArrayBuffer>(
            `/api/certificates/${id}/pdf`,
            { responseType: 'arraybuffer' },
        );
        return new Blob([response.data], { type: 'application/pdf' });
    },

    async downloadCertificatePdfByCode(code: string): Promise<Blob> {
        const response = await apiClient.get<ArrayBuffer>(
            `/api/certificates/verify/${code}/pdf`,
            { responseType: 'arraybuffer' },
        );
        return new Blob([response.data], { type: 'application/pdf' });
    },
};

/**
 * Hook: Get paginated certificates
 */
export function useCertificates(query?: CertificateQueryDTO) {
    return useQuery({
        queryKey: ['certificates', query],
        queryFn: () => certificateApi.getAllCertificates(query),
    });
}

/**
 * Hook: Get single certificate
 */
export function useCertificate(id: string) {
    return useQuery({
        queryKey: ['certificates', id],
        queryFn: () => certificateApi.getCertificate(id),
        enabled: !!id,
    });
}
