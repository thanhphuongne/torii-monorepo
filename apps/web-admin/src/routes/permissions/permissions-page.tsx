import { useState, useEffect, useMemo } from 'react';
import { Button } from '@workspace/ui/components/button';
import { Checkbox } from '@workspace/ui/components/checkbox';
import { RotateCcw, Zap } from 'lucide-react';
import {
    useFetchPermissions,
    useRoles,
    useUpdateRolePermissions
} from "@/lib/api/services/permissions.ts";
import { Skeleton } from '@workspace/ui/components/skeleton';
import { cn } from '@workspace/ui/lib/utils';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@workspace/ui/components/table";
import { useQueries } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/api-client.ts';
import { Card } from '@workspace/ui/components/card';
import { Badge } from '@workspace/ui/components/badge';

import { PageHeader } from '@/components/common/page-header';
import { Spinner } from "@workspace/ui/components/spinner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import { RoleAdminSection } from "@/routes/permissions/role-admin-section";
import { ROLE_NAME_LABELS_VI } from "@/routes/permissions/permission-labels";

const CATEGORY_LABELS_VI: Record<string, string> = {
    "LMS Catalog": "Nội dung học tập",
    "LMS Delivery": "Triển khai lớp học",
    "LMS Commerce": "Thương mại học tập",
    "LMS Assessment": "Đánh giá học tập",
    "LMS Approval": "Trung tâm phê duyệt",
    "Operations Commerce": "Vận hành thương mại",
    "Operations Support": "Hỗ trợ vận hành",
    "Operations Content": "Nội dung vận hành",
    "Operations Gamification": "Gamification",
    "Operations System": "Hệ thống",
    "Operations Identity": "Quản lý người dùng",
};

const PERMISSION_DESCRIPTION_VI: Record<string, string> = {
    "lms.catalog.read": "Xem thông tin nội dung học tập",
    "lms.catalog.create": "Tạo mới nội dung học tập",
    "lms.catalog.update": "Cập nhật nội dung học tập",
    "lms.catalog.delete": "Xóa nội dung học tập",
    "lms.catalog.publish": "Xuất bản nội dung học tập",
    "lms.catalog.submit": "Gửi duyệt nội dung học tập (chờ admin phê duyệt)",
    "lms.catalog.approve": "Duyệt hoặc từ chối xuất bản nội dung",
    "lms.delivery.read": "Xem lớp học, lịch học và phiên học",
    "lms.delivery.create": "Tạo lớp học/lịch học/phiên học",
    "lms.delivery.update": "Cập nhật lớp học/lịch học/phiên học",
    "lms.delivery.delete": "Xóa lớp học/lịch học/phiên học",
    "lms.delivery.manage": "Vận hành lớp live",
    "lms.delivery.attendance.manage": "Quản lý điểm danh",
    "lms.delivery.approve": "Duyệt yêu cầu vận hành lớp",
    "lms.delivery.request.create": "Tạo yêu cầu dời lịch (giảng viên gửi yêu cầu)",
    "lms.delivery.request.read": "Xem danh sách/chi tiết yêu cầu dời lịch",
    "lms.delivery.request.cancel": "Hủy yêu cầu dời lịch (khi đang chờ duyệt)",
    "lms.assessment.read": "Xem đề thi, câu hỏi, bài nộp",
    "lms.assessment.create": "Tạo đề thi/câu hỏi",
    "lms.assessment.update": "Cập nhật đề thi/câu hỏi",
    "lms.assessment.delete": "Xóa đề thi/câu hỏi",
    "lms.assessment.publish": "Xuất bản đề thi",
    "lms.assessment.grade": "Chấm bài nộp",
    "lms.approval.read": "Xem trung tâm phê duyệt",
    "lms.approval.manage": "Xử lý duyệt/từ chối",
    "lms.commerce.read": "Xem sản phẩm catalog và giá bán",
    "lms.commerce.create": "Tạo sản phẩm catalog",
    "lms.commerce.update": "Cập nhật sản phẩm catalog",
    "lms.commerce.delete": "Xóa sản phẩm catalog",
    "lms.commerce.publish": "Xuất bản sản phẩm catalog",
    "lms.commerce.submit": "Gửi duyệt sản phẩm (chờ admin phê duyệt)",
    "lms.commerce.approve": "Duyệt sản phẩm catalog",
    "ops.order.manage": "Quản lý đơn hàng và doanh thu",
    "ops.coupon.manage": "Quản lý mã giảm giá",
    "ops.subscription.manage": "Quản lý gói AI",
    "ops.support.view": "Xem yêu cầu hỗ trợ",
    "ops.support.handle": "Xử lý yêu cầu hỗ trợ",
    "ops.blog.manage": "Quản trị blog",
    "ops.gamification.manage": "Quản lý rewards và thành tích",
    "ops.audit.view": "Xem nhật ký hệ thống",
    "ops.report.view": "Xem báo cáo",
    "ops.user.view": "Xem thông tin người dùng",
    "ops.user.manage": "Quản lý người dùng và vai trò",
};

