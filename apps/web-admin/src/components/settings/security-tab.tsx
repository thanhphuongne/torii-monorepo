import { useState } from 'react';
import { Shield, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';
import { Skeleton } from '@workspace/ui/components/skeleton';
import { use2FAStatus } from '@/lib/api/services/two-factor-auth';
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from '@workspace/ui/components/card';
import {
    Item,
    ItemContent,
    ItemTitle,
    ItemDescription,
} from '@workspace/ui/components/item';
import { Badge } from '@workspace/ui/components/badge';
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import { EnableTwoFactorDialog } from './enable-two-factor-dialog';
import { DisableTwoFactorDialog } from './disable-two-factor-dialog';
import { BackupCodesDialog } from './backup-codes-dialog';
import { formatRelativeTime } from '@/lib/format-utils';

export function SecurityTab() {
    const { data: status, isLoading } = use2FAStatus();
    const [showEnableDialog, setShowEnableDialog] = useState(false);
    const [showDisableDialog, setShowDisableDialog] = useState(false);
    const [showBackupCodesDialog, setShowBackupCodesDialog] = useState(false);

    if (isLoading) {
        return (
            <div className="rounded-xl border bg-card p-5 space-y-4">
                <Skeleton className="h-9 w-48" />
                <Skeleton className="h-4 w-64" />
                <div className="grid gap-3 sm:grid-cols-2">
                    <Skeleton className="h-16 rounded-lg" />
                    <Skeleton className="h-16 rounded-lg" />
                </div>
            </div>
        );
    }

    const isEnabled = status?.isEnabled || false;

    return (
        <div className="space-y-4">
            {/* 2FA Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="grid gap-1">
                            <CardTitle>Xác Thực Hai Yếu Tố</CardTitle>
                            <CardDescription>Thêm lớp bảo mật bổ sung cho tài khoản</CardDescription>
                        </div>
                        <Badge variant={isEnabled ? 'default' : 'secondary'}>
                            {isEnabled ? 'Đã Bật' : 'Đã Tắt'}
                        </Badge>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Status Info when enabled */}
                    {isEnabled && status && (
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Item variant="outline">
                                <ItemContent>
                                    <ItemTitle className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">Phương Thức</ItemTitle>
                                    <ItemDescription className="text-sm font-semibold text-foreground">
                                        {status.method === 'totp' ? 'Ứng dụng xác thực' : 'Không xác định'}
                                    </ItemDescription>
                                </ItemContent>
                            </Item>
                            <Item variant="outline">
                                <ItemContent>
                                    <ItemTitle className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">Mã Dự Phòng</ItemTitle>
                                    <ItemDescription className="text-sm font-semibold text-foreground">
                                        Còn {status.backupCodesRemaining || 0} mã
                                    </ItemDescription>
                                </ItemContent>
                            </Item>
                            {status.enabledAt && (
                                <Item variant="outline">
                                    <ItemContent>
                                        <ItemTitle className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">Đã Bật</ItemTitle>
                                        <ItemDescription className="text-sm font-semibold text-foreground">
                                            {formatRelativeTime(status.enabledAt)}
                                        </ItemDescription>
                                    </ItemContent>
                                </Item>
                            )}
                            {status.lastUsedAt && (
                                <Item variant="outline">
                                    <ItemContent>
                                        <ItemTitle className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">Sử Dụng Lần Cuối</ItemTitle>
                                        <ItemDescription className="text-sm font-semibold text-foreground">
                                            {formatRelativeTime(status.lastUsedAt)}
                                        </ItemDescription>
                                    </ItemContent>
                                </Item>
                            )}
                        </div>
                    )}

                    {/* Info banner when disabled */}
                    {!isEnabled && (
                        <Alert className="border-blue-500/20 bg-blue-500/5 text-blue-600">
                            <Shield className="size-4" />
                            <AlertTitle className="text-foreground">Bảo vệ tài khoản với 2FA</AlertTitle>
                            <AlertDescription className="text-muted-foreground">
                                Xác thực hai yếu tố thêm một lớp bảo mật bằng cách yêu cầu mã từ điện thoại của bạn cùng với mật khẩu.
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Low backup codes warning */}
                    {isEnabled && status && status.backupCodesRemaining !== undefined && status.backupCodesRemaining < 3 && (
                        <Alert variant="destructive" className="border-amber-500/20 bg-amber-500/5 text-amber-600">
                            <AlertTriangle className="size-4" />
                            <AlertTitle className="text-foreground">Sắp hết mã dự phòng</AlertTitle>
                            <AlertDescription className="text-muted-foreground">
                                Bạn chỉ còn {status.backupCodesRemaining} mã dự phòng. Hãy cân nhắc tạo bộ mã mới.
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-1">
                        {!isEnabled ? (
                            <Button onClick={() => setShowEnableDialog(true)} size="lg">
                                <Shield className="size-4 mr-2" />
                                Bật Xác Thực Hai Yếu Tố
                            </Button>
                        ) : (
                            <>
                                <Button variant="outline" onClick={() => setShowBackupCodesDialog(true)}>
                                    <RefreshCw className="size-4 mr-2" />
                                    Tạo Mã Dự Phòng
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowDisableDialog(true)}
                                    className="border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
                                >
                                    <AlertTriangle className="size-4 mr-2" />
                                    Tắt 2FA
                                </Button>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Dialogs */}
            <EnableTwoFactorDialog open={showEnableDialog} onOpenChange={setShowEnableDialog} />
            <DisableTwoFactorDialog open={showDisableDialog} onOpenChange={setShowDisableDialog} />
            <BackupCodesDialog open={showBackupCodesDialog} onOpenChange={setShowBackupCodesDialog} />
        </div>
    );
}
