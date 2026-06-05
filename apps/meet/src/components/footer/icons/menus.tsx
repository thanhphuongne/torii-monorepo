import React from 'react';

import { useAppSelector } from '@/store';
import LockSettingsModal from '@/components/footer/modals/lock-settings-modal';
import RtmpModal from '@/components/footer/modals/rtmp-modal';
import ManageWaitingRoom from '@/components/waiting-room';
import BreakoutRoom from '@/components/breakout-room';
import { MoreHorizontal } from 'lucide-react';
import ExternalMediaPlayerModal from '@/components/external-media-player/modal';
import DisplayExternalLinkModal from '@/components/display-external-link/modal';
import AdminMenus from '@/components/footer/icons/menus/admin-menus';
import IconsInMenu from '@/components/footer/icons/menus/icons-in-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu';
import { Button } from '@workspace/ui/components/button';

interface MenusIconProps {
  isAdmin: boolean;
}

const MenusIcon = ({ isAdmin }: MenusIconProps) => {
  const showRtmpModal = useAppSelector(
    (state) => state.bottomIconsActivity.showRtmpModal,
  );

  const showExternalMediaPlayerModal = useAppSelector(
    (state) => state.bottomIconsActivity.showExternalMediaPlayerModal,
  );
  const showManageWaitingRoomModal = useAppSelector(
    (state) => state.bottomIconsActivity.showManageWaitingRoomModal,
  );
  const showManageBreakoutRoomModal = useAppSelector(
    (state) => state.bottomIconsActivity.showManageBreakoutRoomModal,
  );
  const showDisplayExternalLinkModal = useAppSelector(
    (state) => state.bottomIconsActivity.showDisplayExternalLinkModal,
  );
  const showLockSettingsModal = useAppSelector(
    (state) => state.bottomIconsActivity.showLockSettingsModal,
  );

  return (
    <>
      <div className="menu relative z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="footer-menu footer-icon h-10 w-10 rounded-full border-border bg-card shadow-sm hover:bg-muted md:h-11 md:w-11 3xl:h-[52px] 3xl:w-[52px]"
            >
              <MoreHorizontal className="h-4 w-4 md:h-5 md:w-5 3xl:h-6 3xl:w-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="top"
            sideOffset={12}
            className="z-50 w-[300px] rounded-xl border border-border bg-popover p-2 shadow-lg"
            id="footer-menu"
          >
            {isAdmin && <AdminMenus />}
            {isAdmin && <DropdownMenuSeparator className="my-1" />}
            <div className="mobile-menu-icons block md:hidden">
              <IconsInMenu />
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {showLockSettingsModal && <LockSettingsModal />}
      {showRtmpModal && <RtmpModal />}
      {showExternalMediaPlayerModal && <ExternalMediaPlayerModal />}
      {showManageWaitingRoomModal && <ManageWaitingRoom />}
      {showManageBreakoutRoomModal && <BreakoutRoom />}
      {showDisplayExternalLinkModal && <DisplayExternalLinkModal />}
    </>
  );
};

export default MenusIcon;