export function PermissionsPage() {
    // Data fetching
    const { data: roles, isLoading: rolesLoading } = useRoles();
    const { data: permissions, isLoading: permsLoading } = useFetchPermissions();

    // Fetch permissions for all roles
    const rolePermissionsQueries = useQueries({
        queries: (roles || []).map(role => ({
            queryKey: ['authorization', 'role-permissions', role.code],
            queryFn: async () => {
                const res = await apiClient.get(`/api/authorization/roles/${role.code}/permissions`);
                return {
                    roleCode: role.code,
                    permissions: res.data.data.permissions as string[]
                };
            },
            enabled: !!roles,
        }))
    });

    const isAnyRolePermsLoading = rolePermissionsQueries.some(q => q.isLoading);
    const updateMutation = useUpdateRolePermissions();

    // Helper to identify group boundaries
    const groupBoundaries = useMemo(() => {
        if (!permissions) return new Set<string>();
        const lastInGroups = new Set<string>();
        Object.values(permissions.byCategory).forEach(perms => {
            if (perms.length > 0) {
                lastInGroups.add(perms[perms.length - 1].code);
            }
        });
        return lastInGroups;
    }, [permissions]);

    // Local state for the matrix
    const [matrix, setMatrix] = useState<Record<string, Set<string>>>({});
    const [initialMatrix, setInitialMatrix] = useState<Record<string, Set<string>>>({});

    // Initialize matrix when data is loaded
    useEffect(() => {
        if (!isAnyRolePermsLoading && roles && rolePermissionsQueries.every(q => q.isSuccess)) {
            const newMatrix: Record<string, Set<string>> = {};
            rolePermissionsQueries.forEach(q => {
                if (q.data) {
                    newMatrix[q.data.roleCode] = new Set(q.data.permissions);
                }
            });
            setMatrix(newMatrix);
            setInitialMatrix(JSON.parse(JSON.stringify(newMatrix, (_, value) =>
                value instanceof Set ? Array.from(value) : value
            )));
        }
    }, [isAnyRolePermsLoading, roles, rolePermissionsQueries.map(q => q.isSuccess).join(',')]);

    const handleToggle = (roleCode: string, permCode: string) => {
        setMatrix(prev => {
            const newRoleSet = new Set(prev[roleCode] || []);
            if (newRoleSet.has(permCode)) {
                newRoleSet.delete(permCode);
            } else {
                newRoleSet.add(permCode);
            }
            return {
                ...prev,
                [roleCode]: newRoleSet
            };
        });
    };

    const hasChanges = () => {
        return Object.keys(matrix).some(roleCode => {
            const current = matrix[roleCode];
            const initialArr = (initialMatrix[roleCode] as any) || [];
            const initial = new Set(initialArr);

            if (current.size !== initial.size) return true;
            for (const p of current) {
                if (!initial.has(p)) return true;
            }
            return false;
        });
    };

    const handleSave = async () => {
        // Find which roles have changes
        const changedRoles = Object.keys(matrix).filter(roleCode => {
            const current = matrix[roleCode];
            const initialArr = (initialMatrix[roleCode] as any) || [];
            const initial = new Set(initialArr);
            if (current.size !== initial.size) return true;
            for (const p of current) {
                if (!initial.has(p)) return true;
            }
            return false;
        });

        for (const roleCode of changedRoles) {
            await updateMutation.mutateAsync({
                roleCode,
                permissions: Array.from(matrix[roleCode]),
            });
        }

        // After all updates, the query client will invalidate and we re-sync
        // In the mutation onSuccess, we already invalidate.
    };

    const handleReset = () => {
        const resetMatrix: Record<string, Set<string>> = {};
        Object.keys(initialMatrix).forEach(roleCode => {
            resetMatrix[roleCode] = new Set(initialMatrix[roleCode] as any);
        });
        setMatrix(resetMatrix);
    };

    if (rolesLoading || permsLoading || (roles && isAnyRolePermsLoading)) {
        // Approximate shape: 4 roles × 12 permissions in 3 categories
        const SKEL_ROLES = 4;
        const SKEL_PERMS = 12;
        const SKEL_CATS = 3;
        const permsPerCat = Math.floor(SKEL_PERMS / SKEL_CATS);

        return (
            <div className="flex flex-col gap-8">
                <PageHeader
                    title="Quản lý Quyền truy cập"
                    subtitle="Kiểm soát quyền truy cập chi tiết hệ thống"
                    stats={[{ label: "Tổng số vai trò", value: "—" }]}
                />

                <div className="rounded-md bg-background border overflow-hidden">

                    <Table>
                        <TableHeader>
                            {/* Row 1: Category group headers */}
                            <TableRow>
                                <TableHead className="sticky left-0 z-40 bg-muted border-r w-[200px]">
                                    Vai trò / Quyền hạn
                                </TableHead>
                                {Array.from({ length: SKEL_CATS }).map((_, i) => (
                                    <TableHead
                                        key={i}
                                        colSpan={permsPerCat}
                                        className="text-center bg-muted/30 border-r"
                                    >
                                        <Skeleton className="h-3 w-20 mx-auto" />
                                    </TableHead>
                                ))}
                            </TableRow>
                            {/* Row 2: Individual permission name headers */}
                            <TableRow>
                                <TableHead className="sticky left-0 z-40 bg-muted border-r" />
                                {Array.from({ length: SKEL_PERMS }).map((_, i) => (
                                    <TableHead
                                        key={i}
                                        className="min-w-[120px] text-center border-r align-top py-4"
                                    >
                                        <div className="flex flex-col gap-1.5 items-center">
                                            <Skeleton className="h-3 w-16" />
                                            <Skeleton className="h-2.5 w-10" />
                                        </div>
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Array.from({ length: SKEL_ROLES }).map((_, i) => (
                                <TableRow key={i}>
                                    {/* Role name cell */}
                                    <TableCell className="sticky left-0 z-30 bg-background border-r">
                                        <div className="flex flex-col gap-1.5">
                                            <Skeleton className="h-4 w-24" />
                                            <Skeleton className="h-2.5 w-16" />
                                        </div>
                                    </TableCell>
                                    {/* Checkbox cells */}
                                    {Array.from({ length: SKEL_PERMS }).map((_, j) => (
                                        <TableCell key={j} className="p-0 border-r">
                                            <div className="flex items-center justify-center p-4">
                                                <Skeleton className="h-4 w-4 rounded-sm" />
                                            </div>
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title="Quản lý Quyền truy cập"
                subtitle="Chỉ tài khoản có quyền quản trị người dùng (ops.user.manage) — thường là admin — mới vào được trang này."
                stats={[
                    { label: "Tổng số vai trò", value: roles?.length || 0 }
                ]}
            />

            <RoleAdminSection roles={roles} />

            <div className="space-y-2">
                <h2 className="text-lg font-semibold tracking-tight">Ma trận quyền theo vai trò</h2>
                <p className="text-sm text-muted-foreground">
                    Tick ô để gán hoặc gỡ từng permission cho từng vai trò; bấm nút Lưu thay đổi (thanh nổi dưới cùng) khi chỉnh sửa xong.
                </p>
            </div>

            <div className="rounded-md bg-background border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="sticky left-0 z-40 bg-muted border-r w-[200px]">
                                Vai trò / Quyền hạn
                            </TableHead>
                            {permissions && Object.entries(permissions.byCategory).map(([category, perms]) => (
                                <TableHead
                                    key={category}
                                    colSpan={perms.length}
                                    className="text-center bg-muted/30 border-r"
                                >
                                    <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
                                        {CATEGORY_LABELS_VI[category] || category}
                                    </span>
                                </TableHead>
                            ))}
                        </TableRow>
                        <TableRow>
                            <TableHead className="sticky left-0 z-40 bg-muted border-r" />
                            {permissions && permissions.all.map((perm) => (
                                <TableHead
                                    key={perm.code}
                                    className={cn(
                                        "min-w-[150px] text-center border-r align-top py-4",
                                        groupBoundaries.has(perm.code) && "border-r-muted-foreground/30"
                                    )}
                                >
                                    <div className="flex flex-col gap-1">
                                        <span className="text-xs font-medium leading-tight text-foreground">
                                            {PERMISSION_DESCRIPTION_VI[perm.code] || perm.description}
                                        </span>
                                        <span className="text-[10px] font-mono text-muted-foreground">
                                            {perm.code}
                                        </span>
                                    </div>
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {roles?.map((role) => {
                            const isLearner = role.code === 'learner';
                            return (
                                <TableRow
                                    key={role.code}
                                    className={cn(isLearner && "bg-muted/30")}
                                >
                                    <TableCell className={cn(
                                        "sticky left-0 z-30 bg-background border-r font-medium",
                                        isLearner && "bg-muted"
                                    )}>
                                        <div className="flex flex-col">
                                            <span>{ROLE_NAME_LABELS_VI[role.code] || role.name}</span>
                                            <span className="text-[10px] text-muted-foreground uppercase">{role.code}</span>
                                        </div>
                                    </TableCell>
                                    {permissions?.all.map((perm) => (
                                        <TableCell
                                            key={perm.code}
                                            className={cn(
                                                "p-0 border-r",
                                                groupBoundaries.has(perm.code) && "border-r-muted-foreground/30"
                                            )}
                                        >
                                            <div className="flex items-center justify-center p-4">
                                                <Checkbox
                                                    checked={matrix[role.code]?.has(perm.code)}
                                                    onCheckedChange={() => !isLearner && handleToggle(role.code, perm.code)}
                                                    disabled={isLearner}
                                                />
                                            </div>
                                        </TableCell>
                                    ))}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>

            </div>

            {/* Sticky Action Footer */}
            {
                hasChanges() && (
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <Card className="flex flex-row items-center justify-between p-2 shadow-2xl ring-1 ring-border border-none">
                            <div className="flex items-center gap-3 px-2">
                                <Badge variant="secondary" className="animate-pulse">
                                    Có thay đổi
                                </Badge>
                                <span className="text-xs font-medium text-muted-foreground">Chưa lưu thay đổi</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleReset}
                                    disabled={updateMutation.isPending}
                                >
                                    <RotateCcw className="size-3.5 mr-2" />
                                    Hoàn tác
                                </Button>

                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            disabled={updateMutation.isPending}
                                            size="sm"
                                        >
                                            {updateMutation.isPending ? (
                                                <Spinner className="size-3.5" />
                                            ) : (
                                                <>
                                                    <Zap className="size-3.5 mr-2 fill-current" />
                                                    Lưu thay đổi
                                                </>
                                            )}
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Xác nhận cập nhật quyền hạn?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Hành động này sẽ thay đổi quyền truy cập của các vai trò trong hệ thống. Một số người dùng có thể cần đăng nhập lại để áp dụng thay đổi.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Hủy bỏ</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleSave}>
                                                Xác nhận lưu
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </Card>
                    </div>
                )
            }
        </div >
    );
}
