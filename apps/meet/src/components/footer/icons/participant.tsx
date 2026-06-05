import React, { useCallback, useMemo } from 'react';
import clsx from 'clsx';

import { store, useAppDispatch, useAppSelector } from '@/store';
import { participantsSelector } from '@/store/slices/participant-slice';
import { Users } from 'lucide-react';
import { setActiveSidePanel } from '@/store/slices/bottom-icons-activity-slice';
import { Button } from '@workspace/ui/components/button';

const ParticipantIcon = () => {
  const dispatch = useAppDispatch();
  const { showTooltip } = useMemo(() => {
    const session = store.getState().session;
    return {
      showTooltip: session.userDeviceType === 'desktop',
    };
  }, []);

  const isActiveParticipantsPanel = useAppSelector(
    (state) => state.bottomIconsActivity.activeSidePanel === 'PARTICIPANTS',
  );
  const participantsTotal = useAppSelector(participantsSelector.selectTotal);

  const toggleParticipantsPanel = useCallback(() => {
    dispatch(setActiveSidePanel('PARTICIPANTS'));
  }, [dispatch]);

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={toggleParticipantsPanel}
      className={clsx(
        'participants footer-icon relative h-10 w-10 rounded-full border-border bg-card shadow-sm hover:bg-muted md:h-11 md:w-11 3xl:h-[52px] 3xl:w-[52px]',
        {
          'has-tooltip': showTooltip,
          'bg-muted': isActiveParticipantsPanel,
        },
      )}
    >
      <span className="tooltip">
        {isActiveParticipantsPanel
          ? 'Ẩn danh sách người tham gia'
          : 'Hiển thị danh sách người tham gia'}
      </span>
      <Users className="h-4 w-4 md:h-5 md:w-5 3xl:h-6 3xl:w-6" />
      {!isActiveParticipantsPanel && (
        <div className="unseen-message-count absolute -top-2 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground 3xl:h-5 3xl:w-5 3xl:text-xs">
          {participantsTotal}
        </div>
      )}
    </Button>
  );
};

export default ParticipantIcon;
