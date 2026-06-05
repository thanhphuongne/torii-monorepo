import React, { useCallback, useEffect, useState } from 'react';
import { Menu, MenuButton, Transition } from '@headlessui/react';
import { store, useAppSelector } from '@/store';
import HeaderMenus from '@/components/header/menus';
import RoomSettings from '@/components/header/room-settings';
import VolumeControl from '@/components/header/volume-control';
import DurationView from '@/components/header/duration-view';
import { getNatsConn } from '@/helpers/nats';
import { Menu as MenuIcon } from 'lucide-react';
import UserNotifications from '@/components/header/user-notifications';
import ConfirmationModal from '@/helpers/ui/confirmation-modal';

const Header = () => {
  const roomTitle = useAppSelector(
    (state) => state.session.currentRoom.metadata?.roomTitle,
  );
  const isRecorder = store.getState().session.currentUser?.isRecorder;

  const [title, setTitle] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalText, setModalText] = useState('');
  const [onConfirm, setOnConfirm] = useState<() => void>(() => () => { });

    useEffect(() => {
        if (roomTitle) {
            setTitle(roomTitle);
        }
    }, [roomTitle]);

  const handleLogout = useCallback(() => {
    const confirm = async () => {
      const conn = getNatsConn();
      await conn.endSession('Người dùng đã đăng xuất');
    };
    setModalText('Bạn có chắc chắn muốn thoát khỏi phiên họp này không?');
    setOnConfirm(() => confirm);
    setShowModal(true);
  }, []);

  return (
    !isRecorder && (
      <>
        <header
          id="main-header"
          className={`relative z-99999 px-4 min-h-[54px] 3xl:min-h-[68px] py-1 md:py-0 flex flex-nowrap items-center justify-between bg-card transition-transform border-b border-border`}
        >
          <div className="left relative z-20 flex items-center gap-2 md:gap-5 flex-1 overflow-hidden">
            <h2 className="header-title text-sm 3xl:text-base font-medium text-foreground leading-tight truncate">
              {title}
            </h2>
          </div>
          <div className="right flex items-center justify-end relative -right-3 flex-1 gap-0.5 z-30">
            <DurationView />
            <UserNotifications />
            <VolumeControl />
            <Menu>
              {({ open }) => (
                <div>
                  <MenuButton
                    className={`relative shrink-0 w-7 md:w-8 h-7 md:h-8 flex items-center justify-center rounded-lg cursor-pointer ${open ? 'bg-muted' : ''}`}
                  >
                    <div className="text-foreground cursor-pointer">
                      <MenuIcon className="w-5 h-5" />
                    </div>
                  </MenuButton>

                  {/* Use the Transition component. */}
                  <Transition
                    as="div"
                    show={open}
                    enter="transition ease-out duration-300"
                    enterFrom="transform opacity-0 scale-95 -translate-y-2"
                    enterTo="transform opacity-100 scale-100 translate-y-0"
                    leave="transition ease-in duration-200"
                    leaveFrom="transform opacity-100 scale-100 translate-y-0"
                    leaveTo="transform opacity-0 scale-95 -translate-y-2"
                  >
                    <HeaderMenus onOpenAlert={() => handleLogout()} />
                  </Transition>
                </div>
              )}
            </Menu>
          </div>
        </header>
        <ConfirmationModal
          show={showModal}
          onClose={() => setShowModal(false)}
          onConfirm={() => {
            onConfirm();
            setShowModal(false);
          }}
          title="Xác nhận"
          text={modalText}
        />
        <RoomSettings />
      </>
    )
  );
};

export default React.memo(Header);
