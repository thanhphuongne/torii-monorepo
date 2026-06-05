import React, { useCallback, useMemo } from 'react';

import FooterMenuItem from '@/components/footer/icons/menus/menu-item';
import { store, useAppDispatch } from '@/store';

import usePolls from '@/components/footer/icons/menus/hooks/use-polls';
import useMuteAll from '@/components/footer/icons/menus/hooks/use-mute-all';
import useExternalMediaPlayer from '@/components/footer/icons/menus/hooks/use-external-media-player';
import {
  updateShowLockSettingsModal,
  updateShowManageBreakoutRoomModal,
  updateShowManageWaitingRoomModal,
} from '@/store/slices/bottom-icons-activity-slice';
import { BarChart2, LayoutGrid, Play, Lock as LockIcon, MicOff, UserPlus } from 'lucide-react';

const AdminMenus = () => {
  const dispatch = useAppDispatch();

  const { roomFeatures } = useMemo(() => {
    return {
      roomFeatures:
        store.getState().session.currentRoom?.metadata?.roomFeatures,
    };
  }, []);

  const { togglePolls, isActivePoll } = usePolls();
  const { muteAllUsers } = useMuteAll();
  const { toggleExternalMediaPlayer, isActiveExternalMediaPlayer } =
    useExternalMediaPlayer();

  const openLockSettingsModal = useCallback(() => {
    dispatch(updateShowLockSettingsModal(true));
  }, [dispatch]);

  const openManageWaitingRoomModal = useCallback(() => {
    dispatch(updateShowManageWaitingRoomModal(true));
  }, [dispatch]);

  const openManageBreakoutRoomModal = useCallback(() => {
    dispatch(updateShowManageBreakoutRoomModal(true));
  }, [dispatch]);

  return (
    <>
      {roomFeatures?.pollsFeatures?.isAllow && (
        <FooterMenuItem
          onClick={togglePolls}
          isActive={isActivePoll}
          icon={<BarChart2 className="w-6" />}
          text={
            isActivePoll
              ? 'Tắt bình chọn'
              : 'Bật bình chọn'
          }
        />
      )}
      {roomFeatures?.externalMediaPlayerFeatures?.isAllow && (
        <FooterMenuItem
          onClick={toggleExternalMediaPlayer}
          isActive={isActiveExternalMediaPlayer}
          icon={<Play />}
          text={
            isActiveExternalMediaPlayer
              ? 'Dừng trình phát đa phương tiện bên ngoài'
              : 'Chạy trình phát đa phương tiện bên ngoài'
          }
        />
      )}
      <div className="divider h-1 w-[110%] bg-muted -ml-3 my-0.5"></div>
      <FooterMenuItem
        onClick={muteAllUsers}
        icon={<MicOff className="w-5 h-5" />}
        text="Tắt micro tất cả người dùng"
      />
      <FooterMenuItem
        onClick={openLockSettingsModal}
        icon={<LockIcon className="w-5 h-5" />}
        text="Cài đặt khóa phòng"
      />
      {roomFeatures?.waitingRoomFeatures?.isActive && (
        <FooterMenuItem
          onClick={openManageWaitingRoomModal}
          icon={<UserPlus className="w-5 h-5" />}
          text="Quản lý phòng chờ"
        />
      )}
      {roomFeatures?.breakoutRoomFeatures?.isAllow && (
        <FooterMenuItem
          onClick={openManageBreakoutRoomModal}
          icon={<LayoutGrid className="w-6 h-auto" />}
          text="Quản lý phòng thảo luận nhóm"
        />
      )}
    </>
  );
};

export default AdminMenus;
