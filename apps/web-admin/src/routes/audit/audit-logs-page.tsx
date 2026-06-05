import { useState, useEffect } from 'react';
import { formatDateTime, subtractDays } from '@/lib/format-utils';
import { Button } from '@workspace/ui/components/button';
import { ShieldAlert } from 'lucide-react';
import { type AuditLog, useAuditLogs } from "@/lib/api/services/audit-logs.ts";
import { useDebounceValue } from '@workspace/ui/hooks/use-debounce-value';
import { SmartPagination } from '@/components/common/smart-pagination';
import { PageHeader } from '@/components/common/page-header';
import { Empty, EmptyContent, EmptyMedia, EmptyTitle, EmptyDescription } from "@workspace/ui/components/empty";
import { AuditLogDetailsSheet } from '@/components/audit/audit-log-details-sheet';
import { AuditLogsToolbar } from '@/components/audit/audit-logs-toolbar';
import { AuditLogsTable } from '@/components/audit/audit-logs-table';

export function AuditLogsPage() {
    const [action, setAction] = useState('');
    const [entity, setEntity] = useState('');
    const [debouncedAction] = useDebounceValue(action, 500);
    const [debouncedEntity] = useDebounceValue(entity, 500);

    const [page, setPage] = useState(1);
    const [dateRange, setDateRange] = useState({
        startDate: formatDateTime(subtractDays(new Date(), 30), 'yyyy-MM-dd'),
        endDate: formatDateTime(new Date(), 'yyyy-MM-dd'),
    });

    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);

    const filters = {
        action: debouncedAction,
        entity: debouncedEntity,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        page,
        limit: 10,
    };

    const { data, isLoading, error } = useAuditLogs(filters);

    useEffect(() => {
        setPage(1);
    }, [debouncedAction, debouncedEntity, dateRange]);

    const handleViewDetails = (log: AuditLog) => {
        setSelectedLog(log);
        setSheetOpen(true);
    };

    if (error) {
        return (
            <div className="flex h-[450px] items-center justify-center p-8">
                <Empty>
                    <EmptyMedia>
                        <ShieldAlert className="size-6 text-destructive" />
                    </EmptyMedia>
                    <EmptyContent>
                        <EmptyTitle>Tải dữ liệu thất bại</EmptyTitle>
                        <EmptyDescription>{error.message}</EmptyDescription>
                    </EmptyContent>
                    <Button
                        variant="outline"
                        onClick={() => window.location.reload()}
                    >
                        Thử kết nối lại
                    </Button>
                </Empty>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title="Nhật ký Hệ thống"
                subtitle="Theo dõi và truy vết tất cả các hoạt động hệ thống và thay đổi dữ liệu."
            />

            <div className="space-y-4">
                {/* Search & Filter */}
                <AuditLogsToolbar
                    action={action}
                    onActionChange={setAction}
                    entity={entity}
                    onEntityChange={setEntity}
                    startDate={dateRange.startDate}
                    onStartDateChange={(val) => setDateRange(prev => ({ ...prev, startDate: val }))}
                    endDate={dateRange.endDate}
                    onEndDateChange={(val) => setDateRange(prev => ({ ...prev, endDate: val }))}
                />

                {/* Table container */}
                <div className="rounded-md bg-background border overflow-hidden">
                    <AuditLogsTable
                        data={data?.data || []}
                        onViewDetails={handleViewDetails}
                        page={page}
                        limit={10}
                        isLoading={isLoading}
                    />
                </div>

                <SmartPagination
                    page={page}
                    totalPages={data?.totalPages || 1}
                    totalItems={data?.total || 0}
                    onPageChange={setPage}
                    itemName="nhật ký"
                />
            </div>

            <AuditLogDetailsSheet
                log={selectedLog}
                open={sheetOpen}
                onOpenChange={setSheetOpen}
            />
        </div>
    );
}
