import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from '@headlessui/react';
import { BreakoutRoom } from '@workspace/protocol';

import EndBtn from '@/components/breakout-room/manage-active-rooms/room/end-btn';
import BreakoutRoomUsers from '@/components/breakout-room/manage-active-rooms/room/users';
import BreakoutRoomDuration from '@/components/breakout-room/manage-active-rooms/room/duration';
import JoinBtn from '@/components/breakout-room/manage-active-rooms/room/join-btn';
import ExtendDuration from '@/components/breakout-room/manage-active-rooms/room/extend-duration';
import { BreakoutRoomMessage } from '@/components/breakout-room';

interface RoomItemProps {
  room: BreakoutRoom;
  setMessage: (message: BreakoutRoomMessage | null) => void;
}

const RoomItem = ({ room, setMessage }: RoomItemProps) => {

  return (
    <Disclosure as="div">
      {({ open }) => (
        <div className="bg-card rounded-xl border border-border overflow-hidden w-full">
          <DisclosureButton
            className={`flex items-center justify-between gap-3 w-full pl-[14px] pr-2 bg-card h-9 rounded-xl shadow-sm transition-all duration-300 cursor-pointer ${open ? 'border-b border-border' : ''
              }`}
          >
            <span className="text-sm text-foreground">
              {room.title}
            </span>
            <div className="right flex items-center gap-2">
              <div className="wrap text-sm font-bold text-foreground">
                {room.started ? (
                  <BreakoutRoomDuration
                    duration={BigInt(room.duration)}
                    created={BigInt(room.created)}
                  />
                ) : (
                  "Chưa bắt đầu"
                )}
              </div>
              <motion.div
                animate={{ rotate: open ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className=""
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="17"
                  viewBox="0 0 16 17"
                  fill="none"
                >
                  <path d="M12 6.5L8 10.5L4 6.5" fill="currentColor" />
                  <path
                    d="M12 6.5L8 10.5L4 6.5H12Z"
                    stroke="currentColor"
                    strokeWidth="1.67"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </motion.div>
            </div>
          </DisclosureButton>

          <AnimatePresence>
            {open && (
              <DisclosurePanel
                static
                as={motion.div}
                initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className=""
              >
                <div className="wrap relative rounded-xl overflow-auto">
                  <div className="inner p-5">
                    <div className="row flex flex-wrap items-center justify-between mb-4">
                      <ExtendDuration
                        breakoutRoomId={room.id}
                        setMessage={setMessage}
                      />
                      <div className="row flex mb-2">
                        <JoinBtn
                          breakoutRoomId={room.id}
                          setMessage={setMessage}
                        />
                        <EndBtn
                          breakoutRoomId={room.id}
                          setMessage={setMessage}
                        />
                      </div>
                    </div>
                    <BreakoutRoomUsers
                      users={room.users}
                      breakoutRoomId={room.id}
                      setMessage={setMessage}
                    />
                  </div>
                </div>
              </DisclosurePanel>
            )}
          </AnimatePresence>
        </div>
      )}
    </Disclosure>
  );
};

export default RoomItem;
