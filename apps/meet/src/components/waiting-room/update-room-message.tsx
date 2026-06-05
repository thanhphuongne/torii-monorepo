import React, { useState } from 'react';
import {
  CommonResponseSchema,
  UpdateWaitingRoomMessageReqSchema,
} from '@workspace/protocol';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import { Button } from '@workspace/ui/components/button';
import { Textarea } from '@workspace/ui/components/textarea';

import { useAppDispatch, useAppSelector } from '@/store';
import sendAPIRequest from '@/helpers/api/api-client';
import { addUserNotification } from '@/store/slices/roomSettingsSlice';

const UpdateRoomMessage = () => {
  const dispatch = useAppDispatch();
  const waitingRoomMessage = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.waitingRoomFeatures
        ?.waitingRoomMsg,
  );
  const [message, setMessage] = useState<string>(waitingRoomMessage ?? '');

  const updateRoomMsg = async () => {
    if (message === '') {
      return;
    }
    const body = create(UpdateWaitingRoomMessageReqSchema, {
      msg: message,
    });

    const r = await sendAPIRequest(
      'waitingRoom/updateMsg',
      toBinary(UpdateWaitingRoomMessageReqSchema, body),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = fromBinary(CommonResponseSchema, new Uint8Array(r));

    if (res.status) {
      dispatch(
        addUserNotification({
          message: 'Đã cập nhật tin nhắn phòng chờ',
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
  };

  return (
    <div className="text-right">
      <p className="block text-sm font-medium text-foreground text-left mb-2">
        Cập nhật tin nhắn phòng chờ
      </p>
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.currentTarget.value)}
        className="h-20"
      />
      <Button
        onClick={updateRoomMsg}
        className="ml-auto mt-2"
      >
        Cập nhật
      </Button>
    </div>
  );
};

export default UpdateRoomMessage;
