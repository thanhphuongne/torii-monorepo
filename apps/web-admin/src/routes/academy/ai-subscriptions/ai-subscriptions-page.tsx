import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs';
import { Users, Activity, UserCircle, Search, Edit2, Save, X } from 'lucide-react';
import { cn } from '@workspace/ui/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@workspace/ui/components/table';
import { Badge } from '@workspace/ui/components/badge';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select';
import { Skeleton } from '@workspace/ui/components/skeleton';
import { useAiSubscriptionPlans, useUpdateAiSubscriptionPlan, useAiUserSubscriptions } from '@/lib/api/services/ai-subscriptions';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { SmartPagination } from '@/components/common/smart-pagination';
import {
  listPageSearchIconClass,
  listPageSearchInputClass,
  listPageSearchWrapClass,
  listPageToolbarRootClass,
} from '@/lib/ui-shell';
import { ScrollArea, ScrollBar } from '@workspace/ui/components/scroll-area';

export default function AiSubscriptionsPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'plans';

    const handleTabChange = (val: string) => {
        setSearchParams({ tab: val });
    };

    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title="Quản lý Premium AI"
                subtitle="Quản lý các gói dịch vụ và lịch sử đăng ký AI Sensei của người dùng."
            />

            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <ScrollArea className="w-full whitespace-nowrap">
                    <TabsList className="mb-4 inline-flex w-max">
                        <TabsTrigger value="plans" className="gap-2">
                            <Activity className="size-4" />
                            Gói Subscription
                        </TabsTrigger>
                        <TabsTrigger value="users" className="gap-2">
                            <Users className="size-4" />
                            Người dùng đăng ký
                        </TabsTrigger>
                    </TabsList>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>

                <TabsContent value="plans">
                    <PlansTabContent />
                </TabsContent>

                <TabsContent value="users">
                    <UserSubscriptionsTabContent />
                </TabsContent>
            </Tabs>
        </div>
    );
}

function isFreePlan(plan: any) {
    const code = String(plan?.code || '').toUpperCase();
    const price = Number(plan?.price ?? NaN);
    return code === 'FREE' || price === 0;
}

