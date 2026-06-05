import React, { useMemo } from 'react';

import { store } from '@/store';
import WebcamIcon from '@/components/footer/icons/webcam';
import MicrophoneIcon from '@/components/footer/icons/microphone';
import ChatIcon from '@/components/footer/icons/chat';
import ParticipantIcon from '@/components/footer/icons/participant';
import RaiseHandIcon from '@/components/footer/icons/raisehand';
import ScreenshareIcon from '@/components/footer/icons/screenshare';
import WhiteboardIcon from '@/components/footer/icons/whiteboard';
import BreakoutRoomInvitation from '@/components/breakout-room/breakout-room-invitation';
import EndMeetingButton from '@/components/footer/icons/end-meeting';
import RecordingIcon from '@/components/footer/icons/recording';
import PollsIcon from '@/components/footer/icons/polls';
import MenusIcon from '@/components/footer/icons/menus';
import AiChatIcon from '@/components/footer/icons/ai-chat';

const Footer = () => {
  const { isRecorder, allowChat, isAdmin } = useMemo(() => {
    const { currentRoom, currentUser } = store.getState().session;
    return {
      isRecorder: !!currentUser?.isRecorder,
      allowChat: !!currentRoom.metadata?.roomFeatures?.chatFeatures?.isAllow,
      isAdmin: !!currentUser?.metadata?.isAdmin,
    };
  }, []);

  return (
    <footer
      id="main-footer"
      className={`meet-footer-bar relative z-[200] flex min-h-[52px] shrink-0 flex-col border-t border-[var(--meet-footer-border)] px-2 py-2 md:h-[60px] md:min-h-0 md:flex-row md:items-center md:px-4 md:py-0 3xl:h-[72px] ${isRecorder ? 'hidden' : ''}`}
    >
      <div className="footer-inner flex w-full max-w-[100vw] flex-col gap-2 overflow-visible md:flex-row md:items-center md:justify-between md:gap-3 md:overflow-visible rtl:flex-row-reverse">
        {/* Thời gian / mã phòng: dùng header (DurationView + tiêu đề) để tránh trùng */}

        <div className="footer-middle flex min-w-0 flex-1 flex-col items-stretch justify-center gap-2 overflow-visible md:flex-row md:items-center md:justify-center md:gap-2">
          <div className="meet-footer-actions flex flex-wrap items-center justify-center gap-x-2 gap-y-2 overflow-visible px-0.5 md:flex-nowrap md:gap-2">
            {/* Mic + cam: kích thước lớn hơn (class meet-footer-ctrl-primary) */}
            <div className="meet-footer-ctrl-primary flex shrink-0 items-center gap-2">
              <MicrophoneIcon />
              <WebcamIcon />
            </div>

            <ScreenshareIcon />
            <WhiteboardIcon />
            <RaiseHandIcon />

            {/* Tablet+: ít icon hơn trên mobile để footer gọn */}
            <div className="meet-footer-secondary hidden items-center gap-2 md:flex">
              <PollsIcon />
              <RecordingIcon />
              <AiChatIcon />
            </div>

            <div className="flex items-center gap-2 md:hidden">
              <ParticipantIcon />
              {allowChat && <ChatIcon />}
            </div>

            <div className="meet-footer-end-call flex shrink-0 items-center justify-center gap-2">
              <MenusIcon isAdmin={isAdmin} />
              <EndMeetingButton />
            </div>
          </div>
        </div>

        <div className="footer-right hidden min-w-0 shrink-0 items-center justify-end gap-1.5 md:flex md:gap-2">
          <AiChatIcon />
          {allowChat && <ChatIcon />}
          <ParticipantIcon />
        </div>
      </div>
      <BreakoutRoomInvitation />
    </footer>
  );
};

export default React.memo(Footer);
