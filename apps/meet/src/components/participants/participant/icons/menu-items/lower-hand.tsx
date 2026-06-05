import React from 'react';
import { MenuItem } from '@headlessui/react';
import {
  NatsMsgClientToServerEvents,
  NatsMsgClientToServerSchema,
} from '@workspace/protocol';
import { create } from '@bufbuild/protobuf';

import { useAppSelector } from '@/store';
import { participantsSelector } from '@/store/slices/participant-slice';
import { getNatsConn } from '@/helpers/nats';

interface ILowerHandMenuItemProps {
  userId: string;
}

const LowerHandMenuItem = ({ userId }: ILowerHandMenuItemProps) => {
  const raisedHand = useAppSelector(
    (state) =>
      participantsSelector.selectById(state, userId)?.metadata.raisedHand,
  );
  const conn = getNatsConn();

  const lowerHand = async () => {
    const data = create(NatsMsgClientToServerSchema, {
      event: NatsMsgClientToServerEvents.REQ_LOWER_OTHER_USER_HAND,
      msg: userId,
    });
    conn.sendMessageToSystemWorker(data);
  };

  return (
    raisedHand && (
      <div className="" role="none">
        <MenuItem>
          {() => (
            <button
              className="min-h-8 cursor-pointer py-0.5 w-full text-sm text-left leading-none font-medium text-foreground px-3 rounded-lg transition-all duration-300 hover:bg-muted"
              onClick={lowerHand}
            >
              Hạ tay
            </button>
          )}
        </MenuItem>
      </div>
    )
  );
};

export default LowerHandMenuItem;
