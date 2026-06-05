import React, { useEffect } from 'react';
import { Menu, MenuButton, Transition } from '@headlessui/react';
import { Room } from 'livekit-client';

import WebcamMenuItems from '@/components/footer/icons/webcam/menu/items';
import { ChevronUp } from 'lucide-react';
import { useAppDispatch } from '@/store';
import { addVideoDevices } from '@/store/slices/roomSettingsSlice';
import { getInputMediaDevices } from '@/helpers/utils';

/** Khi mở menu: luôn làm mới danh sách camera (Redux có thể rỗng nếu không qua landing/modal). */
const WebcamMenuRefreshDevices = ({ open }: { open: boolean }) => {
  const dispatch = useAppDispatch();
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const { video } = await getInputMediaDevices('video');
        if (!cancelled) {
          dispatch(addVideoDevices(video));
        }
      } catch {
        // giữ danh sách cũ nếu không lấy được quyền / enumerate
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, dispatch]);
  return null;
};

interface IWebcamMenuProps {
  currentRoom: Room;
  isActiveWebcam: boolean;
  toggleWebcam: () => void;
  buttonClassName?: string;
  buttonChildren?: React.ReactNode;
  noLeftBorder?: boolean;
}

const WebcamMenu = ({
  currentRoom,
  isActiveWebcam,
  toggleWebcam,
  buttonClassName,
  buttonChildren,
  noLeftBorder,
}: IWebcamMenuProps) => {
  return (
    <div className="menu relative flex h-full min-h-0 flex-row items-stretch overflow-visible">
      <Menu>
        {({ open }) => (
          <>
            <WebcamMenuRefreshDevices open={open} />
            <MenuButton
              className={
                buttonClassName ??
                `footer-icon-bg flex h-full min-h-0 w-7 shrink-0 cursor-pointer items-center justify-center overflow-hidden border-0 ${noLeftBorder ? '' : 'border-l border-white/15 pl-0.5'} text-foreground transition-colors duration-200 md:w-8 3xl:w-9 ${open ? 'bg-black/5 dark:bg-white/10' : ''}`
              }
            >
              {buttonChildren ?? <ChevronUp className="w-4 h-4" />}
            </MenuButton>

            {/* Use the Transition component. */}
            <Transition
              as="div"
              show={open}
              enter="transition ease-out duration-200"
              enterFrom="transform opacity-0 scale-95 translate-y-2"
              enterTo="transform opacity-100 scale-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="transform opacity-100 scale-100 translate-y-0"
              leaveTo="transform opacity-0 scale-95 translate-y-2"
            >
              <WebcamMenuItems
                currentRoom={currentRoom}
                isActiveWebcam={isActiveWebcam}
                toggleWebcam={toggleWebcam}
              />
            </Transition>
          </>
        )}
      </Menu>
    </div>
  );
};

export default WebcamMenu;
