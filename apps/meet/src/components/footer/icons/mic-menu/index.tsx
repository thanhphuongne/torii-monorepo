import React, { useEffect } from 'react';
import { Menu, MenuButton, Transition } from '@headlessui/react';
import { Room } from 'livekit-client';

import MicMenuItems from '@/components/footer/icons/mic-menu/items';
import { ChevronUp } from 'lucide-react';
import { useAppDispatch } from '@/store';
import { addAudioDevices } from '@/store/slices/roomSettingsSlice';
import { getInputMediaDevices } from '@/helpers/utils';

const MicMenuRefreshDevices = ({ open }: { open: boolean }) => {
  const dispatch = useAppDispatch();
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const { audio } = await getInputMediaDevices('audio');
        if (!cancelled) {
          dispatch(addAudioDevices(audio));
        }
      } catch {
        // giữ danh sách cũ
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, dispatch]);
  return null;
};

interface IMicMenuProps {
  currentRoom: Room;
  isActiveMicrophone: boolean;
  isMicMuted: boolean;
  onPrimaryAction: () => void;
  /**
   * Cho phép custom UI cho nút mở menu (để dùng dạng tròn "+" hoặc segment trong pill).
   * Nếu không truyền sẽ dùng button mặc định (ChevronUp).
   */
  buttonClassName?: string;
  buttonChildren?: React.ReactNode;
  /** Nếu true, bỏ border-left mặc định (vì wrapper pill tự chia segment). */
  noLeftBorder?: boolean;
}

const MicMenu = ({
  currentRoom,
  isActiveMicrophone,
  isMicMuted,
  onPrimaryAction,
  buttonClassName,
  buttonChildren,
  noLeftBorder,
}: IMicMenuProps) => {
  return (
    <div className="menu relative flex h-full min-h-0 flex-row items-stretch overflow-visible">
      <Menu>
        {({ open }) => (
          <>
            <MicMenuRefreshDevices open={open} />
            <MenuButton
              className={
                buttonClassName ??
                `footer-icon-bg flex h-full min-h-0 w-7 shrink-0 cursor-pointer items-center justify-center overflow-hidden border-0 ${noLeftBorder ? '' : 'border-l border-white/15 pl-0.5'} text-foreground transition-colors duration-200 md:w-8 3xl:w-9
                  ${isMicMuted && isActiveMicrophone ? 'text-destructive' : ''}
                  ${open ? 'bg-black/5 dark:bg-white/10' : ''}
                `
              }
            >
              {buttonChildren ?? <ChevronUp className="w-4 h-4" />}
            </MenuButton>

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
              <MicMenuItems
                currentRoom={currentRoom}
                isActiveMicrophone={isActiveMicrophone}
                isMicMuted={isMicMuted}
                onPrimaryAction={onPrimaryAction}
              />
            </Transition>
          </>
        )}
      </Menu>
    </div>
  );
};

export default MicMenu;
