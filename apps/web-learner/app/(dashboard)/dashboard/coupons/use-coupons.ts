'use client';

import { useMyCoupons } from '@/lib/api/services/coupon-api';
import { useGamificationHistory } from '@/lib/api/services/gamification-api';
import { toast } from 'sonner';
import * as React from 'react';

export function useCoupons() {
    const { data: coupons, isLoading: couponsLoading } = useMyCoupons();
    const [historyPage, setHistoryPage] = React.useState(1);
    const historyLimit = 10;
    const { data: historyData, isLoading: historyLoading } = useGamificationHistory({
        page: historyPage,
        limit: historyLimit,
    });

    // Normalize API shapes:
    // - New/paginated: { items, page, limit, total, totalPages }
    // - Legacy: array of history entries
    // - Some gateways: { data: array }
    const historyItems = Array.isArray(historyData)
        ? historyData
        : (historyData as any)?.items ?? (historyData as any)?.data ?? [];

    // Server already paginates/sorts; keep stable order as received.
    const gamificationHistory = (historyItems || []) as any[];
    const historyMeta = {
        page: Array.isArray(historyData) ? historyPage : (historyData as any)?.page ?? historyPage,
        limit: Array.isArray(historyData) ? historyLimit : (historyData as any)?.limit ?? historyLimit,
        total: Array.isArray(historyData) ? gamificationHistory.length : (historyData as any)?.total ?? 0,
        totalPages: Array.isArray(historyData) ? 1 : (historyData as any)?.totalPages ?? 0,
    };

    const handleCopyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        toast.success(`Đã sao chép mã: ${code}`);
    };

    return {
        coupons,
        couponsLoading,
        gamificationHistory,
        historyLoading,
        historyMeta,
        historyPage,
        setHistoryPage,
        handleCopyCode
    };
}
