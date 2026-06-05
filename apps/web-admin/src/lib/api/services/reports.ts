import { apiClient } from "../api-client.ts";

export const reportApi = {
    exportReport: async (type: 'orders' | 'balance' | 'revenue', startDate?: string, endDate?: string) => {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        const response = await apiClient.get(`/api/analytics/reports/export/${type}`, {
            params,
            responseType: 'blob',
        });

        // Trigger download
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        const dateStr = new Date().toISOString().split('T')[0];
        link.setAttribute('download', `torii-report-${type}-${dateStr}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    }
};
