import React, { useMemo } from 'react';
import { MenuItem } from '@headlessui/react';
import { toast } from 'react-toastify';
import { DataMsgBodyType } from '@workspace/protocol';

import { store, useAppSelector } from '@/store';
import { participantsSelector } from '@/store/slices/participant-slice';
import { getNatsConn } from '@/helpers/nats';

interface IWebcamMenuItemProps {
  userId: string;
}
const WebcamMenuItem = ({ userId }: IWebcamMenuItemProps) => {
  const name = useAppSelector(
    (state) => participantsSelector.selectById(state, userId)?.name,
  );
  const videoTracks = useAppSelector(
    (state) => participantsSelector.selectById(state, userId)?.videoTracks,
  );

  const session = store.getState().session;
  const roomFeatures = session.currentRoom.metadata?.roomFeatures;
  const conn = getNatsConn();

  const { text, task, translatedTask } = useMemo(() => {
    if (!videoTracks) {
      return {
        text: 'Yêu cầu chia sẻ máy ảnh',
        task: 'share-webcam',
        translatedTask: 'chia sẻ máy ảnh',
      };
    } else {
      return {
        text: 'Yêu cầu tắt máy ảnh',
        task: 'stop-webcam',
        translatedTask: 'tắt máy ảnh',
      };
    }
  }, [videoTracks]);

  const handleWebcamAction = async () => {
    conn.sendDataMessage(
      DataMsgBodyType.INFO,
      `${session.currentUser?.name} đã yêu cầu bạn ${translatedTask}.`,
      userId,
    );

    toast(`Bạn đã yêu cầu ${name} ${translatedTask}.`, {
      toastId: 'asked-status',
      type: 'info',
    });
  };

  // Conditions to show this menu item
  const shouldShow =
    session.currentUser?.userId !== userId &&
    roomFeatures?.allowWebcams &&
    !roomFeatures.adminOnlyWebcams;

  if (!shouldShow) {
    return null;
  }

  return (
    <MenuItem>
      <button
        className="min-h-8 cursor-pointer py-0.5 w-full text-sm text-left leading-none font-medium text-foreground px-3 rounded-lg transition-all duration-300 hover:bg-muted"
        onClick={handleWebcamAction}
      >
        {text}
      </button>
    </MenuItem>
  );
};

export default WebcamMenuItem;
