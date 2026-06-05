import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs';
import { ProfileTab } from '@/components/settings/profile-tab';
import { SecurityTab } from '@/components/settings/security-tab';
import { SessionsTab } from '@/components/settings/sessions-tab';
import { PasswordTab } from '@/components/settings/password-tab';

import { PageHeader } from '@/components/common/page-header';

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'profile';

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Cài đặt Tài khoản"
        subtitle="Quản lý cấu hình cá nhân và bảo mật Torii Academy"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full overflow-x-auto whitespace-nowrap">
          <TabsTrigger value="profile">Hồ Sơ</TabsTrigger>
          <TabsTrigger value="security">Bảo Mật</TabsTrigger>
          <TabsTrigger value="sessions">Phiên Đăng Nhập</TabsTrigger>
          <TabsTrigger value="password">Mật Khẩu</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <ProfileTab />
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <SecurityTab />
        </TabsContent>

        <TabsContent value="sessions" className="space-y-6">
          <SessionsTab />
        </TabsContent>

        <TabsContent value="password" className="space-y-6">
          <PasswordTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
