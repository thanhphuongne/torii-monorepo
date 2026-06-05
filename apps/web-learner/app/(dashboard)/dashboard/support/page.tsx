'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTickets } from '@/lib/api/services/ticket-api';
import { TicketTable } from '@/components/support/ticket-table';
import { CreateTicketDialog } from '@/components/support/create-ticket-dialog';
import { TicketDetailDialog } from '@/components/support/ticket-detail-dialog';
import { Button } from '@workspace/ui/components/button';
import { PlusCircle } from 'lucide-react';
import { PageLoading } from "@workspace/ui/components/page-loading";
import { SmartPagination } from "@/components/common/smart-pagination";
import { TicketResponseDTO } from "@workspace/schemas";

export default function SupportPage() {
    const [page, setPage] = useState(1);
    const { data: queryResult, isLoading, isError } = useTickets({ page, limit: 10 });
    const [isCreateOpen, setCreateOpen] = useState(false);
    const [isDetailOpen, setDetailOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<TicketResponseDTO | null>(null);

    const handleViewDetails = (id: string) => {
        const ticket = queryResult?.data?.find(t => t.id === id);
        if (ticket) {
            setSelectedTicket(ticket);
            setDetailOpen(true);
        }
    };

    const { isLoading: isSingleTicketLoading } = useQuery({
        queryKey: ['ticket', selectedTicket?.id],
        queryFn: () => {
            // This is a bit of a hack to get the ticket data for the dialog
            // In a real app, you might fetch this from an API
            return Promise.resolve(queryResult?.data?.find(t => t.id === selectedTicket?.id));
        },
        enabled: !!selectedTicket?.id,
    });

    if (isLoading) return <PageLoading />;
    if (isError) return <div>Đã xảy ra lỗi khi tải dữ liệu.</div>;

    const tickets = queryResult?.data || [];
    const meta = queryResult ? {
        total: queryResult.total,
        totalPages: queryResult.totalPages,
        page: queryResult.page,
        limit: queryResult.limit,
    } : null;

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between pb-8 border-b border-border">
                <div className="min-w-0 space-y-4">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                        Hỗ trợ
                    </h1>
                    <p className="max-w-2xl text-sm font-medium text-muted-foreground">
                        Theo dõi và quản lý các yêu cầu hỗ trợ của bạn.
                    </p>
                </div>
                <Button onClick={() => setCreateOpen(true)} className="shrink-0">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Tạo yêu cầu mới
                </Button>
            </div>

            <div className="space-y-4">
                <TicketTable
                    data={tickets}
                    onView={handleViewDetails}
                    isLoading={isLoading}
                    page={page}
                    limit={10}
                />
                <SmartPagination
                    page={page}
                    totalPages={meta?.totalPages || 0}
                    totalItems={meta?.total || 0}
                    onPageChange={setPage}
                    itemName="yêu cầu"
                />
            </div>

            <CreateTicketDialog open={isCreateOpen} onOpenChange={setCreateOpen} />
            <TicketDetailDialog
                open={isDetailOpen}
                onOpenChange={setDetailOpen}
                ticket={selectedTicket}
                isLoading={isSingleTicketLoading}
            />
        </div>
    );
}