function PlansTabContent() {
    const { data: plans, isLoading } = useAiSubscriptionPlans();
    const updateMutation = useUpdateAiSubscriptionPlan();

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<any>(null);

    const handleEdit = (plan: any) => {
        setEditingId(plan.id);
        setEditData({ ...plan });
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditData(null);
    };

    const handleSave = async () => {
        try {
            const free = isFreePlan(editData);
            await updateMutation.mutateAsync({
                id: editingId!,
                data: {
                    name: editData.name,
                    price: free ? 0 : Number(editData.price),
                    isActive: editData.isActive,
                    description: editData.description
                }
            });
            toast.success('Cập nhật gói thành công');
            setEditingId(null);
            setEditData(null);
        } catch (error) {
            toast.error('Cập nhật thất bại');
        }
    };

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Danh sách gói dịch vụ
                </h2>
                <p className="text-sm text-muted-foreground">
                    Cấu hình và quản lý các gói Subscription AI Sensei.
                </p>
            </div>

            <div className="rounded-md border bg-background overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="w-16 text-center">#</TableHead>
                            <TableHead className="min-w-[200px]">Gói dịch vụ</TableHead>
                            <TableHead className="w-[150px] text-center">Giá (VNĐ)</TableHead>
                            <TableHead className="w-[150px] text-center">Trạng thái</TableHead>
                            <TableHead className="w-[150px] text-center">Thao tác</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Skeleton className="h-10 w-10 rounded-lg" />
                                            <div className="space-y-2">
                                                <Skeleton className="h-4 w-32" />
                                                <Skeleton className="h-3 w-20" />
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell><Skeleton className="h-4 w-20 mx-auto" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24 mx-auto" /></TableCell>
                                    <TableCell><Skeleton className="h-8 w-20 mx-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : plans?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                    Không tìm thấy gói nào.
                                </TableCell>
                            </TableRow>
                        ) : (
                            plans?.map((plan, index) => (
                                <TableRow key={plan.id} className="group hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-center font-medium text-muted-foreground">
                                        {index + 1}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                                                <Activity className="size-5" />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                {editingId === plan.id ? (
                                                    <Input
                                                        value={editData.name}
                                                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                                        className="h-8 py-0 px-2"
                                                    />
                                                ) : (
                                                    <span className="font-semibold text-foreground text-sm truncate">
                                                        {plan.name}
                                                    </span>
                                                )}
                                                <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
                                                    Mã: {plan.code}
                                                </span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {editingId === plan.id ? (
                                            <Input
                                                type="number"
                                                value={editData.price}
                                                onChange={(e) => setEditData({ ...editData, price: e.target.value })}
                                                className="h-8 py-0 px-2 text-center"
                                                disabled={isFreePlan(plan)}
                                            />
                                        ) : (
                                            isFreePlan(plan) ? (
                                                <span className="text-muted-foreground text-xs">—</span>
                                            ) : (
                                                <span className="font-medium tabular-nums">
                                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(plan.price)}
                                                </span>
                                            )
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge
                                            variant={plan.isActive ? "default" : "secondary"}
                                            className={cn(
                                                "uppercase text-[10px] tracking-wider font-bold",
                                                plan.isActive ? "bg-green-500 hover:bg-green-600 border-none" : ""
                                            )}
                                        >
                                            {plan.isActive ? 'Hoạt động' : 'Đang ẩn'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-center gap-2">
                                            {editingId === plan.id ? (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 w-8 p-0"
                                                        onClick={handleCancel}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        className="h-8"
                                                        onClick={handleSave}
                                                        disabled={updateMutation.isPending}
                                                    >
                                                        <Save className="h-4 w-4 mr-2" />
                                                        Lưu
                                                    </Button>
                                                </>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 gap-1.5 transition-all duration-200"
                                                    onClick={() => handleEdit(plan)}
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                    Chỉnh sửa
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

function UserSubscriptionsTabContent() {
    const [searchParams, setSearchParams] = useSearchParams();
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const planCode = searchParams.get('planCode') || '';
    const { data: plans } = useAiSubscriptionPlans();

    const { data, isLoading } = useAiUserSubscriptions({ page, limit, search, planCode: planCode || undefined });

    const handleSearch = (val: string) => {
        setSearchParams(prev => {
            if (val) prev.set('search', val);
            else prev.delete('search');
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

    const handlePlanFilter = (value: string) => {
        setSearchParams(prev => {
            if (value === 'all') prev.delete('planCode');
            else prev.set('planCode', value);
            prev.set('page', '1');
            return prev;
        });
    };

    return (
        <div className="space-y-6">
            <div className={listPageToolbarRootClass}>
                <div className="min-w-0 space-y-1 md:shrink-0">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <UserCircle className="h-5 w-5 text-primary" />
                        Lịch sử đăng ký
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Theo dõi và quản lý các lượt đăng ký AI Sensei từ người dùng.
                    </p>
                </div>
                <div className={listPageSearchWrapClass}>
                    <Search className={listPageSearchIconClass} />
                    <Input
                        placeholder="Tìm kiếm user hoặc gói dịch vụ..."
                        className={cn(
                          listPageSearchInputClass,
                          'border-muted-foreground/20 focus:border-primary transition-colors',
                        )}
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>
                <Select value={planCode || 'all'} onValueChange={handlePlanFilter}>
                    <SelectTrigger className="w-full md:w-[220px]">
                        <SelectValue placeholder="Lọc theo gói" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả gói</SelectItem>
                        {(plans || []).map((plan: any) => (
                            <SelectItem key={plan.id} value={plan.code}>
                                {plan.name} ({plan.code})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="rounded-md border bg-background overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="w-16 text-center">#</TableHead>
                            <TableHead className="min-w-[240px]">Người dùng</TableHead>
                            <TableHead className="text-center">Gói dịch vụ</TableHead>
                            <TableHead className="text-center">Thời gian sử dụng</TableHead>
                            <TableHead className="w-[180px] text-center">Trạng thái</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Skeleton className="h-10 w-10 rounded-full" />
                                            <div className="space-y-2">
                                                <Skeleton className="h-4 w-32" />
                                                <Skeleton className="h-3 w-40" />
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell><Skeleton className="h-5 w-20 mx-auto" /></TableCell>
                                    <TableCell>
                                        <div className="flex flex-col items-center gap-1">
                                            <Skeleton className="h-3 w-32" />
                                            <Skeleton className="h-3 w-32" />
                                        </div>
                                    </TableCell>
                                    <TableCell><Skeleton className="h-5 w-24 mx-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : data?.items?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-64 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                        <UserCircle className="size-12 opacity-20" />
                                        <p className="text-sm italic">Không tìm thấy dữ liệu đăng ký nào.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : data?.items?.map((sub: any, index: number) => (
                            <TableRow key={sub.id} className="hover:bg-muted/30 transition-colors">
                                <TableCell className="text-center font-medium text-muted-foreground">
                                    {(page - 1) * limit + index + 1}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 overflow-hidden">
                                            {sub.user?.avatarUrl ? (
                                                <img src={sub.user.avatarUrl} alt={sub.user.displayName} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-xs font-bold uppercase">{sub.user?.displayName?.slice(0, 2) || '??'}</span>
                                            )}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-semibold text-foreground text-sm truncate">
                                                {sub.user?.displayName || 'Người dùng hệ thống'}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground/80 truncate">
                                                {sub.user?.email || sub.userId}
                                            </span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Badge variant="outline" className="font-mono text-[10px] uppercase border-primary/20 text-primary bg-primary/5 tracking-wider">
                                        {sub.planCode}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col items-center gap-0.5 whitespace-nowrap">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span className="w-14">Bắt đầu:</span>
                                            <span className="font-medium text-foreground tabular-nums">
                                                {format(new Date(sub.startedAt), 'dd/MM/yyyy', { locale: vi })}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span className="w-14">Hết hạn:</span>
                                            <span className="font-medium text-foreground tabular-nums">
                                                {format(new Date(sub.expiresAt), 'dd/MM/yyyy', { locale: vi })}
                                            </span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Badge
                                        variant={sub.status === 'ACTIVE' ? "default" : sub.status === 'EXPIRED' ? "secondary" : "destructive"}
                                        className={cn(
                                            "uppercase text-[10px] tracking-wider font-bold",
                                            sub.status === 'ACTIVE' && "bg-green-500 hover:bg-green-600 border-none",
                                            sub.status === 'EXPIRED' && "bg-muted text-muted-foreground"
                                        )}
                                    >
                                        {sub.status === 'ACTIVE' ? 'Đang hoạt động' : sub.status === 'EXPIRED' ? 'Hết hạn' : sub.status}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {data && (
                <div className="mt-6">
                    <SmartPagination
                        page={page}
                        totalPages={data.totalPages}
                        totalItems={data.total}
                        onPageChange={handlePageChange}
                        itemName="đăng ký"
                    />
                </div>
            )}
        </div>
    );
}
