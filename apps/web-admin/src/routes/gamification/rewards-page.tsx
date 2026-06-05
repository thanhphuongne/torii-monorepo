import { useState, Suspense } from 'react';
import {
    Plus,
} from 'lucide-react';
import { Button } from '@workspace/ui/components/button';
import { PageHeader } from '@/components/common/page-header';
import { Can } from '@/lib/guard/can';
import { useAdminRewards } from '@/lib/api/services/gamification';
import { RewardsTable } from '@/components/gamification/rewards-table';
import { dataTableShellClass } from '@/lib/ui-shell';
import { CreateRewardSheet } from '@/components/gamification/create-reward-sheet';
import { EditRewardSheet } from '@/components/gamification/edit-reward-sheet';
import { DeleteRewardDialog } from '@/components/gamification/delete-reward-dialog';
import type { PointRewardDTO } from '@workspace/schemas';

export default function RewardsPage() {
    // Dialog State
    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [selectedReward, setSelectedReward] = useState<PointRewardDTO | null>(null);

    // Data Fetching
    const { data: rewards = [], isLoading } = useAdminRewards();

    // Handlers
    const handleCreate = () => {
        setCreateOpen(true);
    };

    const handleEdit = (reward: PointRewardDTO) => {
        setSelectedReward(reward);
        setEditOpen(true);
    };

    const handleDelete = (reward: PointRewardDTO) => {
        setSelectedReward(reward);
        setDeleteOpen(true);
    };

    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title="Quản lý Phần thưởng (Gamification)"
                subtitle="Thiết lập các phần thưởng mà học viên có thể dùng điểm XP/Points để đổi lấy mã giảm giá."
                actions={
                    <Can permission="ops.gamification.manage">
                        <Button
                            onClick={handleCreate}
                            size="lg"
                        >
                            Tạo Phần thưởng mới
                            <Plus />
                        </Button>
                    </Can>
                }
            />

            <div className={dataTableShellClass}>
                        <RewardsTable
                            data={rewards}
                            isLoading={isLoading}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                        />
            </div>

            {/* Dialogs */}
            <Suspense fallback={null}>
                {createOpen && (
                    <CreateRewardSheet
                        open={createOpen}
                        onOpenChange={setCreateOpen}
                    />
                )}

                {selectedReward && (
                    <>
                        <EditRewardSheet
                            open={editOpen}
                            onOpenChange={setEditOpen}
                            reward={selectedReward}
                        />
                        <DeleteRewardDialog
                            open={deleteOpen}
                            onOpenChange={setDeleteOpen}
                            reward={selectedReward}
                        />
                    </>
                )}
            </Suspense>
        </div>
    );
}
