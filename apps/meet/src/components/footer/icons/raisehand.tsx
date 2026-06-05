import React, { useCallback, useMemo } from 'react';
import {
  NatsMsgClientToServerEvents,
  NatsMsgClientToServerSchema,
} from '@workspace/protocol';
import { create } from '@bufbuild/protobuf';
import clsx from 'clsx';

import { store, useAppSelector } from '@/store';
import { getNatsConn } from '@/helpers/nats';
import { Hand } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';

const RaiseHandIcon = () => {
  const conn = getNatsConn();

  const { showTooltip, allowRaiseHand } = useMemo(() => {
    const session = store.getState().session;
    return {
      showTooltip: session.userDeviceType === 'desktop',
      allowRaiseHand:
        session.currentRoom.metadata?.roomFeatures?.allowRaiseHand !== false,
    };
  }, []);

  const isActiveRaisehand = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveRaisehand,
  );

  const toggleRaiseHand = useCallback(() => {
    const data = create(NatsMsgClientToServerSchema, {});

    if (!isActiveRaisehand) {
      data.event = NatsMsgClientToServerEvents.REQ_RAISE_HAND;
      data.msg = `${conn.userName} đã giơ tay`;
    } else {
      data.event = NatsMsgClientToServerEvents.REQ_LOWER_HAND;
    }

    conn.sendMessageToSystemWorker(data);
  }, [isActiveRaisehand, conn]);

  if (!allowRaiseHand) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={toggleRaiseHand}
      className={clsx(
        'raise-hand footer-icon relative h-10 w-10 rounded-full border-border bg-card shadow-sm hover:bg-muted md:h-11 md:w-11 3xl:h-[52px] 3xl:w-[52px]',
        {
          'has-tooltip': showTooltip,
          'bg-muted': isActiveRaisehand,
        },
      )}
    >
      <span className="tooltip">{isActiveRaisehand ? 'Hạ tay' : 'Giơ tay'}</span>
      <Hand className="h-4 w-4 md:h-5 md:w-5" />
    </Button>
  );
};

export default RaiseHandIcon;
