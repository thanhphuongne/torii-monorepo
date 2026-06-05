import { ProfileTab } from '@/components/settings/profile-tab';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@workspace/ui/components/button';
import { Settings, Shield, Key } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title="Thông tin cá nhân"
                subtitle="Quản lý thông tin hồ sơ của bạn"
                actions={
                    <Button variant="outline" onClick={() => navigate('/settings')}>
                        <Settings className="mr-2 h-4 w-4" />
                        Cài đặt tài khoản
                    </Button>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
                <div className="lg:col-span-3">
                    <ProfileTab />
                </div>

                <div className="space-y-8">
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                            <Shield className="h-4 w-4 text-primary" />
                            Truy cập nhanh
                        </h3>
                        <div className="flex flex-col gap-1">
                            <Button
                                variant="outline"
                                className="w-full justify-start text-sm font-medium border-primary/20 text-primary bg-transparent hover:bg-primary/5 hover:text-primary transition-all group"
                                onClick={() => navigate('/settings?tab=security')}
                            >
                                <Shield className="mr-3 h-4 w-4 opacity-50 group-hover:opacity-100" />
                                Bảo mật & 2FA
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full justify-start text-sm font-medium border-primary/20 text-primary bg-transparent hover:bg-primary/5 hover:text-primary transition-all group"
                                onClick={() => navigate('/settings?tab=password')}
                            >
                                <Key className="mr-3 h-4 w-4 opacity-50 group-hover:opacity-100" />
                                Đổi mật khẩu
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
