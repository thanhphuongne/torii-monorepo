'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { TicketResponseDTO, TicketQueryDTO } from '@workspace/schemas';
import { TicketType, TicketStatus } from '@workspace/schemas';
import { useDebounceValue } from '@workspace/ui/hooks/use-debounce-value';
import { PageHeader } from '@/components/common/page-header';
import { TicketsPrimaryToolbar } from '@/components/tickets/tickets-primary-toolbar';
import { TicketsTable } from '@/components/tickets/tickets-table';
import { dataTableShellClass } from '@/lib/ui-shell';
import { TicketDetailSheet } from '@/components/tickets/ticket-detail-sheet';
import { ChangeTicketStatusDialog } from '@/components/tickets/change-ticket-status-dialog';
import { ticketApi, useTicketStats } from '@/lib/api/services/tickets';
import { SmartPagination } from "@/components/common/smart-pagination";

export default function TicketsPage() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [debouncedSearch] = useDebounceValue(search, 500);
    const [typeFilter, setTypeFilter] = useState<TicketType | ''>('');
    const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('');

    const [viewingTicket, setViewingTicket] = useState<TicketResponseDTO | null>(null);
    const [changingStatusTicket, setChangingStatusTicket] = useState<TicketResponseDTO | null>(null);

    const { data: stats } = useTicketStats();

    const queryParams: TicketQueryDTO = {
        page,
        limit: 10,
        search: debouncedSearch,
        type: typeFilter as TicketType || undefined,
        status: statusFilter as TicketStatus || undefined,
    };

    const { data, isLoading } = useQuery({
        queryKey: ['tickets', queryParams],
        queryFn: () => ticketApi.findAll(queryParams),
    });

    const tickets = data?.data || [];
    const meta = data ? {
        total: data.total,
        totalPages: data.totalPages,
        page: data.page,
        limit: data.limit,
    } : null;

    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title="Yêu cầu hỗ trợ"
                subtitle="Quản lý và giải quyết các yêu cầu từ người dùng"
                stats={[
                    { label: 'Đang chờ', value: stats?.pendingCount || 0 },
                    { label: 'Yêu cầu hoàn tiền', value: stats?.refundCount || 0 },
                    { label: 'Tổng số', value: stats?.totalCount || 0 },
                ]}
            />
            <div className="space-y-4">
                <TicketsPrimaryToolbar
                    search={search}
                    onSearchChange={setSearch}
                    type={typeFilter}
                    onTypeChange={(v) => setTypeFilter(v === 'all' ? '' : v as TicketType)}
                    status={statusFilter}
                    onStatusChange={(v) => setStatusFilter(v === 'all' ? '' : v as TicketStatus)}
                />
                <div className={dataTableShellClass}>
                    <TicketsTable
                        data={tickets}
                        isLoading={isLoading}
                        onView={setViewingTicket}
                        onChangeStatus={setChangingStatusTicket}
                        page={page}
                        limit={queryParams.limit || 10}
                    />
                </div>
                <SmartPagination
                    page={page}
                    totalPages={meta?.totalPages || 0}
                    totalItems={meta?.total || 0}
                    onPageChange={setPage}
                    itemName="yêu cầu"
                />
            </div>

            <TicketDetailSheet
                open={!!viewingTicket}
                onOpenChange={(open) => !open && setViewingTicket(null)}
                ticket={viewingTicket}
            />

            <ChangeTicketStatusDialog
                open={!!changingStatusTicket}
                onOpenChange={(open) => !open && setChangingStatusTicket(null)}
                ticket={changingStatusTicket}
            />
        </div>
    );
}
