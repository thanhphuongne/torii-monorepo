import { useCallback, useMemo } from 'react';
import {
  CommonResponseSchema,
  MuteUnMuteTrackReqSchema,
} from '@workspace/protocol';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { store, useAppDispatch } from '@/store';
import sendAPIRequest from '@/helpers/api/api-client';
import { addUserNotification } from '@/store/slices/roomSettingsSlice';

const useMuteAll = () => {
  const dispatch = useAppDispatch();
  const { sid, roomId } = useMemo(() => {
    const session = store.getState().session;
    return {
      sid: session.currentRoom.sid,
      roomId: session.currentRoom.roomId,
    };
  }, []);

  const muteAllUsers = useCallback(async () => {
    const body = create(MuteUnMuteTrackReqSchema, {
      sid: sid,
      roomId: roomId,
      userId: 'all',
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
      dispatch(
        addUserNotification({
          message: 'Đã tắt micrô của tất cả người dùng.',
          typeOption: 'info',
        }),
      );
    } else {
      dispatch(
        addUserNotification({
          message: res.msg,
          typeOption: 'error',
        }),
      );
    }
  }, [sid, roomId, dispatch]);

  return { muteAllUsers };
};

export default useMuteAll;
