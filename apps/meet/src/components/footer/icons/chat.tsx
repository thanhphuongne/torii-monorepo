import React, { useCallback, useMemo } from 'react';
import clsx from 'clsx';

import { store, useAppDispatch, useAppSelector } from '@/store';
import { MessageSquare } from 'lucide-react';
import { setActiveSidePanel } from '@/store/slices/bottom-icons-activity-slice';
import { Button } from '@workspace/ui/components/button';

const ChatIcon = () => {
  const dispatch = useAppDispatch();
  const { showTooltip } = useMemo(() => {
    const session = store.getState().session;
    return {
      showTooltip: session.userDeviceType === 'desktop',
    };
  }, []);

  const isActiveChatPanel = useAppSelector(
    (state) => state.bottomIconsActivity.activeSidePanel === 'CHAT',
  );
  const totalUnreadChatMsgs = useAppSelector(
    (state) => state.bottomIconsActivity.totalUnreadChatMsgs,
  );

  const toggleChatPanel = useCallback(() => {
    dispatch(setActiveSidePanel('CHAT'));
  }, [dispatch]);

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={toggleChatPanel}
      className={clsx(
        'message footer-icon relative h-10 w-10 rounded-full border-border bg-card shadow-sm hover:bg-muted md:h-11 md:w-11 3xl:h-[52px] 3xl:w-[52px]',
        {
          'has-tooltip': showTooltip,
          'bg-muted': isActiveChatPanel,
        },
      )}
    >
      <span className="tooltip">
        {isActiveChatPanel ? 'Ẩn bảng chat' : 'Hiển thị bảng chat'}
      </span>
      <MessageSquare className="h-4 w-4 md:h-5 md:w-5 3xl:h-6 3xl:w-6" />
      {!isActiveChatPanel && totalUnreadChatMsgs > 0 && (
        <div className="unseen-message-count absolute -top-2 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground 3xl:h-5 3xl:w-5 3xl:text-xs">
          {totalUnreadChatMsgs}
        </div>
      )}
    </Button>
  );
};

export default ChatIcon;
