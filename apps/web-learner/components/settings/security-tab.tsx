'use client'

import { useState, useEffect } from 'react';
import { Link as LinkIcon, Unlink, Mail, Plus } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@workspace/ui/components/card';
import { Badge } from '@workspace/ui/components/badge';
import { toast } from 'sonner';

import { useLinkedProviders, useUnlinkProvider, useLinkGoogle, useLinkFacebook } from '@/lib/api/services/auth-api';
import { Spinner } from '@workspace/ui/components/spinner';
import { createGoogleGsiLoadingGuard, shouldEndFlowFromPromptMoment } from '@/lib/google-gsi-loading-guard';


export function SecurityTab() {
    const { data: linkedProviders } = useLinkedProviders();
    const unlinkMutation = useUnlinkProvider();
    const linkGoogleMutation = useLinkGoogle();
    const linkFacebookMutation = useLinkFacebook();

    const [googleLoading, setGoogleLoading] = useState(false);
    const [facebookLoading, setFacebookLoading] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined' && !document.getElementById('google-gsi-script')) {
            const googleScript = document.createElement('script');
            googleScript.id = 'google-gsi-script';
            googleScript.src = 'https://accounts.google.com/gsi/client';
            googleScript.async = true;
            googleScript.defer = true;
            document.body.appendChild(googleScript);
        }
    }, []);

    if (!linkedProviders) {
        return (
            <div className="flex items-center justify-center py-20">
                <Spinner className="size-8" />
            </div>
        );
    }

    const providers = linkedProviders?.providers || [];
    const hasPassword = linkedProviders?.hasPassword || false;
    const hasGoogle = providers.includes('google');
    const hasFacebook = providers.includes('facebook');
    const totalMethods = providers.length + (hasPassword ? 1 : 0);

    const handleUnlink = async (provider: 'google' | 'facebook') => {
        if (totalMethods <= 1) {
            toast.error('Không thể hủy liên kết phương thức cuối cùng.');
            return;
        }
        try {
            const res = await unlinkMutation.mutateAsync(provider);
            if (res.success) toast.success(`Đã hủy liên kết ${provider === 'google' ? 'Google' : 'Facebook'}`);
        } catch (error: any) {
            toast.error(error?.message || 'Hủy liên kết thất bại');
        }
    };

    const handleLinkGoogle = () => {
        const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        if (!googleClientId) {
            toast.error('Google OAuth chưa được cấu hình');
            return;
        }
        setGoogleLoading(true);
        if (typeof window === 'undefined' || !(window as any).google?.accounts?.id) {
            toast.error('Google Sign-In chưa tải. Vui lòng tải lại trang.');
            setGoogleLoading(false);
            return;
        }
        const guard = createGoogleGsiLoadingGuard(setGoogleLoading, 90_000);

        const handleFocus = () => {
            setTimeout(() => {
                window.removeEventListener('focus', handleFocus);
                guard.end();
            }, 1000);
        };
        window.addEventListener('focus', handleFocus);

        (window as any).google.accounts.id.initialize({
            client_id: googleClientId,
            callback: async (response: any) => {
                window.removeEventListener('focus', handleFocus);
                try {
                    const res = await linkGoogleMutation.mutateAsync(response.credential);
                    if (res.success) toast.success('Liên kết Google thành công');
                } catch (error: any) {
                    toast.error(error?.message || 'Liên kết Google thất bại');
                } finally {
                    guard.end();
                }
            },
        });

        const buttonWrapper = document.createElement('div');
        buttonWrapper.style.cssText = 'position:absolute;opacity:0;pointer-events:none;width:0;height:0';
        document.body.appendChild(buttonWrapper);
        (window as any).google.accounts.id.renderButton(buttonWrapper, { type: 'standard', size: 'large' });

        setTimeout(() => {
            const btn = buttonWrapper.querySelector('div[role="button"]') as HTMLElement;
            if (btn) btn.click();
            else {
                try {
                    (window as any).google.accounts.id.prompt((notification: unknown) => {
                        if (shouldEndFlowFromPromptMoment(notification)) {
                            window.removeEventListener('focus', handleFocus);
                            guard.end();
                        }
                    });
                } catch {
                    window.removeEventListener('focus', handleFocus);
                    guard.end();
                    toast.error('Không thể khởi tạo Google Sign-In');
                }
            }
            setTimeout(() => {
                if (buttonWrapper.parentNode) document.body.removeChild(buttonWrapper);
            }, 2000);
        }, 100);
    };

    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Sidebar: Security Overview */}
            <div className="lg:col-span-4 space-y-6">
                <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md overflow-hidden">
                    <CardHeader className="border-b bg-muted/20">
                        <CardTitle className="text-lg font-bold">Trạng thái bảo mật</CardTitle>
                        <CardDescription>Tổng quan các lớp bảo vệ tài khoản.</CardDescription>
                    </CardHeader>
                    <CardContent className="py-8 space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
                                <div className="flex items-center gap-3">
                                    <Mail className="size-4 text-primary" />
                                    <span className="text-xs font-bold">Mật khẩu gốc</span>
                                </div>
                                <Badge variant={hasPassword ? 'outline' : 'secondary'} className="text-[10px] font-bold">
                                    {hasPassword ? 'Có' : 'Không'}
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Security Actions */}
            <div className="lg:col-span-8 space-y-6">
                {/* Social Accounts */}
                <Card className="border-none shadow-sm">
                    <CardHeader>
                        <CardTitle>Tài khoản liên kết</CardTitle>
                        <CardDescription>Quản lý các phương thức đăng nhập nhanh qua đối tác cung cấp dịch vụ.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            <div className="flex flex-col gap-4 rounded-xl border bg-muted/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-start gap-3 sm:items-center sm:gap-4 min-w-0">
                                    <div className="p-2 bg-muted rounded-lg border border-border/50">
                                        <LinkIcon className="size-4 text-muted-foreground" />
                                    </div>
                                    <div className="flex min-w-0 flex-col">
                                        <span className="text-sm font-bold">Google account</span>
                                        <span className="text-[11px] text-muted-foreground font-medium break-words">Dùng Google để đăng nhập torii.sbs</span>
                                    </div>
                                </div>
                                <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap sm:gap-3">
                                    <Badge variant={hasGoogle ? 'default' : 'secondary'} className="h-5 text-[10px] font-bold">
                                        {hasGoogle ? 'Đã kết nối' : 'Chưa kết nối'}
                                    </Badge>
                                    {hasGoogle ? (
                                        <Button variant="ghost" size="sm" className="h-8 text-[11px] font-bold text-destructive hover:bg-destructive/10 sm:min-w-[92px]" disabled={unlinkMutation.isPending} onClick={() => handleUnlink('google')}>
                                            <Unlink className="w-3 h-3 mr-1.5" /> Hủy
                                        </Button>
                                    ) : (
                                        <Button variant="outline" size="sm" className="h-8 text-[11px] font-bold sm:min-w-[92px]" disabled={googleLoading} onClick={handleLinkGoogle}>
                                            <Plus className="w-3 h-3 mr-1.5" /> Kết nối
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
