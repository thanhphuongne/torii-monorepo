import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/api-client";
import type { RevenueAnalyticsResponseDTO, StandardApiResponse } from "@workspace/schemas";

export const revenueAnalyticsApi = {
  async getRevenueAnalytics(params?: {
    fromDate?: string;
    toDate?: string;
  }): Promise<RevenueAnalyticsResponseDTO> {
    const response = await apiClient.get<StandardApiResponse<RevenueAnalyticsResponseDTO>>(
      "/api/dashboard/revenue-analytics",
      { params },
    );
    return response.data.data!;
  },
};

export function useRevenueAnalytics(params?: { fromDate?: string; toDate?: string }) {
  return useQuery({
    queryKey: ["dashboard", "revenue-analytics", params?.fromDate ?? "", params?.toDate ?? ""],
    queryFn: () => revenueAnalyticsApi.getRevenueAnalytics(params),
    staleTime: 60_000,
    retry: 1,
  });
}

