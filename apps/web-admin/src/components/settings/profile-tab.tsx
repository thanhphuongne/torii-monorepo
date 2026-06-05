import { Mail, Shield, User, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { formatRelativeTime } from '@/lib/format-utils';
import { useAppSelector } from '@/hooks/hooks';
import { cn } from '@workspace/ui/lib/utils';

export function ProfileTab() {
    const user = useAppSelector((state) => state.auth.user);

    if (!user) {
        return (
            <div className="flex items-center justify-center py-12">
                <p className="text-sm text-muted-foreground/60">Không có dữ liệu người dùng</p>
            </div>
        );
    }

    const infoItems = [
        {
            label: 'Tên Hiển Thị',
            value: user.displayName || 'Chưa thiết lập',
            icon: <User className="size-4" />,
        },
        {
            label: 'Email',
            value: user.email,
            icon: <Mail className="size-4" />,
        },
        {
            label: 'Vai Trò',
            value: user.role,
            icon: <Shield className="size-4" />,
        },
        {
            label: 'Tham Gia Từ',
            value: user.createdAt ? formatRelativeTime(user.createdAt) : '—',
            icon: <Calendar className="size-4" />,
        },
    ];

    return (
        <div className="space-y-8">
            <div className="space-y-1">
                <h2 className="text-xl font-bold tracking-tight">Thông Tin Hồ Sơ</h2>
                <p className="text-sm text-muted-foreground">Chi tiết tài khoản và thông tin cá nhân của bạn</p>
            </div>

            <div className="space-y-8 max-w-2xl">
                {infoItems.map((item, index) => (
                    <div key={index} className="space-y-2 group">
                        <div className="flex items-center gap-2 text-muted-foreground/60 group-hover:text-primary transition-colors">
                            {item.icon}
                            <span className="text-[10px] font-bold uppercase tracking-wider">
                                {item.label}
                            </span>
                        </div>
                        <div className="text-base font-semibold text-foreground pl-6 border-l-2 border-primary/10 group-hover:border-primary/40 transition-all">
                            {item.value}
                        </div>
                    </div>
                ))}
            </div>

            <div className={cn(
                "rounded-lg p-4 flex items-start gap-3 transition-all border",
                user.verifiedAt 
                    ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-600" 
                    : "bg-destructive/5 border-destructive/10 text-destructive"
            )}>
                {user.verifiedAt ? <CheckCircle className="size-5 shrink-0" /> : <AlertCircle className="size-5 shrink-0" />}
                <div className="space-y-1">
                    <p className="text-sm font-bold">
                        {user.verifiedAt ? 'Email Đã Xác Thực' : 'Email Chưa Xác Thực'}
                    </p>
                    <p className="text-xs opacity-80">
                        {user.verifiedAt
                            ? 'Địa chỉ email của bạn đã được xác minh thành công.'
                            : 'Vui lòng xác minh địa chỉ email để đảm bảo quyền lợi và bảo mật tài khoản.'}
                    </p>
                </div>
            </div>
        </div>
    );
}
