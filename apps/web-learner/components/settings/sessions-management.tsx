'use client'
 
import { useState } from 'react';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@workspace/ui/components/table';
import { Badge } from '@workspace/ui/components/badge';
import { 
    Monitor, 
    Smartphone, 
    LogOut,
    ShieldCheck
} from 'lucide-react';
import { Button } from '@workspace/ui/components/button';
import { 
    Card, 
    CardContent, 
    CardHeader, 
    CardTitle, 
    CardDescription 
} from '@workspace/ui/components/card';
import { Skeleton } from '@workspace/ui/components/skeleton';
import { useSessions, useRevokeSession, useRevokeOtherSessions } from '@/lib/api/services/session-api';
import { toast } from '@workspace/ui/components/sonner';
import { Spinner } from "@workspace/ui/components/spinner";
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

// Dialog state
import { RevokeSessionDialog } from './revoke-session-dialog';

export function SessionsManagement() {
    const { data: sessions, isLoading } = useSessions();
    const revokeMutation = useRevokeSession();
    const revokeOtherMutation = useRevokeOtherSessions();

    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [isRevokeOtherOpen, setIsRevokeOtherOpen] = useState(false);

    const handleRevokeSingle = async () => {
        if (!selectedSessionId) return;
        try {
            await revokeMutation.mutateAsync(selectedSessionId);
            toast.success('Đã đăng xuất khỏi thiết bị này');
            setSelectedSessionId(null);
        } catch {
            toast.error('Không thể đăng xuất phiên này');
        }
    };

    const handleRevokeOther = async () => {
        try {
            await revokeOtherMutation.mutateAsync();
            toast.success('Đã đăng xuất khỏi tất cả các thiết bị khác');
            setIsRevokeOtherOpen(false);
        } catch {
            toast.error('Không thể thực hiện yêu cầu');
        }
    };

    const getDeviceIcon = (deviceInfo: string = '') => {
        const dev = deviceInfo.toLowerCase();
        if (dev.includes('iphone') || dev.includes('ios') || dev.includes('android')) {
            return <Smartphone className="size-4" />;
        }
        return <Monitor className="size-4" />;
    };

    const formatRelativeTime = (date: string | Date) => {
        try {
            return formatDistanceToNow(new Date(date), { addSuffix: true, locale: vi });
        } catch {
            return 'Không xác định';
        }
    };

    return (
        <>
            <Card className="border-none shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/50 bg-muted/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 rounded-xl">
                            <ShieldCheck className="size-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-bold tracking-tight">Phiên đăng nhập</CardTitle>
                            <CardDescription className="text-sm font-medium">Các thiết bị hiện đang truy cập tài khoản của bạn.</CardDescription>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-4 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive transition-all font-bold text-[11px]"
                        onClick={() => setIsRevokeOtherOpen(true)}
                        disabled={revokeOtherMutation.isPending || (sessions?.length || 0) <= 1}
                    >
                        {revokeOtherMutation.isPending ? (
                            <><Spinner className="mr-2 h-3.5 w-3.5" /> Đang xử lý...</>
                        ) : (
                            <><LogOut className="mr-2 size-4" /> Đăng xuất thiết bị khác</>
                        )}
                    </Button>
                </CardHeader>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="font-bold text-[11px] py-4 pl-6 opacity-70 w-[72px]">STT</TableHead>
                                <TableHead className="font-bold text-[11px] py-4 pl-6 opacity-70">Thiết bị & Trình duyệt</TableHead>
                                <TableHead className="font-bold text-[11px] opacity-70">Địa chỉ IP</TableHead>
                                <TableHead className="font-bold text-[11px] opacity-70">Gần nhất</TableHead>
                                <TableHead className="text-right font-bold text-[11px] pr-6 opacity-70">Thao tác</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="pl-6"><Skeleton className="h-4 w-6 rounded-full" /></TableCell>
                                        <TableCell className="py-5 pl-6"><Skeleton className="h-10 w-48 rounded-lg" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-24 rounded-full" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-32 rounded-full" /></TableCell>
                                        <TableCell className="text-right pr-6"><Skeleton className="h-8 w-20 ml-auto rounded-lg" /></TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                sessions?.map((session, index) => (
                                    <TableRow key={session.id} className="hover:bg-muted/20 transition-colors">
                                        <TableCell className="pl-6 text-xs font-medium text-muted-foreground">
                                            {index + 1}
                                        </TableCell>
                                        <TableCell className="py-5 pl-6">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2.5 bg-muted rounded-xl text-muted-foreground border border-border/50 shadow-sm">
                                                    {getDeviceIcon(session.deviceInfo)}
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-sm text-foreground">
                                                            {session.deviceInfo || 'Thiết bị lạ'}
                                                        </span>
                                                        {session.isCurrent && (
                                                            <Badge variant="outline" className="h-5 px-2 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold">
                                                                Hiện tại
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <span className="text-[11px] text-muted-foreground font-medium truncate max-w-[200px] sm:max-w-xs opacity-80 italic">
                                                        {session.userAgent || 'Không có thông tin trình duyệt'}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs font-bold font-mono text-muted-foreground">
                                            {session.ipAddress}
                                        </TableCell>
                                        <TableCell className="text-[11px] font-semibold text-muted-foreground">
                                            {formatRelativeTime(session.createdAt)}
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            {!session.isCurrent && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 px-4 rounded-lg text-destructive border-border/50 hover:bg-destructive/10 transition-all text-[11px] font-black"
                                                    onClick={() => setSelectedSessionId(session.id)}
                                                    disabled={revokeMutation.isPending}
                                                >
                                                    {revokeMutation.isPending && selectedSessionId === session.id ? 
                                                        <Spinner className="size-3" /> : 'Huỷ phiên'}
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                            {!isLoading && sessions?.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-48 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Monitor className="size-10 text-muted-foreground/30" />
                                            <p className="text-sm font-medium text-muted-foreground italic">Không có phiên đăng nhập nào.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {/* Confirmation Dialogs */}
            <RevokeSessionDialog
                open={!!selectedSessionId}
                onOpenChange={(open) => !open && setSelectedSessionId(null)}
                onConfirm={handleRevokeSingle}
                isPending={revokeMutation.isPending}
                title="Xác nhận đăng xuất"
                description="Bạn có chắc chắn muốn đăng xuất khỏi thiết bị này không? Hành động này không thể hoàn tác."
            />

            <RevokeSessionDialog
                open={isRevokeOtherOpen}
                onOpenChange={setIsRevokeOtherOpen}
                onConfirm={handleRevokeOther}
                isPending={revokeOtherMutation.isPending}
                title="Đăng xuất các thiết bị khác"
                description="Tất cả các phiên đăng nhập trên các thiết bị khác sẽ bị chấm dứt. Bạn sẽ chỉ còn giữ phiên hiện tại."
            />
        </>
    );
}
