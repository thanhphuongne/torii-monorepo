import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetFooter,
} from '@workspace/ui/components/sheet';
import { Badge } from '@workspace/ui/components/badge';
import { Button } from '@workspace/ui/components/button';
import { ScrollArea } from '@workspace/ui/components/scroll-area';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@workspace/ui/components/table';
import type { UserResponseDTO } from '@workspace/schemas';
import { Avatar, AvatarFallback } from '@workspace/ui/components/avatar';
import { formatDateTime, formatCurrency, formatNumber } from '@/lib/format-utils';
import { AlertTriangle, Lock, Zap, Clock, BookOpen, Wallet, History, Info } from 'lucide-react';
import { cn } from '@workspace/ui/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs';
import { useAcademyEnrollments } from '@/lib/api/services/academy-enrollments';
import { useUserWalletTransactions } from '@/lib/api/services/wallets';
import { Skeleton } from '@workspace/ui/components/skeleton';

interface ViewUserSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: UserResponseDTO | null;
}

export function ViewUserSheet({
    open,
    onOpenChange,
    user,
}: ViewUserSheetProps) {
    if (!user) return null;

    let status = 'Đang hoạt động';
    let StatusIcon = Zap;

    if (user.deletedAt) {
        status = 'Đã xóa';
        StatusIcon = AlertTriangle;
    } else if (user.bannedUntil && new Date(user.bannedUntil) > new Date()) {
        status = 'Đang bị cấm';
        StatusIcon = Lock;
    } else if (!user.verifiedAt) {
        status = 'Chưa kích hoạt';
        StatusIcon = Clock;
    }

    const basicInfoRows: { label: string; value: React.ReactNode }[] = [
        { label: 'Họ tên', value: user.displayName || '—' },
        { label: 'Email', value: user.email || '—' },
        { label: 'Mã ID', value: <span className="font-mono text-xs">{user.id}</span> },
        { label: 'Vai trò', value: <Badge variant="secondary" className="capitalize">{user.role}</Badge> },
        { label: 'Trạng thái', value: <Badge variant="outline" className={cn(status.includes('cấm') || status.includes('xóa') ? "border-destructive text-destructive" : "")}><StatusIcon className="size-3 mr-1.5" />{status}</Badge> },
        { label: 'Thành viên từ', value: formatDateTime(user.createdAt, 'PPpp') },
        { label: 'Cập nhật lần cuối', value: formatDateTime(user.updatedAt, 'PPpp') },
        { label: 'Điểm tích lũy (Point)', value: <Badge variant="secondary" className="font-bold text-amber-600 bg-amber-50 border-amber-200">{formatNumber(user.points || 0)}</Badge> },
        ...(user.verifiedAt ? [{ label: 'Xác minh lúc', value: formatDateTime(user.verifiedAt, 'PPpp') }] : []),
        ...(user.lastSignInAt ? [{ label: 'Đăng nhập cuối', value: formatDateTime(user.lastSignInAt, 'PPpp') }] : []),
        ...(user.bannedUntil && new Date(user.bannedUntil) > new Date() ? [{ label: 'Hết hạn cấm', value: formatDateTime(user.bannedUntil, 'PPpp') }] : []),
    ];

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="!w-full sm:!max-w-[900px] flex flex-col p-0">
                <div className="p-6 pb-2">
                    <SheetHeader>
                        <SheetTitle>Chi tiết người dùng</SheetTitle>
                        <SheetDescription>
                            Thông tin chi tiết tài khoản và lịch sử hoạt động
                        </SheetDescription>
                    </SheetHeader>

                    <div className="flex items-center gap-4 mt-6">
                        <Avatar className="h-14 w-14 rounded-full border">
                            <AvatarFallback className="text-lg bg-primary/5 text-primary">
                                {user.displayName?.charAt(0).toUpperCase() || 'U'}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h3 className="font-semibold text-lg">{user.displayName}</h3>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                    </div>
                </div>

                <Tabs defaultValue="basic" className="mt-4 flex flex-1 flex-col min-w-0">
                    <div className="border-b px-6 pb-3">
                        <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            <TabsList className="inline-flex h-10 w-max min-w-full justify-start gap-1 p-1">
                            <TabsTrigger value="basic" className="whitespace-nowrap">
                                <Info className="size-4 mr-2" />
                                Thông tin cơ bản
                            </TabsTrigger>
                            <TabsTrigger value="learning" className="whitespace-nowrap">
                                <BookOpen className="size-4 mr-2" />
                                Thông tin học tập
                            </TabsTrigger>
                            <TabsTrigger value="wallet" className="whitespace-nowrap">
                                <Wallet className="size-4 mr-2" />
                                Ví & Giao dịch
                            </TabsTrigger>
                            </TabsList>
                        </div>
                    </div>

                    <ScrollArea className="flex-1">
                        <TabsContent value="basic" className="p-6 mt-0">
                            <div className="rounded-md border overflow-hidden bg-card">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead className="w-[200px]">Thuộc tính</TableHead>
                                            <TableHead>Giá trị</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {basicInfoRows.map((row, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="text-muted-foreground font-medium text-sm">
                                                    {row.label}
                                                </TableCell>
                                                <TableCell className="text-sm font-medium">{row.value}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>

                        <TabsContent value="learning" className="p-6 mt-0">
                            <UserLearningTab userId={user.id} />
                        </TabsContent>

                        <TabsContent value="wallet" className="p-6 mt-0">
                            <UserWalletTab userId={user.id} balance={user.walletBalance || 0} />
                        </TabsContent>
                    </ScrollArea>
                </Tabs>

                <div className="p-4 border-t bg-muted/20">
                    <SheetFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Đóng
                        </Button>
                    </SheetFooter>
                </div>
            </SheetContent>
        </Sheet>
    );
}

function UserLearningTab({ userId }: { userId: string }) {
    const { data: enrollments, isLoading } = useAcademyEnrollments({ userId, page: 1, limit: 100 });

    if (isLoading) return <LoadingSkeleton />;

    if (!enrollments || enrollments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg">
                <BookOpen className="size-8 text-muted-foreground/40 mb-3" />
                <h4 className="font-medium text-muted-foreground">Chưa có thông tin học tập</h4>
                <p className="text-sm text-muted-foreground/60 max-w-xs">Người dùng này chưa đăng ký khóa học hoặc gói tự học nào.</p>
            </div>
        );
    }

    return (
        <div className="rounded-md border overflow-hidden bg-card">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead>Khóa học / Gói tự học</TableHead>
                        <TableHead>Ngày đăng ký</TableHead>
                        <TableHead>Hết hạn</TableHead>
                        <TableHead className="text-right">Trạng thái</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {enrollments.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell>
                                <div className="font-semibold">
                                    {item.courseTitle || item.liveClass?.name || item.vodPackage?.name || '—'}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {item.courseCode || item.liveClass?.code || item.vodPackage?.code || 'Không có mã'}
                                </div>
                            </TableCell>
                            <TableCell className="text-sm">
                                {formatDateTime(item.enrolledAt, 'dd/MM/yyyy')}
                            </TableCell>
                            <TableCell className="text-sm">
                                {item.expiresAt ? formatDateTime(item.expiresAt, 'dd/MM/yyyy') : 'Vĩnh viễn'}
                            </TableCell>
                            <TableCell className="text-right">
                                <Badge variant="outline" className={cn("text-[10px] font-bold", item.status === 'ACTIVE' ? "border-emerald-500 text-emerald-600 bg-emerald-50" : "bg-secondary text-secondary-foreground")}>
                                    {item.status}
                                </Badge>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

function UserWalletTab({ userId, balance }: { userId: string; balance: number }) {
    const { data: transactionsData, isLoading } = useUserWalletTransactions(userId);

    if (isLoading) return <LoadingSkeleton />;

    const transactions = transactionsData?.data || [];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/10 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground font-medium mb-1">Số dư hiện tại</p>
                        <h4 className="text-2xl font-bold text-primary">{formatCurrency(balance)}</h4>
                    </div>
                    <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <Wallet className="size-6" />
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-2 font-semibold text-lg">
                    <History className="size-5 text-muted-foreground" />
                    Lịch sử giao dịch
                </div>

                <div className="rounded-md border overflow-hidden bg-card">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead>Loại</TableHead>
                                <TableHead>Số tiền</TableHead>
                                <TableHead>Nội dung</TableHead>
                                <TableHead className="text-right">Thời gian</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.length > 0 ? (
                                transactions.map((tx) => (
                                    <TableRow key={tx.id}>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "text-[10px] font-bold uppercase",
                                                    tx.type === 'DEPOSIT' && "border-emerald-500 text-emerald-600 bg-emerald-50",
                                                    tx.type === 'WITHDRAWAL' && "border-amber-500 text-amber-600 bg-amber-50",
                                                    tx.type === 'PAYMENT' && "border-blue-500 text-blue-600 bg-blue-50",
                                                    tx.type === 'REFUND' && "border-indigo-500 text-indigo-600 bg-indigo-50"
                                                )}
                                            >
                                                {tx.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className={cn(
                                            "font-semibold text-sm",
                                            (tx.type === 'DEPOSIT' || tx.type === 'REFUND') ? "text-emerald-600" : "text-destructive"
                                        )}>
                                            {(tx.type === 'DEPOSIT' || tx.type === 'REFUND') ? '+' : '-'}{formatCurrency(tx.amount)}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate" title={tx.description}>
                                            {tx.description || '—'}
                                        </TableCell>
                                        <TableCell className="text-right text-sm font-medium">
                                            {formatDateTime(tx.createdAt, 'dd/MM/yyyy HH:mm')}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic">
                                        Chưa có giao dịch nào
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}

function LoadingSkeleton() {
    return (
        <div className="space-y-4">
            <Skeleton className="h-[200px] w-full rounded-md" />
            <Skeleton className="h-[40px] w-full rounded-md" />
            <Skeleton className="h-[40px] w-full rounded-md" />
            <Skeleton className="h-[40px] w-full rounded-md" />
        </div>
    );
}
