import { useQuery } from "@tanstack/react-query"
import { apiClient } from "../api-client.ts"
import type { StandardApiResponse } from "@workspace/schemas"

export interface PlatformOverview {
    totalUsers: number
    activeToday: number
    totalCourses: number
    totalEnrollments: number
    totalRevenue: number
    pendingApprovals: number
    activeRooms: number
    pendingTickets: number
    pendingRefunds: number
}

export interface PopularCourse {
    id: string
    title: string
    totalStudents: number
    jlptLevel: string
    thumbnailUrl: string | null
}

export interface RecentSale {
    id: string
    amount: string
    userName: string
    userEmail: string
    date: string
}

export interface GrowthPoint {
    name: string
    total: number
}

export interface RevenueByLevel {
    level: string
    amount: number
}

export interface AnalyticsOverviewResponse {
    overview: PlatformOverview
    popularCourses: PopularCourse[]
    recentSales: RecentSale[]
    growthData: GrowthPoint[]
    revenueByLevel: RevenueByLevel[]
}

export interface UserAnalyticsResponse {
    roles: { role: string; count: number }[]
    monthlyGrowth: { name: string; count: number }[]
    activityTrends: { date: string; count: number }[]
}

export interface CourseAnalyticsResponse {
    statsByLevel: { level: string; count: number }[]
    enrollmentByStatus: { status: string; count: number }[]
    averageCompletion: number
}

export const usePlatformOverview = () => {
    return useQuery({
        queryKey: ["analytics", "overview"],
        queryFn: async () => {
            const response = await apiClient.get<StandardApiResponse<AnalyticsOverviewResponse>>(
                "/api/analytics/overview"
            )

            return response.data.data!
        },
    })
}

export const useUserAnalytics = () => {
    return useQuery({
        queryKey: ["analytics", "users"],
        queryFn: async () => {
            const response = await apiClient.get<StandardApiResponse<UserAnalyticsResponse>>("/api/analytics/users")

            return response.data.data!
        },
    })
}

export const useCourseAnalytics = () => {
    return useQuery({
        queryKey: ["analytics", "courses"],
        queryFn: async () => {
            const response = await apiClient.get<StandardApiResponse<CourseAnalyticsResponse>>("/api/analytics/courses")

            return response.data.data!
        },
    })
}
