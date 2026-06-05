import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from '@workspace/ui/components/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@workspace/ui/components/table';
import { Badge } from '@workspace/ui/components/badge';
import { Monitor, Smartphone, AlertCircle, LogOut } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';
import { Skeleton } from '@workspace/ui/components/skeleton';
import { useSessions, useRevokeSession, useRevokeOtherSessions } from '@/lib/api/services/sessions';
import { formatRelativeTime } from '@/lib/format-utils';
import { toast } from '@workspace/ui/components/sonner';
import { Spinner } from "@workspace/ui/components/spinner";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";

export function SessionsTab() {
    const { data: sessions, isLoading } = useSessions();
    const revokeMutation = useRevokeSession();
    const revokeOtherMutation = useRevokeOtherSessions();

    const handleRevoke = async (id: string) => {
        try {
            await revokeMutation.mutateAsync(id);
            toast.success('Đã đăng xuất phiên này');
        } catch {
            toast.error('Không thể đăng xuất phiên này');
        }
    };

    const handleRevokeOther = async () => {
        try {
            await revokeOtherMutation.mutateAsync();
            toast.success('Đã đăng xuất khỏi tất cả các thiết bị khác');
        } catch {
            toast.error('Không thể thực hiện yêu cầu');
        }
    };

    const getDeviceIcon = (userAgent: string = '', deviceInfo: string = '') => {
        const ua = (userAgent + deviceInfo).toLowerCase();
        if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
            return <Smartphone className="size-4" />;
        }
        return <Monitor className="size-4" />;
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader className="pt-3">
                    <CardTitle>Phiên Đăng Nhập</CardTitle>
                    <CardDescription>Quản lý các phiên đăng nhập trên các thiết bị của bạn</CardDescription>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                    <Alert className="bg-primary/5 border-primary/10 flex-1">
                        <AlertCircle className="size-4 text-primary" />
                        <AlertTitle>Bảo vệ tài khoản</AlertTitle>
                        <AlertDescription>
                            Dưới đây là danh sách các thiết bị hiện đang đăng nhập vào tài khoản của bạn.
                            Nếu bạn thấy bất kỳ thiết bị lạ nào, hãy đăng xuất ngay lập tức và đổi mật khẩu.
                        </AlertDescription>
                    </Alert>

                    <div className="flex justify-end">
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive border-destructive/20 hover:bg-destructive/5 hover:text-destructive shrink-0"
                            onClick={handleRevokeOther}
                            disabled={revokeOtherMutation.isPending || (sessions?.length || 0) <= 1}
                        >
                            {revokeOtherMutation.isPending ? (
                                <><Spinner className="mr-2" /> Đang xử lý...</>
                            ) : (
                                <><LogOut className="mr-2 size-4" /> Đăng xuất tất cả thiết bị khác</>
                            )}
                        </Button>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Thiết bị & Trình duyệt</TableHead>
                                    <TableHead>Địa chỉ IP</TableHead>
                                    <TableHead>Thời điểm đăng nhập</TableHead>
                                    <TableHead className="text-right">Thao tác</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    sessions?.map((session) => (
                                        <TableRow key={session.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-muted rounded-md text-muted-foreground">
                                                        {getDeviceIcon(session.userAgent, session.deviceInfo)}
                                                    </div>
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium text-sm">
                                                                {session.deviceInfo || 'Thiết bị không xác định'}
                                                            </span>
                                                            {session.isCurrent && (
                                                                <Badge variant="secondary" className="text-[10px] h-4 uppercase font-bold bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10">
                                                                    Hiện tại
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <span className="text-xs text-muted-foreground font-mono">
                                                            {session.userAgent || 'Chi tiết trình duyệt không khả dụng'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm font-mono text-muted-foreground">
                                                {session.ipAddress}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {formatRelativeTime(session.createdAt)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {!session.isCurrent && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 text-destructive border-destructive/40 hover:text-destructive hover:bg-destructive/5"
                                                        onClick={() => handleRevoke(session.id)}
                                                        disabled={revokeMutation.isPending}
                                                    >
                                                        {revokeMutation.isPending ? <Spinner className="size-3" /> : 'Đăng xuất'}
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                                {!isLoading && sessions?.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                            Không tìm thấy phiên đăng nhập nào.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>


                </CardContent>
            </Card>
        </div>
    );
}
