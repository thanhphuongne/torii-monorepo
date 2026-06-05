import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/api-client"
import type {
    AcademyClassAttendanceCreateDTO,
    AcademyClassAttendanceQueryDTO,
    AcademyClassAttendanceUpdateDTO,
    StandardApiResponse,
} from "@workspace/schemas"

export type AcademyClassAttendance = {
    id: string
    sessionId: string
    userId: string
    status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"
    recordedAt: string
    user?: {
        id: string
        displayName: string
        avatarUrl?: string | null
    }
}

export const academyClassAttendancesApi = {
    async findAll(params: AcademyClassAttendanceQueryDTO) {
        const res = await apiClient.get<StandardApiResponse<{ items: AcademyClassAttendance[]; total: number }>>(
            "/api/academy/class-attendances",
            { params },
        )
        return res.data.data!
    },

    async findById(id: string) {
        const res = await apiClient.get<StandardApiResponse<{ item: AcademyClassAttendance }>>(
            `/api/academy/class-attendances/${id}`,
        )
        return res.data.data!.item
    },

    async create(input: AcademyClassAttendanceCreateDTO) {
        const res = await apiClient.post<StandardApiResponse<{ item: AcademyClassAttendance }>>(
            "/api/academy/class-attendances",
            input,
        )
        return res.data.data!.item
    },

    async update(id: string, input: AcademyClassAttendanceUpdateDTO) {
        const res = await apiClient.patch<StandardApiResponse<{ item: AcademyClassAttendance }>>(
            `/api/academy/class-attendances/${id}`,
            input,
        )
        return res.data.data!.item
    },

    async delete(id: string) {
        const res = await apiClient.delete<StandardApiResponse<{ ok: boolean }>>(
            `/api/academy/class-attendances/${id}`,
        )
        return res.data
    },
}

export function useAcademyClassAttendances(params: AcademyClassAttendanceQueryDTO) {
    return useQuery({
        queryKey: ["academy-class-attendances", params],
        queryFn: () => academyClassAttendancesApi.findAll(params),
    })
}

export function useAcademyClassAttendance(id?: string) {
    return useQuery({
        enabled: !!id,
        queryKey: ["academy-class-attendance", id],
        queryFn: () => academyClassAttendancesApi.findById(id!),
    })
}

export function useCreateAcademyClassAttendance() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: academyClassAttendancesApi.create,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["academy-class-attendances"] })
        },
    })
}

export function useUpdateAcademyClassAttendance() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: AcademyClassAttendanceUpdateDTO }) =>
            academyClassAttendancesApi.update(id, input),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["academy-class-attendances"] })
        },
    })
}
