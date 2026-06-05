import { useState, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDebounceValue } from '@workspace/ui/hooks/use-debounce-value';
import {
    Plus,
} from 'lucide-react';
import { Button } from '@workspace/ui/components/button';
import { CouponsPrimaryToolbar } from '@/components/coupons/coupons-primary-toolbar';
import { Can } from '@/lib/guard/can';


import { useCoupons } from '@/lib/api/services/coupons';
import { CouponsTable } from '@/components/coupons/coupons-table';
import type { CouponResponseDTO } from '@workspace/schemas';
import { CouponStatus } from '@workspace/schemas';

import { CreateCouponSheet } from '@/components/coupons/create-coupon-sheet';
import { EditCouponSheet } from '@/components/coupons/edit-coupon-sheet';
import { SmartPagination } from '@/components/common/smart-pagination';
import { DeleteCouponDialog } from '@/components/coupons/delete-coupon-dialog';

import { PageHeader } from '@/components/common/page-header';

export default function CouponsPage() {
    const [searchParams, setSearchParams] = useSearchParams();

    // State
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [debouncedSearch] = useDebounceValue(search, 500);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || undefined;

    // Dialog State
    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [selectedCoupon, setSelectedCoupon] = useState<CouponResponseDTO | null>(null);

    // Data Fetching
    const { data, isLoading } = useCoupons({
        page,
        limit,
        search: debouncedSearch,
        status: status as CouponStatus
    });

    const coupons = data?.data || [];
    const totalPages = data?.totalPages || 0;

    // Handlers
    const handleSearch = (value: string) => {
        setSearch(value);
        setSearchParams(prev => {
            prev.set('search', value);
            prev.set('page', '1'); // Reset to page 1
            if (!value) prev.delete('search');
            return prev;
        });
    };

    const handleStatusFilter = (value: string) => {
        setSearchParams(prev => {
            if (value && value !== 'all') {
                prev.set('status', value);
            } else {
                prev.delete('status');
            }
            prev.set('page', '1');
            return prev;
        });
    };

    const handlePageChange = (newPage: number) => {
        setSearchParams(prev => {
            prev.set('page', newPage.toString());
            return prev;
        });
    };

    const handleCreate = () => {
        setCreateOpen(true);
    };

    const handleEdit = (coupon: CouponResponseDTO) => {
        setSelectedCoupon(coupon);
        setEditOpen(true);
    };

    const handleDelete = (coupon: CouponResponseDTO) => {
        setSelectedCoupon(coupon);
        setDeleteOpen(true);
    };

    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title="Mã Giảm Giá"
                subtitle="Chỉ các mã do hệ thống / chiến dịch tạo. Mã từ đổi điểm thưởng (point reward) nằm trên tài khoản học viên ở web-learner, không hiển thị tại đây."
                actions={
                    <Can permission="ops.coupon.manage">
                        <Button
                            onClick={handleCreate}
                            size="lg"
                        >
                            Tạo Coupon Mới
                            <Plus />
                        </Button>
                    </Can>
                }
            />


            {/* Filters & Search */}
            <div className="space-y-4">
                <CouponsPrimaryToolbar
                    search={search}
                    onSearchChange={handleSearch}
                    status={status}
                    onStatusChange={handleStatusFilter}
                />

                {/* Table */}
                <div className="rounded-md bg-background border overflow-hidden">

                    <CouponsTable
                        data={coupons}
                        isLoading={isLoading}
                        page={page}
                        limit={limit}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                    />

                </div>
            {/* Pagination */}
            <SmartPagination
                    page={page}
                    totalPages={totalPages}
                    totalItems={data?.total || 0}
                    onPageChange={handlePageChange}
                    itemName="mã giảm giá"
                />
            </div>



            {/* Dialogs */}
            <Suspense fallback={null}>
                {createOpen && (
                    <CreateCouponSheet
                        open={createOpen}
                        onOpenChange={setCreateOpen}
                    />
                )}

                {selectedCoupon && (
                    <>
                        <EditCouponSheet
                            open={editOpen}
                            onOpenChange={setEditOpen}
                            coupon={selectedCoupon}
                        />
                        <DeleteCouponDialog
                            open={deleteOpen}
                            onOpenChange={setDeleteOpen}
                            coupon={selectedCoupon}
                        />
                    </>
                )}
            </Suspense>
        </div>
    );
}
