import React, { useCallback, useEffect, useMemo } from 'react';
import clsx from 'clsx';

import { store, useAppDispatch, useAppSelector } from '@/store';
import { setActiveSidePanel } from '@/store/slices/bottom-icons-activity-slice';
import { BarChart2 } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';

const PollsIcon = () => {
  const dispatch = useAppDispatch();
  const showTooltip = useMemo(
    () => store.getState().session.userDeviceType === 'desktop',
    [],
  );

  const isActive = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.pollsFeatures?.isActive,
  );
  const isActivePollsPanel = useAppSelector(
    (state) => state.bottomIconsActivity.activeSidePanel === 'POLLS',
  );

  useEffect(() => {
    if (!isActive && isActivePollsPanel) {
      dispatch(setActiveSidePanel('POLLS'));
    }
    //eslint-disable-next-line
  }, [isActive]);

  const togglePollsPanel = useCallback(() => {
    dispatch(setActiveSidePanel('POLLS'));
  }, [dispatch]);

  if (!isActive) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={togglePollsPanel}
      className={clsx(
        'pollsIcon footer-icon relative hidden h-11 w-11 rounded-full border-border bg-card shadow-sm hover:bg-muted md:inline-flex 3xl:h-[52px] 3xl:w-[52px]',
        {
          'has-tooltip': showTooltip,
          'bg-muted': isActivePollsPanel,
        },
      )}
    >
      <span className="tooltip">
        {isActivePollsPanel ? 'Ẩn bảng bình chọn' : 'Hiển thị bảng bình chọn'}
      </span>
      <BarChart2 className="h-4 w-4 3xl:h-5 3xl:w-5" />
    </Button>
  );
};

export default PollsIcon;
