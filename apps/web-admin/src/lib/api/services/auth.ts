import { apiClient } from '@/lib/api/api-client.ts'
import type { StandardApiResponse } from '@workspace/schemas'

export const authApi = {
    forgotPassword: async (email: string) => {
        const response = await apiClient.post<StandardApiResponse<any>>('/api/auth/forgot-password', {
            email,
            clientType: 'admin',
        })
        return response.data
    },
    resetPassword: async (data: { token: string, password: string }) => {
        const response = await apiClient.post<StandardApiResponse<any>>('/api/auth/reset-password', data)
        return response.data
    },
}
