import { useState, useEffect } from 'react';
import { UsersPrimaryToolbar } from '@/components/users/users-primary-toolbar.tsx';
import { UsersTable } from '@/components/users/users-table.tsx';
import { dataTableShellClass } from '@/lib/ui-shell';
import { CreateUserDialog } from '@/components/users/create-user-dialog.tsx';
import { ChangeUserRoleDialog } from '@/components/users/change-user-role-dialog.tsx';
import { ChangeUserStatusDialog } from '@/components/users/change-user-status-dialog.tsx';
import { ViewUserSheet } from '@/components/users/view-user-sheet.tsx';
import { type UserResponseDTO } from '@workspace/schemas';
import { Button } from '@workspace/ui/components/button';
import { useUsers } from "@/lib/api/services/users.ts";
import { useDebounceValue } from '@workspace/ui/hooks/use-debounce-value';
import { useBoolean } from "@workspace/ui/hooks/use-boolean";

import { SmartPagination } from '@/components/common/smart-pagination';
import { UserPlus, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { formatNumber } from "@/lib/format-utils";

export default function UsersManagementPage() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [debouncedSearch] = useDebounceValue(search, 500);
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [roleFilter, setRoleFilter] = useState<string | undefined>(undefined);

    // Dialog States
    const createDialog = useBoolean();
    const [editingUser, setEditingUser] = useState<UserResponseDTO | null>(null);
    const [statusChangingUser, setStatusChangingUser] = useState<UserResponseDTO | null>(null);
    const [viewingUser, setViewingUser] = useState<UserResponseDTO | null>(null);

    const limit = 10;

    // API Hooks
    const { data, isLoading, error } = useUsers({
        page,
        limit,
        search: debouncedSearch,
        role: roleFilter,
        sortBy,
        sortOrder,
    });

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, roleFilter]);

    if (error) {
        return (
            <div className="flex h-[450px] items-center justify-center p-8">
                <div className="max-w-md w-full">
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="size-12 rounded-full flex items-center justify-center bg-destructive/10 text-destructive">
                            <ShieldCheck className="size-6" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-lg font-semibold">Truy cập bị hạn chế</h3>
                            <p className="text-sm text-muted-foreground">{error.message}</p>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => window.location.reload()}
                        >
                            Thử kết nối lại
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    const users = (data?.data || []) as UserResponseDTO[];
    const total = data?.total || 0;
    const totalPages = data?.totalPages || 0;

    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title="Quản lý Người dùng"
                subtitle="Quản lý tất cả người dùng trong hệ thống bao gồm học viên, giảng viên và nhân viên."
                stats={[
                    { label: "Tổng số người dùng", value: formatNumber(total) }
                ]}
                actions={
                    <Button onClick={createDialog.setTrue} size="lg">
                        <UserPlus />
                        Thêm Người dùng
                    </Button>
                }
            />

            <div className="space-y-4">
                <UsersPrimaryToolbar
                    search={search}
                    onSearchChange={setSearch}
                    filters={{ role: roleFilter }}
                    onFilterChange={(f) => setRoleFilter(f.role)}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSortChange={(field, order) => {
                        setSortBy(field);
                        setSortOrder(order);
                    }}
                />

                <div className={dataTableShellClass}>
                    <UsersTable
                        data={users}
                        onEdit={setEditingUser}
                        onChangeStatus={setStatusChangingUser}
                        onView={setViewingUser}
                        page={page}
                        limit={limit}
                        isLoading={isLoading}
                    />
                </div>

                <SmartPagination
                    page={page}
                    totalPages={totalPages}
                    totalItems={total}
                    onPageChange={setPage}
                    itemName="người dùng"
                />
            </div>

            <CreateUserDialog
                open={createDialog.value}
                onOpenChange={createDialog.setValue}
            />

            <ChangeUserRoleDialog
                open={!!editingUser}
                onOpenChange={(open) => !open && setEditingUser(null)}
                user={editingUser}
            />

            <ChangeUserStatusDialog
                open={!!statusChangingUser}
                onOpenChange={(open) => !open && setStatusChangingUser(null)}
                user={statusChangingUser}
            />

            <ViewUserSheet
                open={!!viewingUser}
                onOpenChange={(open) => !open && setViewingUser(null)}
                user={viewingUser}
            />
        </div>
    );
}
