import React, { Dispatch, SetStateAction, useState } from 'react';
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Transition,
} from '@headlessui/react';

import { MoreHorizontal } from 'lucide-react';
import { PollDataWithOption, publishPollResultByChat } from '@/components/polls/utils';
import { useEndPoll } from '@/components/polls/hooks/use-end-poll';

interface PollActionsMenuProps {
  isRunning: boolean;
  setViewDetails: Dispatch<SetStateAction<boolean>>;
  pollDataWithOption: PollDataWithOption;
}

const PollActionsMenu = ({
  isRunning,
  setViewDetails,
  pollDataWithOption,
}: PollActionsMenuProps) => {
  const { endPoll, isEndingPoll } = useEndPoll();
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = () => {
    setIsPublishing(true);
    publishPollResultByChat(pollDataWithOption).finally(() => {
      setIsPublishing(false);
    });
  };

  return (
    <Menu as="div">
      {({ open }) => (
        <>
          <MenuButton className="relative shrink-0 p-2 mr-2 cursor-pointer">
            <div className="">
              <MoreHorizontal className="w-5 h-5" />
            </div>
          </MenuButton>
          <Transition
            as="div"
            show={open}
            enter="transition duration-100 ease-out"
            enterFrom="transform scale-95 opacity-0"
            enterTo="transform scale-100 opacity-100"
            leave="transition duration-75 ease-out"
            leaveFrom="transform scale-100 opacity-100"
            leaveTo="transform scale-95 opacity-0"
          >
            <MenuItems
              static
              className="origin-top-right z-20 absolute ltr:right-0 rtl:-left-4 mt-2 w-[244px] shadow-lg rounded-xl overflow-hidden border border-border bg-card p-2 ring-0 focus:outline-hidden"
            >
              <MenuItem>
                <button
                  className="h-8 cursor-pointer w-full flex items-center hover:bg-muted text-sm gap-2 leading-none font-medium text-foreground px-2 3xl:px-3 rounded-lg transition-colors relative"
                  onClick={() => setViewDetails(true)}
                >
                  Xem chi tiết
                </button>
              </MenuItem>
              <div className="h-px w-full bg-border my-1"></div>
              {isRunning ? (
                <MenuItem>
                  <button
                    onClick={() => endPoll(pollDataWithOption.pollId)}
                    disabled={isEndingPoll}
                    className="h-8 cursor-pointer w-full flex items-center hover:bg-destructive hover:text-destructive-foreground text-sm gap-2 leading-none font-medium text-destructive px-2 3xl:px-3 rounded-lg transition-colors relative disabled:opacity-50"
                  >
                    Kết thúc bình chọn
                  </button>
                </MenuItem>
              ) : (
                <MenuItem>
                  <button
                    className="h-8 cursor-pointer w-full flex items-center hover:bg-muted text-sm gap-2 leading-none font-medium text-foreground px-2 3xl:px-3 rounded-lg transition-colors relative disabled:opacity-50"
                    onClick={handlePublish}
                    disabled={isPublishing}
                  >
                    Công bố kết quả
                  </button>
                </MenuItem>
              )}
            </MenuItems>
          </Transition>
        </>
      )}
    </Menu>
  );
};

export default PollActionsMenu;
