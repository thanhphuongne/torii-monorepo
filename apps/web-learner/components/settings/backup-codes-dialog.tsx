'use client'

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@workspace/ui/components/dialog';
import { Button } from '@workspace/ui/components/button';
import { toast } from '@workspace/ui/components/sonner';
import { Key, Download, Copy, Check, AlertTriangle } from 'lucide-react';
import { useRegenerateBackupCodes } from '@/lib/api/services/two-factor-auth-api';
import { Spinner } from '@workspace/ui/components/spinner'
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert';

interface BackupCodesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function BackupCodesDialog({ open, onOpenChange }: BackupCodesDialogProps) {
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [copiedCodes, setCopiedCodes] = useState(false);
    const regenerateMutation = useRegenerateBackupCodes();

    const handleRegenerate = async () => {
        try {
            const codes = await regenerateMutation.mutateAsync();
            setBackupCodes(codes);
            toast.success('Mã dự phòng đã được tạo lại thành công');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Không thể tạo lại mã dự phòng');
        }
    };

    const copyBackupCodes = () => {
        navigator.clipboard.writeText(backupCodes.join('\n'));
        setCopiedCodes(true);
        setTimeout(() => setCopiedCodes(false), 2000);
        toast.success('Đã sao chép mã dự phòng');
    };

    const downloadBackupCodes = () => {
        const blob = new Blob([backupCodes.join('\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `torii-backup-codes-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Đã tải xuống mã dự phòng');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg rounded-2xl border-border/20 bg-background/95 backdrop-blur-xl shadow-2xl shadow-primary/5">
                <DialogHeader className="space-y-3">
                    <DialogTitle className="flex items-center gap-3 text-2xl font-sans font-bold italic tracking-normal text-foreground">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <Key className="size-5" />
                        </div>
                        Tạo lại mã dự phòng
                    </DialogTitle>
                    <DialogDescription className="text-xs font-medium text-muted-foreground/70 leading-relaxed">
                        Tạo mã dự phòng mới cho tài khoản của bạn
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-2">
                    {backupCodes.length === 0 ? (
                        <>
                            {/* Warning */}
                            <Alert className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                                <AlertTitle className="text-amber-600">Điều này sẽ làm vô hiệu hóa mã dự phòng cũ</AlertTitle>
                                <AlertDescription className="text-amber-600/90">
                                    Bất kỳ mã dự phòng nào đã được tạo trước đó sẽ không còn hoạt động. Hãy đảm bảo lưu các mã mới ở nơi an toàn.
                                </AlertDescription>
                            </Alert>

                            {/* Generate Button */}
                            <Button
                                onClick={handleRegenerate}
                                disabled={regenerateMutation.isPending}
                                className="w-full h-12 rounded-xl bg-primary text-white font-medium text-sm shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 active:scale-95 transition-all duration-300 gap-2"
                            >
                                {regenerateMutation.isPending ? (
                                    <>
                                        <Spinner className="size-4 animate-spin opacity-70" />
                                        Đang tạo...
                                    </>
                                ) : (
                                    <>
                                        <Key className="size-4" />
                                        Tạo mã dự phòng mới
                                    </>
                                )}
                            </Button>
                        </>
                    ) : (
                        <>
                            {/* Success Message */}
                            <Alert className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                <Check className="h-4 w-4 text-emerald-600" />
                                <AlertTitle className="text-emerald-600">Mã dự phòng mới đã được tạo</AlertTitle>
                                <AlertDescription className="text-emerald-600/90">
                                    Mỗi mã chỉ có thể sử dụng một lần. Lưu trữ chúng ở nơi an toàn.
                                </AlertDescription>
                            </Alert>

                            {/* Backup Codes Grid */}
                            <div className="grid grid-cols-2 gap-3 p-5 rounded-xl border border-border/20 bg-muted/10">
                                {backupCodes.map((code, index) => (
                                    <div
                                        key={index}
                                        className="rounded-xl bg-background px-4 py-3 text-center font-mono text-sm font-medium border border-border/10 shadow-sm"
                                    >
                                        {code}
                                    </div>
                                ))}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <Button
                                    onClick={copyBackupCodes}
                                    variant="outline"
                                    className="flex-1 h-11 rounded-xl border-border/20 bg-background hover:bg-muted/30 gap-2"
                                >
                                    {copiedCodes ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                                    <span className="text-xs font-medium">Sao chép</span>
                                </Button>
                                <Button
                                    onClick={downloadBackupCodes}
                                    variant="outline"
                                    className="flex-1 h-11 rounded-xl border-border/20 bg-background hover:bg-muted/30 gap-2"
                                >
                                    <Download className="size-4" />
                                    <span className="text-xs font-medium">Tải xuống</span>
                                </Button>
                            </div>

                            <Button
                                onClick={() => {
                                    onOpenChange(false);
                                    setBackupCodes([]);
                                }}
                                className="w-full h-12 rounded-xl bg-primary text-white font-medium text-sm shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 active:scale-95 transition-all duration-300"
                            >
                                Tôi đã lưu mã dự phòng
                            </Button>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
