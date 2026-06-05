import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/api-client"
import type {
    AcademyEnrollmentCreateDTO,
    AcademyEnrollmentQueryDTO,
    AcademyEnrollmentUpdateDTO,
    StandardApiResponse,
} from "@workspace/schemas"

export type AcademyEnrollment = {
    id: string
    userId: string
    liveClassId?: string | null
    vodPackageId?: string | null
    enrolledAt: string
    expiresAt?: string | null
    status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED'
    sourceOrderId?: string | null
    companyId?: string | null
    metadata?: any
    courseTitle?: string
    courseCode?: string
    user?: {
        id: string
        displayName: string
        email: string
        avatarUrl?: string
    }
    liveClass?: {
        id: string
        name: string
        code: string
    }
    vodPackage?: {
        id: string
        name: string
        code: string
    }
}

export const academyEnrollmentsApi = {
    async findAll(params: AcademyEnrollmentQueryDTO) {
        const res = await apiClient.get<StandardApiResponse<any>>("/api/academy/enrollments", {
            params,
        })

        // Backend hiện tại có thể trả theo 2 format:
        // 1) { success: true, data: [...] }
        // 2) { success: true, data: { items: [...] } }
        const payload = res.data.data
        if (Array.isArray(payload)) return payload as AcademyEnrollment[]
        if (payload?.items && Array.isArray(payload.items)) return payload.items as AcademyEnrollment[]
        return []
    },

    async findById(id: string) {
        const res = await apiClient.get<StandardApiResponse<any>>(`/api/academy/enrollments/${id}`)
        return (res.data.data?.item ?? res.data.data) as AcademyEnrollment
    },

    async create(input: AcademyEnrollmentCreateDTO) {
        const res = await apiClient.post<StandardApiResponse<any>>("/api/academy/enrollments", input)
        return (res.data.data?.item ?? res.data.data) as AcademyEnrollment
    },

    async update(id: string, input: AcademyEnrollmentUpdateDTO) {
        const res = await apiClient.put<StandardApiResponse<any>>(`/api/academy/enrollments/${id}`, input)
        return (res.data.data?.item ?? res.data.data) as AcademyEnrollment
    },

    async cancel(id: string) {
        return this.update(id, { status: "CANCELLED" })
    },

    async delete(id: string) {
        const res = await apiClient.delete<StandardApiResponse<any>>(
            `/api/academy/enrollments/${id}`,
        )
        return res.data.data ?? res.data
    },
}

export function useAcademyEnrollments(
    params: AcademyEnrollmentQueryDTO,
) {
    return useQuery({
        queryKey: ["academy-enrollments", params],
        queryFn: () => academyEnrollmentsApi.findAll(params),
    })
}

export function useAcademyEnrollment(id?: string) {
    return useQuery({
        enabled: !!id,
        queryKey: ["academy-enrollment", id],
        queryFn: () => academyEnrollmentsApi.findById(id!),
    })
}

export function useCreateAcademyEnrollment() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: academyEnrollmentsApi.create,
        onSuccess: () =>
            qc.invalidateQueries({ queryKey: ["academy-enrollments"] }),
    })
}

export function useUpdateAcademyEnrollment() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({
            id,
            input,
        }: {
            id: string
            input: AcademyEnrollmentUpdateDTO
        }) => academyEnrollmentsApi.update(id, input),
        onSuccess: () =>
            qc.invalidateQueries({ queryKey: ["academy-enrollments"] }),
    })
}

export function useCancelAcademyEnrollment() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => academyEnrollmentsApi.cancel(id),
        onSuccess: () =>
            qc.invalidateQueries({ queryKey: ["academy-enrollments"] }),
    })
}

export function useDeleteAcademyEnrollment() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => academyEnrollmentsApi.delete(id),
        onSuccess: () =>
            qc.invalidateQueries({ queryKey: ["academy-enrollments"] }),
    })
}
