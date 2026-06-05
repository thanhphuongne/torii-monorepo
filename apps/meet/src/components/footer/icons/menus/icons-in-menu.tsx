import React, { useCallback, useMemo } from 'react';

import { store, useAppDispatch, useAppSelector } from '@/store';
import FooterMenuItem from '@/components/footer/icons/menus/menu-item';
import {
  setActiveSidePanel,
  updateIsActiveWhiteboard,
} from '@/store/slices/bottom-icons-activity-slice';
import { BarChart2, PenTool } from 'lucide-react';

const IconsInMenu = () => {
  const dispatch = useAppDispatch();

  const { roomFeatures } = useMemo(() => {
    return {
      roomFeatures:
        store.getState().session.currentRoom?.metadata?.roomFeatures,
    };
  }, []);

  const isActiveWhiteboard = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveWhiteboard,
  );
  const toggleWhiteboard = useCallback(() => {
    // prevent toggling whiteboard during screen sharing
    if (store.getState().bottomIconsActivity.isActiveScreenshare) {
      return;
    }
    dispatch(updateIsActiveWhiteboard(!isActiveWhiteboard));
  }, [dispatch, isActiveWhiteboard]);

  const isActivePoll = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.pollsFeatures?.isActive,
  );
  const isActivePollsPanel = useAppSelector(
    (state) => state.bottomIconsActivity.activeSidePanel === 'PARTICIPANTS',
  );
  const togglePollsPanel = useCallback(() => {
    dispatch(setActiveSidePanel('POLLS'));
  }, [dispatch]);

  return (
    <>
      {roomFeatures?.whiteboardFeatures?.isAllow && (
        <FooterMenuItem
          onClick={toggleWhiteboard}
          isActive={isActiveWhiteboard}
          icon={<PenTool />}
          text={
            isActiveWhiteboard
              ? 'Ẩn bảng trắng'
              : 'Hiển thị bảng trắng'
          }
        />
      )}

      {isActivePoll && (
        <FooterMenuItem
          onClick={togglePollsPanel}
          isActive={isActivePollsPanel}
          icon={<BarChart2 className="w-6" />}
          text={
            isActivePollsPanel
              ? 'Ẩn bảng bình chọn'
              : 'Hiển thị bảng bình chọn'
          }
        />
      )}
    </>
  );
};

export default IconsInMenu;
