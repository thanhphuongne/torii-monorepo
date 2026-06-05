import React, { useCallback } from 'react';
import { setActiveSidePanel } from '@/store/slices/bottom-icons-activity-slice';
import { useAppDispatch } from '@/store';
import { BarChart2 } from 'lucide-react';
import ActionButton from '@/helpers/ui/action-button';

interface INewPollProps {
  createdAt: number | undefined;
  onClosePopover?: () => void;
}

const NewPoll = ({ createdAt, onClosePopover }: INewPollProps) => {
  const dispatch = useAppDispatch();

  const openPollsPanel = useCallback(() => {
    dispatch(setActiveSidePanel('POLLS'));
    if (onClosePopover) {
      onClosePopover();
    }
  }, [dispatch, onClosePopover]);

  const formatDate = (timeStamp?: number) => {
    const date = new Date(timeStamp ?? 0);
    return date.toLocaleString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="notification notif-new-poll w-full flex gap-4 py-2 px-4 border-b border-border dark:border-foreground">
      <div className="icon w-9 h-9 rounded-full bg-sidebar-border text-Blue2-800 relative inline-flex items-center justify-center">
        <BarChart2 className="w-[15px] text-white" />
      </div>
      <div className="text flex-1 text-foreground dark:text-white text-sm">
        <p>Cuộc thăm dò mới</p>
        <div className="bottom flex justify-between text-foreground dark:text-white text-xs items-center">
          <span className="">{formatDate(createdAt)}</span>{' '}
          <ActionButton
            onClick={openPollsPanel}
            custom="!h-5 w-auto px-2 !text-[10px] !rounded-md bg-Blue2-500 hover:bg-Blue2-600 border-Blue2-600"
          >
            Mở
          </ActionButton>
        </div>
      </div>
    </div>
  );
};

export default NewPoll;
