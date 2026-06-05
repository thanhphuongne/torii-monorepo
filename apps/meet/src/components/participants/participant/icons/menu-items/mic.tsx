import React, { useMemo } from 'react';
import { MenuItem } from '@headlessui/react';
import { toast } from 'react-toastify';
import {
  CommonResponseSchema,
  DataMsgBodyType,
  MuteUnMuteTrackReqSchema,
} from '@workspace/protocol';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { store, useAppSelector } from '@/store';
import { participantsSelector } from '@/store/slices/participant-slice';
import sendAPIRequest from '@/helpers/api/api-client';
import { getNatsConn } from '@/helpers/nats';

interface IMicMenuItemProps {
  userId: string;
}
const MicMenuItem = ({ userId }: IMicMenuItemProps) => {
  const audioTracks = useAppSelector(
    (state) => participantsSelector.selectById(state, userId)?.audioTracks,
  );
  const isMuted = useAppSelector(
    (state) => participantsSelector.selectById(state, userId)?.isMuted,
  );
  const name = useAppSelector(
    (state) => participantsSelector.selectById(state, userId)?.name,
  );
  const session = store.getState().session;
  const conn = getNatsConn();

  const { text, task, translatedTask } = useMemo(() => {
    if (!audioTracks) {
      return {
        text: 'Yêu cầu chia sẻ micrô',
        task: 'share-microphone',
        translatedTask: 'chia sẻ micrô',
      };
    } else if (isMuted) {
      return {
        text: 'Yêu cầu bật micrô',
        task: 'unmute-mic',
        translatedTask: 'bật micrô',
      };
    }
    // if audioTracks > 0 and not muted
    return {
      text: 'Tắt micrô',
      task: 'mute',
      translatedTask: 'tắt micrô',
    };
  }, [audioTracks, isMuted]);

  const muteAudio = async () => {
    const session = store.getState().session;

    const body = create(MuteUnMuteTrackReqSchema, {
      sid: session.currentRoom.sid,
      roomId: session.currentRoom.roomId,
      userId: userId,
      muted: true,
    });
    const r = await sendAPIRequest(
      'muteUnmuteTrack',
      toBinary(MuteUnMuteTrackReqSchema, body),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = fromBinary(CommonResponseSchema, new Uint8Array(r));

    if (res.status) {
      toast(`Bạn đã tắt micrô của ${name}.`, {
        toastId: 'asked-status',
        type: 'info',
      });
    } else {
      toast(res.msg, {
        toastId: 'asked-status',
        type: 'error',
      });
    }
  };

  const handleMicAction = async () => {
    if (task === 'mute') {
      await muteAudio();
      return;
    }

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

  // This menu item is for controlling other users, not oneself.
  if (session.currentUser?.userId === userId) {
    return null;
  }

  return (
    <MenuItem>
      <button
        className="min-h-8 cursor-pointer py-0.5 w-full text-sm text-left leading-none font-medium text-foreground px-3 rounded-lg transition-all duration-300 hover:bg-muted"
        onClick={handleMicAction}
      >
        {text}
      </button>
    </MenuItem>
  );
};

export default MicMenuItem;
